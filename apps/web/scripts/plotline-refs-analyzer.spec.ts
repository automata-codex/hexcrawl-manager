import { describe, it, expect } from 'vitest';

import {
  analyzePlotlineRefs,
  extractCandidateLabel,
  formatReport,
  parseBodyMentions,
  type AnalysisInput,
  type CharacterEntity,
  type FactionEntity,
  type NpcEntity,
  type PlotlineFile,
} from './plotline-refs-analyzer.js';

const npc = (id: string, displayName: string, plotlines: string[] = []): NpcEntity => ({
  id,
  displayName,
  plotlines,
});
const faction = (id: string, name: string, plotlines: string[] = []): FactionEntity => ({
  id,
  name,
  plotlines,
});
const character = (id: string, displayName: string, plotlines: string[] = []): CharacterEntity => ({
  id,
  displayName,
  plotlines,
});

const baseInput = (plotlines: PlotlineFile[] = []): AnalysisInput => ({
  plotlines,
  npcs: [],
  factions: [],
  characters: [],
});

describe('extractCandidateLabel', () => {
  it('strips em-dash suffixes', () => {
    expect(extractCandidateLabel('Thistle Hollyhill — Thorn\'s younger brother')).toBe(
      'Thistle Hollyhill',
    );
  });
  it('strips bold wrappers', () => {
    expect(extractCandidateLabel('**Professor Caelindor Vorn** (deceased) — Elven scholar')).toBe(
      'Professor Caelindor Vorn',
    );
  });
  it('returns plain labels unchanged', () => {
    expect(extractCandidateLabel('House Nightfall')).toBe('House Nightfall');
  });
  it('handles " - " in addition to em-dash', () => {
    expect(extractCandidateLabel('Mara Tindle - apprentice clerk')).toBe('Mara Tindle');
  });
});

describe('parseBodyMentions — heading variants', () => {
  it('classifies "## NPCs" sections', () => {
    const body = `
## NPCs

- Thistle Hollyhill — Thorn's younger brother
- The Lone Survivor — One of Thistle's former crewmates
`;
    const out = parseBodyMentions(body);
    expect(out.npcNames).toEqual(['Thistle Hollyhill', 'The Lone Survivor']);
  });

  it('classifies "## Operatives at Fort Dagaric" as NPC section', () => {
    const body = `
## Operatives at Fort Dagaric

### Mara Tindle

Works for Earl Greythorn.

### Eira Frostmantle

On Duke Farnsworth's payroll.
`;
    const out = parseBodyMentions(body);
    expect(out.npcNames).toEqual(['Mara Tindle', 'Eira Frostmantle']);
  });

  it('does not treat detail bullets under an H3 as entity name candidates', () => {
    const body = `
## Operatives at Fort Dagaric

### Mara Tindle
- Works for Earl Greythorn
- Has access to the vault
- **Current status:** Has agreed to inform

### Eira Frostmantle
- On Duke Farnsworth's payroll
- Mission: Sabotage operations
`;
    const out = parseBodyMentions(body);
    expect(out.npcNames).toEqual(['Mara Tindle', 'Eira Frostmantle']);
  });

  it('classifies "## Agents" as NPC section', () => {
    const body = `
## Agents

- Some Agent — does things
`;
    expect(parseBodyMentions(body).npcNames).toEqual(['Some Agent']);
  });

  it('classifies "## Factions" sections and picks up both link text and plain text', () => {
    const body = `
## Factions

- [Blackthorn Syndicate](/gm-reference/factions)
- House Nightfall
`;
    const out = parseBodyMentions(body);
    expect(out.factionNames).toEqual(['Blackthorn Syndicate', 'House Nightfall']);
  });

  it('classifies "## Characters" sections and extracts ids from links', () => {
    const body = `
## Characters

- [Daemaris's backstory](/gm-reference/characters/daemaris)
`;
    const out = parseBodyMentions(body);
    expect(out.characterIds).toEqual(['daemaris']);
  });

  it('ignores non-matching H2 sections', () => {
    const body = `
## The Investigation

- This should not be parsed as an NPC

## NPCs

- Real NPC
`;
    const out = parseBodyMentions(body);
    expect(out.npcNames).toEqual(['Real NPC']);
  });

  it('ignores H3 outside any classified section', () => {
    const body = `
## Truth Layer

### Stray Name

This should not count.
`;
    const out = parseBodyMentions(body);
    expect(out.npcNames).toEqual([]);
  });
});

describe('analyzePlotlineRefs', () => {
  it('returns zero warnings when body and back-refs are in sync', () => {
    const plotline: PlotlineFile = {
      slug: 'daemaris',
      title: 'Daemaris',
      body: '## NPCs\n\n- Mara Tindle — clerk\n',
    };
    const input: AnalysisInput = {
      plotlines: [plotline],
      npcs: [npc('mara-tindle', 'Mara Tindle', ['daemaris'])],
      factions: [],
      characters: [],
    };
    expect(analyzePlotlineRefs(input)).toEqual([]);
  });

  it('flags a missing back-reference when an NPC appears in body but lacks the plotline slug', () => {
    const plotline: PlotlineFile = {
      slug: 'daemaris',
      title: 'Daemaris',
      body: '## NPCs\n\n- Mara Tindle — clerk\n',
    };
    const input: AnalysisInput = {
      plotlines: [plotline],
      npcs: [npc('mara-tindle', 'Mara Tindle', [])], // no plotlines listed
      factions: [],
      characters: [],
    };
    const warnings = analyzePlotlineRefs(input);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      kind: 'missing-back-ref',
      entityKind: 'npc',
      entityIdOrName: 'mara-tindle',
    });
  });

  it('flags a stale back-reference when entity lists this plotline but body omits them', () => {
    const plotline: PlotlineFile = {
      slug: 'daemaris',
      title: 'Daemaris',
      body: '## NPCs\n\n- Mara Tindle — clerk\n',
    };
    const input: AnalysisInput = {
      plotlines: [plotline],
      npcs: [
        npc('mara-tindle', 'Mara Tindle', ['daemaris']),
        npc('orlin-vex', 'Orlin Vex', ['daemaris']), // body doesn't mention them
      ],
      factions: [],
      characters: [],
    };
    const warnings = analyzePlotlineRefs(input);
    const stale = warnings.filter((w) => w.kind === 'stale-back-ref');
    expect(stale).toHaveLength(1);
    expect(stale[0]).toMatchObject({
      kind: 'stale-back-ref',
      entityKind: 'npc',
      entityIdOrName: 'orlin-vex',
    });
  });

  it('flags an unresolved body mention when a name does not match any entity', () => {
    const plotline: PlotlineFile = {
      slug: 'p',
      title: 'P',
      body: '## NPCs\n\n- Aetherion the Unbound — mystery\n',
    };
    const input = baseInput([plotline]);
    const warnings = analyzePlotlineRefs(input);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      kind: 'unresolved-body-mention',
      entityKind: 'npc',
      entityLabel: 'Aetherion the Unbound',
    });
  });

  it('handles "Operatives at X" variant in real-world shape', () => {
    const plotline: PlotlineFile = {
      slug: 'daemaris',
      title: 'Daemaris',
      body: `
## Operatives at Fort Dagaric

### Mara Tindle

Details about Mara.
`,
    };
    const input: AnalysisInput = {
      plotlines: [plotline],
      npcs: [npc('mara-tindle', 'Mara Tindle', ['daemaris'])],
      factions: [],
      characters: [],
    };
    expect(analyzePlotlineRefs(input)).toEqual([]);
  });

  it('does not double-flag entities resolved by both body name and direct id link', () => {
    const plotline: PlotlineFile = {
      slug: 'thorn',
      title: 'Thorn',
      body: `
## Factions

- [Frosthollow clan](/gm-reference/factions/frosthollow-clan)
`,
    };
    const input: AnalysisInput = {
      plotlines: [plotline],
      npcs: [],
      factions: [faction('frosthollow-clan', 'Frosthollow clan', ['thorn'])],
      characters: [],
    };
    expect(analyzePlotlineRefs(input)).toEqual([]);
  });

  it('checks all three entity kinds in one pass', () => {
    const plotline: PlotlineFile = {
      slug: 'p',
      title: 'P',
      body: `
## Characters

- [Daemaris's backstory](/gm-reference/characters/daemaris)

## Factions

- [Blackthorn Syndicate](/gm-reference/factions)

## NPCs

- Mara Tindle — clerk
`,
    };
    const input: AnalysisInput = {
      plotlines: [plotline],
      npcs: [npc('mara-tindle', 'Mara Tindle', ['p'])],
      factions: [faction('blackthorn-syndicate', 'Blackthorn Syndicate', ['p'])],
      characters: [character('daemaris', 'Daemaris', ['p'])],
    };
    expect(analyzePlotlineRefs(input)).toEqual([]);
  });
});

describe('formatReport', () => {
  it('returns the "in sync" message when there are no warnings', () => {
    expect(formatReport([])).toContain('in sync');
  });

  it('groups warnings by plotline and labels each kind', () => {
    const report = formatReport([
      {
        plotlineSlug: 'p',
        plotlineTitle: 'P',
        kind: 'missing-back-ref',
        entityKind: 'npc',
        entityIdOrName: 'mara-tindle',
        entityLabel: 'Mara Tindle',
      },
      {
        plotlineSlug: 'p',
        plotlineTitle: 'P',
        kind: 'stale-back-ref',
        entityKind: 'faction',
        entityIdOrName: 'blackthorn-syndicate',
        entityLabel: 'Blackthorn Syndicate',
      },
      {
        plotlineSlug: 'p',
        plotlineTitle: 'P',
        kind: 'unresolved-body-mention',
        entityKind: 'character',
        entityIdOrName: 'Aetherion the Unbound',
        entityLabel: 'Aetherion the Unbound',
      },
    ]);
    expect(report).toContain('Plotline: P (p)');
    expect(report).toContain('Missing back-references');
    expect(report).toContain('npc/mara-tindle');
    expect(report).toContain('Stale back-references');
    expect(report).toContain('faction/blackthorn-syndicate');
    expect(report).toContain('Unresolved body mentions');
    expect(report).toContain('Aetherion the Unbound');
  });
});
