// ============================================================================
// Agent System Type Definitions
// Novel Creation Agent Platform - Core Type System
// ============================================================================

/** All possible agent roles in the novel creation system */
export type AgentRole =
  | 'director'
  | 'ideator'
  | 'architect'
  | 'character_designer'
  | 'writer'
  | 'editor'
  | 'worldbuilder';

/** Complete agent definition with role, personality, skills, and system prompt */
export interface AgentDefinition {
  id: AgentRole;
  /** Agent display name (Chinese) */
  name: string;
  /** Agent display name (English) */
  nameEn: string;
  /** Agent role description (Chinese) */
  role: string;
  /** What this agent does */
  description: string;
  /** Emoji avatar for the agent */
  avatar: string;
  /** Theme color (Tailwind class) */
  color: string;
  /** Skills this agent can invoke */
  skills: SkillDefinition[];
  /** System prompt for LLM interactions */
  systemPrompt: string;
  /** Whether this agent can work autonomously without user input */
  canAutonomous: boolean;
}

/** Skill that an agent can invoke */
export interface SkillDefinition {
  /** Unique skill identifier */
  id: string;
  /** Skill display name (Chinese) */
  name: string;
  /** Description of what this skill does */
  description: string;
  /** Lucide icon name for UI rendering */
  icon: string;
  /** Category grouping for organization */
  category: string;
  /** Input parameters for this skill */
  parameters: SkillParameter[];
  /** Expected output format description */
  outputFormat: string;
}

/** Parameter definition for a skill */
export interface SkillParameter {
  /** Parameter key identifier */
  key: string;
  /** Display label (Chinese) */
  label: string;
  /** Input type */
  type: 'text' | 'textarea' | 'select' | 'number';
  /** Whether this parameter is required */
  required: boolean;
  /** Options for select type */
  options?: { label: string; value: string }[];
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Default value if not provided */
  defaultValue?: string;
}

/** Real-time activity event from an agent */
export interface AgentActivity {
  /** Unique activity identifier */
  id: string;
  /** Type of activity */
  type:
    | 'thinking'
    | 'skill_start'
    | 'skill_complete'
    | 'message'
    | 'error'
    | 'status_change';
  /** Which agent generated this activity */
  agentId: AgentRole;
  /** Display name of the agent */
  agentName: string;
  /** Associated novel identifier */
  novelId: string;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Activity payload */
  data: {
    /** Text content of the activity */
    content?: string;
    /** Name of the skill being used */
    skillName?: string;
    /** Description of the skill */
    skillDescription?: string;
    /** Agent status change */
    status?: 'idle' | 'working' | 'done';
    /** Additional metadata */
    metadata?: Record<string, unknown>;
  };
}

/** Rich-format chat message between user and agent */
export interface AgentMessage {
  /** Unique message identifier */
  id: string;
  /** Which agent sent or received this message */
  agentId: AgentRole;
  /** Display name of the agent */
  agentName: string;
  /** Whether this is from the user or the agent */
  role: 'user' | 'agent';
  /** Message content (may contain markdown) */
  content: string;
  /** Skills that were invoked to produce this message */
  skillsUsed?: {
    skillId: string;
    skillName: string;
    result: string;
  }[];
  /** Unix timestamp (ms) */
  timestamp: number;
}

/** A task assigned to an agent */
export interface AgentTask {
  /** Unique task identifier */
  id: string;
  /** Associated novel identifier */
  novelId: string;
  /** Which agent this task is assigned to */
  targetAgent: AgentRole;
  /** Optional skill to invoke */
  skillId?: string;
  /** Input parameters for the task */
  input: Record<string, unknown>;
  /** Current task status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Task result output */
  result?: string;
  /** Activity log for this task */
  activities: AgentActivity[];
  /** Unix timestamp when task was created */
  createdAt: number;
  /** Unix timestamp when task completed */
  completedAt?: number;
}

/** Agent session state */
export interface AgentSession {
  /** Unique session identifier */
  id: string;
  /** Associated novel identifier */
  novelId: string;
  /** Current active agent */
  currentAgent: AgentRole;
  /** Chat history */
  messages: AgentMessage[];
  /** Activity feed */
  activities: AgentActivity[];
  /** Current step in the 12-step framework */
  currentStep: number;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  updatedAt: number;
}
