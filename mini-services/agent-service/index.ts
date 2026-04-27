import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server } from "socket.io";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentEventType =
  | "thinking"
  | "skill_start"
  | "skill_complete"
  | "message"
  | "error"
  | "status_change"
  | "activity_log";

interface AgentEventData {
  content?: string;
  skillName?: string;
  skillDescription?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface AgentEvent {
  type: AgentEventType;
  agentId: string;
  agentName: string;
  agentRole: string;
  novelId: string;
  timestamp: number;
  data: AgentEventData;
}

// ─── Valid event types & statuses ─────────────────────────────────────────────

const VALID_EVENT_TYPES: ReadonlySet<string> = new Set<AgentEventType>([
  "thinking",
  "skill_start",
  "skill_complete",
  "message",
  "error",
  "status_change",
  "activity_log",
]);

const VALID_STATUSES: ReadonlySet<string> = new Set([
  "idle",
  "working",
  "done",
]);

// ─── In-memory activity log buffer per novel ──────────────────────────────────
// Keeps the most recent events so late-joining clients can catch up.

const BUFFER_SIZE = 200;
const activityBuffers = new Map<
  string,
  { event: AgentEvent; id: string }[]
>();

function addToActivityBuffer(
  event: AgentEvent
): { event: AgentEvent; id: string } {
  const entry = { event, id: crypto.randomUUID() };
  const buf = activityBuffers.get(event.novelId);
  if (!buf) {
    activityBuffers.set(event.novelId, [entry]);
  } else {
    buf.push(entry);
    if (buf.length > BUFFER_SIZE) {
      buf.splice(0, buf.length - BUFFER_SIZE);
    }
  }
  return entry;
}

// ─── Connected agents tracking ────────────────────────────────────────────────

interface ConnectedAgent {
  socketId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  novelId: string;
}

const connectedAgents = new Map<string, ConnectedAgent>();

// ─── JSON response helper ─────────────────────────────────────────────────────

function writeJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

// ─── Event validation ─────────────────────────────────────────────────────────

function validateAgentEvent(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return "Payload must be a non-null object.";
  }

  const p = payload as Record<string, any>;

  if (!VALID_EVENT_TYPES.has(p.type)) {
    return `Invalid event type "${p.type}". Allowed: ${[...VALID_EVENT_TYPES].join(", ")}`;
  }

  const required: (keyof AgentEvent)[] = [
    "agentId",
    "agentName",
    "agentRole",
    "novelId",
    "timestamp",
  ];
  for (const key of required) {
    if (p[key] === undefined || p[key] === null) {
      return `Missing required field: "${key}".`;
    }
  }

  if (typeof p.timestamp !== "number" || p.timestamp <= 0) {
    return '"timestamp" must be a positive number.';
  }

  if (p.data === undefined || p.data === null) {
    return 'Missing required field: "data".';
  }

  // Extra validation per event type
  if (p.type === "status_change") {
    if (!VALID_STATUSES.has(p.data.status)) {
      return `Invalid status "${p.data.status}" for status_change event. Allowed: ${[...VALID_STATUSES].join(", ")}`;
    }
  }

  if (p.type === "skill_start" || p.type === "skill_complete") {
    if (!p.data.skillName || typeof p.data.skillName !== "string") {
      return `"${p.type}" event requires a non-empty "data.skillName" string.`;
    }
  }

  return null;
}

// ─── Create HTTP server (no callback — Socket.IO will be the primary handler) ─

const httpServer = createServer();

// ─── Socket.IO setup ──────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  // DO NOT change the path — Caddy routes on it
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Intercept engine.handleRequest to route REST endpoints away from Socket.IO ─
// Socket.IO with path="/" intercepts ALL requests. We wrap the engine's
// handleRequest so our REST endpoints are handled separately and never reach
// the Socket.IO transport layer.

const engine = (io as any).engine;
const originalHandleRequest = engine.handleRequest.bind(engine);
engine.handleRequest = function (req: IncomingMessage, res: ServerResponse) {
  // Skip REST endpoints — let our own request handler process them
  if (req.method === "POST" && req.url === "/emit") return;
  if (req.method === "GET" && req.url === "/health") return;
  return originalHandleRequest(req, res);
};

// ─── REST API: POST /emit ────────────────────────────────────────────────────
// Allows non-WS clients (e.g. other backend services) to push agent events.

httpServer.on("request", (req, res) => {
  // POST /emit — emit an agent event
  if (req.method === "POST" && req.url === "/emit") {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const payload: unknown = JSON.parse(body);
        const error = validateAgentEvent(payload);
        if (error) {
          writeJson(res, 400, { error });
          return;
        }

        const event = payload as AgentEvent;
        const entry = emitAgentEvent(event);

        writeJson(res, 200, {
          ok: true,
          eventId: entry.id,
          timestamp: event.timestamp,
        });
      } catch (err: any) {
        writeJson(res, 400, { error: `Invalid JSON body: ${err.message}` });
      }
    });
    req.on("error", () => {
      writeJson(res, 500, { error: "Failed to read request body." });
    });
    return;
  }

  // GET /health — service health check
  if (req.method === "GET" && req.url === "/health") {
    writeJson(res, 200, {
      status: "ok",
      service: "agent-service",
      uptime: process.uptime(),
      connectedAgents: connectedAgents.size,
      rooms: io.sockets.adapter.rooms.size,
    });
    return;
  }
});

// ─── Core emit logic ──────────────────────────────────────────────────────────

function emitAgentEvent(event: AgentEvent): { event: AgentEvent; id: string } {
  const entry = addToActivityBuffer(event);

  // Emit to the novel's room with the original event type as the Socket.IO event name
  const socketEventName = `agent:${event.type}` as const;
  io.to(event.novelId).emit(socketEventName, entry.event);

  // Also emit on a generic stream for activity-log consumers
  io.to(event.novelId).emit("agent:activity_log", entry.event);

  console.log(
    `[emit] room=${event.novelId} agent=${event.agentName}(${event.agentId}) type=${event.type}`
  );

  return entry;
}

// ─── Socket.IO connection handling ────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[connect] socket=${socket.id}`);

  // ── room:join — join a novel's activity room ──────────────────────────────
  socket.on(
    "room:join",
    (data: {
      novelId: string;
      agentId?: string;
      agentName?: string;
      agentRole?: string;
    }) => {
      const { novelId, agentId, agentName, agentRole } = data;

      if (!novelId || typeof novelId !== "string") {
        socket.emit("room:error", { message: "novelId is required." });
        return;
      }

      // Leave any previous room
      const prev = connectedAgents.get(socket.id);
      if (prev) {
        socket.leave(prev.novelId);
        socket.to(prev.novelId).emit("room:member_left", {
          socketId: socket.id,
          agentId: prev.agentId,
          agentName: prev.agentName,
        });
      }

      // Join the new room
      socket.join(novelId);

      // Track the agent
      if (agentId) {
        connectedAgents.set(socket.id, {
          socketId: socket.id,
          agentId,
          agentName: agentName || "Unknown",
          agentRole: agentRole || "agent",
          novelId,
        });
      }

      // Build member list for this room
      const members: ConnectedAgent[] = [];
      for (const [, agent] of connectedAgents) {
        if (agent.novelId === novelId) {
          members.push(agent);
        }
      }

      // Send recent activity log for late-joiners
      const recentActivity = activityBuffers.get(novelId) || [];

      socket.emit("room:joined", {
        novelId,
        members,
        recentActivity: recentActivity.map((e) => e.event),
      });

      // Notify the room about the new member
      socket.to(novelId).emit("room:member_joined", {
        socketId: socket.id,
        agentId: agentId || null,
        agentName: agentName || null,
        agentRole: agentRole || null,
      });

      console.log(
        `[room:join] socket=${socket.id} novelId=${novelId} agent=${agentName || "viewer"}`
      );
    }
  );

  // ── room:leave — leave the current novel room ─────────────────────────────
  socket.on("room:leave", (data: { novelId?: string }) => {
    const novelId = data?.novelId || connectedAgents.get(socket.id)?.novelId;
    if (novelId) {
      const agent = connectedAgents.get(socket.id);
      socket.leave(novelId);
      socket.to(novelId).emit("room:member_left", {
        socketId: socket.id,
        agentId: agent?.agentId || null,
        agentName: agent?.agentName || null,
      });
    }
    connectedAgents.delete(socket.id);
    console.log(`[room:leave] socket=${socket.id} novelId=${novelId}`);
  });

  // ── room:status — request current room state ──────────────────────────────
  socket.on("room:status", (data: { novelId: string }) => {
    const { novelId } = data;
    if (!novelId) return;

    const members: ConnectedAgent[] = [];
    for (const [, agent] of connectedAgents) {
      if (agent.novelId === novelId) {
        members.push(agent);
      }
    }
    const recentActivity = activityBuffers.get(novelId) || [];

    socket.emit("room:status_response", {
      novelId,
      members,
      recentActivityCount: recentActivity.length,
      recentActivity: recentActivity.slice(-20).map((e) => e.event),
    });
  });

  // ── Agent event forwarding (from WS clients) ──────────────────────────────
  // Clients can emit any of the agent:* events directly over the socket.
  for (const eventType of VALID_EVENT_TYPES) {
    const socketEventName = `agent:${eventType}`;
    socket.on(socketEventName, (payload: unknown) => {
      const error = validateAgentEvent(payload);
      if (error) {
        socket.emit("agent:error", {
          message: `Validation failed for ${socketEventName}: ${error}`,
          timestamp: Date.now(),
        });
        return;
      }
      emitAgentEvent(payload as AgentEvent);
    });
  }

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    const agent = connectedAgents.get(socket.id);
    if (agent) {
      socket.to(agent.novelId).emit("room:member_left", {
        socketId: socket.id,
        agentId: agent.agentId,
        agentName: agent.agentName,
      });
      connectedAgents.delete(socket.id);
    }
    console.log(`[disconnect] socket=${socket.id} reason=${reason}`);
  });

  socket.on("error", (err) => {
    console.error(`[socket-error] socket=${socket.id}`, err);
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = 3003;

httpServer.listen(PORT, () => {
  console.log(`🚀 Agent Service running on port ${PORT}`);
  console.log(`   WebSocket: io('/?XTransformPort=${PORT}')`);
  console.log(`   REST:       POST /emit?XTransformPort=${PORT}`);
  console.log(`   Health:     GET  /health?XTransformPort=${PORT}`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down...`);
  io.close();
  httpServer.close(() => {
    console.log("Agent Service shut down gracefully.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
