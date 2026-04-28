# Task 2 - Agent API Routes Backend

## Summary
Created 3 backend API routes for the novel creation agent system. All routes compile cleanly with zero lint errors.

## Files Created

### 1. `src/app/api/novels/[id]/agent/route.ts` — Main Agent Chat Endpoint
- **POST** handler: receives user message + optional `agentId`
- Defaults to Director agent when no specific agent is requested
- Builds rich system prompt: agent personality + novel context (steps, chapters) + available skills list
- Calls LLM via `z-ai-web-dev-sdk` with full chat history (last 10 messages)
- Detects skill usage pattern (`🔧 使用技能：[name]`) in LLM response
- Saves `ChatMessage` (role='agent') and multiple `AgentActivity` records
- Emits real-time events to WebSocket agent-service at port 3003 via HTTP POST
- Graceful error handling with error activity logging

### 2. `src/app/api/novels/[id]/agent/skill/route.ts` — Direct Skill Invocation
- **POST** handler: receives `agentId`, `skillId`, `inputs`
- Validates agent exists, skill exists, novel exists, and required parameters are present
- Builds specialized prompt combining: agent system prompt + novel context + skill definition + input parameters + output format
- Calls LLM and returns the skill result
- Creates full activity timeline: status_change → thinking → skill_start → skill_complete → status_change(done)
- Saves result as a `ChatMessage` with `skillUsed` field
- Emits all activities to WebSocket service

### 3. `src/app/api/novels/[id]/agent/activities/route.ts` — Activity History
- **GET** handler with query params: `limit` (default 50, max 200), `agentId` (filter), `type` (filter)
- Returns activities in reverse chronological order (newest first)
- Parses JSON metadata field for each activity
- Returns normalized timestamps (ISO string)

## Technical Details
- All prompts in Chinese as required
- WebSocket events via fire-and-forget `fetch` to `POST /api/emit?XTransformPort=3003`
- Novel context includes: title, genre, style, completed steps, recent chapters
- Error handling: never crashes, always returns structured JSON errors
- Database: uses Prisma ORM with SQLite via `@/lib/db`
