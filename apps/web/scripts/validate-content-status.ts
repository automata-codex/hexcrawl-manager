#!/usr/bin/env tsx
/**
 * Validate Content Status Cross-References
 *
 * Warns when an *active* parent references an *inactive* (or GM-only) child.
 * These mismatches are usually unintentional but legitimate cases exist
 * (e.g., a plotline that references shelved content as historical context),
 * so this script emits warnings only — it never fails the build.
 *
 * Checks (structured references only):
 *   - faction.activeAgents[].npcId → NPC must be active and player-visible
 *
 * TODO(content-status): the spec also mentions "GM-only NPC referenced by a
 * player-visible NPC's connection notes." NPCs have no structured
 * connection-notes field today, so this check would require parsing
 * markdown bodies for cross-references. Deferred.
 *
 * Usage:
 *   tsx scripts/validate-content-status.ts
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

interface NpcFrontmatter {
  id: string;
  displayName: string;
  visibility?: 'player' | 'gm';
  campaignStatus?: 'active' | 'inactive';
}

interface FactionFrontmatter {
  id: string;
  name: string;
  campaignStatus?: 'active' | 'inactive';
  activeAgents?: Array<{ name?: string; role?: string; npcId?: string }>;
}

function parseFrontmatter<T>(content: string): T | null {
  // Try MDX/MD-style fenced frontmatter first
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (match) {
    try {
      return yaml.parse(match[1]) as T;
    } catch {
      return null;
    }
  }
  // Otherwise treat the whole file as YAML (plain .yaml / .yml entries)
  try {
    return yaml.parse(content) as T;
  } catch {
    return null;
  }
}

function loadCollection<T>(
  dir: string,
  extensions: readonly string[],
): T[] {
  if (!existsSync(dir)) return [];
  const out: T[] = [];
  for (const file of readdirSync(dir)) {
    if (!extensions.some((ext) => file.endsWith(ext))) continue;
    const raw = readFileSync(join(dir, file), 'utf-8');
    const parsed = parseFrontmatter<T>(raw);
    if (parsed) out.push(parsed);
  }
  return out;
}

function isActive(item: { campaignStatus?: 'active' | 'inactive' }): boolean {
  return (item.campaignStatus ?? 'active') === 'active';
}

function isPlayerVisible(npc: { visibility?: 'player' | 'gm' }): boolean {
  return (npc.visibility ?? 'player') === 'player';
}

interface Warning {
  parent: string;
  reason: string;
}

function main(): void {
  console.log('Validating content-status cross-references...\n');

  const npcs = loadCollection<NpcFrontmatter>(
    resolveDataPath('npcs'),
    ['.yaml', '.yml', '.md', '.mdx'],
  );
  const factions = loadCollection<FactionFrontmatter>(
    resolveDataPath('factions'),
    ['.yaml', '.yml'],
  );

  const npcById = new Map(npcs.filter((n) => n.id).map((n) => [n.id, n]));

  const warnings: Warning[] = [];

  // Faction activeAgents → NPC checks
  for (const faction of factions) {
    if (!isActive(faction)) continue;
    for (const agent of faction.activeAgents ?? []) {
      if (!agent.npcId) continue;
      const npc = npcById.get(agent.npcId);
      if (!npc) {
        warnings.push({
          parent: `faction "${faction.name}" (${faction.id})`,
          reason: `activeAgents[].npcId="${agent.npcId}" — NPC not found`,
        });
        continue;
      }
      if (!isActive(npc)) {
        warnings.push({
          parent: `faction "${faction.name}" (${faction.id})`,
          reason: `activeAgents[].npcId="${agent.npcId}" → NPC "${npc.displayName}" is inactive`,
        });
      }
      if (!isPlayerVisible(npc)) {
        warnings.push({
          parent: `faction "${faction.name}" (${faction.id})`,
          reason: `activeAgents[].npcId="${agent.npcId}" → NPC "${npc.displayName}" is GM-only (visibility mismatch)`,
        });
      }
    }
  }

  if (warnings.length === 0) {
    console.log('All content-status cross-references are consistent.\n');
    process.exit(0);
  }

  for (const w of warnings) {
    console.warn(`  ⚠ ${w.parent}`);
    console.warn(`    ${w.reason}`);
    console.warn('');
  }
  console.warn(`${warnings.length} content-status warning(s). Build continues.\n`);
  process.exit(0);
}

main();
