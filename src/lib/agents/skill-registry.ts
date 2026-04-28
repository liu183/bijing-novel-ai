// ============================================================================
// Skill Registry
// Novel Creation Agent Platform - Centralized Skill Lookup & Categorization
// ============================================================================

import type { AgentRole, SkillDefinition } from './agent-types';
import { AGENTS } from './agent-config';

/**
 * Internal flat index: skillId → SkillDefinition.
 * Built once on first access, then cached.
 */
let _skillIndex: Map<string, SkillDefinition> | null = null;

function ensureIndex(): Map<string, SkillDefinition> {
  if (_skillIndex) return _skillIndex;

  _skillIndex = new Map();
  for (const agent of AGENTS) {
    for (const skill of agent.skills) {
      _skillIndex.set(skill.id, skill);
    }
  }
  return _skillIndex;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a single skill by its unique ID.
 *
 * @param skillId - The skill identifier (e.g. `'generate_concepts'`)
 * @returns The skill definition, or `undefined` if not found
 */
export function getSkill(skillId: string): SkillDefinition | undefined {
  return ensureIndex().get(skillId);
}

/**
 * Return every skill registered across all agents (de-duplicated by ID).
 *
 * @returns Flat array of all skill definitions
 */
export function getAllSkills(): SkillDefinition[] {
  return Array.from(ensureIndex().values());
}

/**
 * Get all skills that belong to a specific agent.
 *
 * @param agentRole - The agent role identifier
 * @returns Array of skill definitions for the given agent (empty array if agent not found)
 */
export function getSkillsForAgent(agentRole: AgentRole): SkillDefinition[] {
  const agent = AGENTS.find((a) => a.id === agentRole);
  return agent ? [...agent.skills] : [];
}

/**
 * Get all skills grouped by their category.
 *
 * Categories are derived from the `category` field on each skill.
 * Skills are de-duplicated across agents (a skill can only appear in one
 * category).
 *
 * @returns Array of `{ category, skills }` groups, sorted alphabetically by category name
 */
export function getSkillCategories(): {
  category: string;
  skills: SkillDefinition[];
}[] {
  const map = new Map<string, SkillDefinition[]>();

  for (const agent of AGENTS) {
    for (const skill of agent.skills) {
      // De-duplicate: each skill ID should only appear once
      if (!map.has(skill.category)) {
        map.set(skill.category, []);
      }
      const list = map.get(skill.category)!;
      if (!list.some((s) => s.id === skill.id)) {
        list.push(skill);
      }
    }
  }

  // Sort categories alphabetically for consistent ordering
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([category, skills]) => ({ category, skills }));
}

/**
 * Get all skill categories that belong to a specific agent.
 *
 * @param agentRole - The agent role identifier
 * @returns Array of `{ category, skills }` groups for the agent
 */
export function getCategoriesForAgent(
  agentRole: AgentRole
): { category: string; skills: SkillDefinition[] }[] {
  const skills = getSkillsForAgent(agentRole);
  const map = new Map<string, SkillDefinition[]>();

  for (const skill of skills) {
    if (!map.has(skill.category)) {
      map.set(skill.category, []);
    }
    map.get(skill.category)!.push(skill);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([category, skills]) => ({ category, skills }));
}
