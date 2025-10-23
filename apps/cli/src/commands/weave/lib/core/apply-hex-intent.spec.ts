import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

import { applyHexIntentToDoc } from './apply-hex-intent';

function baseDoc(extra?: string) {
  return yaml.parse(
    `
id: q12
slug: q12
name: Whatever
landmark: "Old tower"
regionId: baruun-khil
terrain: hills
biome: prairie
elevation: 1200
${extra ?? ''}
`.trim(),
  );
}

describe('applyHexIntentToDoc', () => {
  it('sets isScouted and adds tag only once', () => {
    const doc = baseDoc();
    const res1 = applyHexIntentToDoc(doc, { scouted: true, landmarkKnown: true });
    expect(res1.changed).toBe(true);
    expect(res1.nextDoc.isScouted).toBe(true);
    expect(res1.nextDoc.tags).toContain('landmark-known');

    const res2 = applyHexIntentToDoc(res1.nextDoc, { scouted: true, landmarkKnown: true });
    expect(res2.changed).toBe(false);
    expect(res2.flips.scouted).toBeUndefined();
    expect(res2.flips.landmarkKnown).toBeUndefined();
  });

  it('sets isVisited only (independent of other flags)', () => {
    const doc = baseDoc();
    const res = applyHexIntentToDoc(doc, { visited: true });
    expect(res.changed).toBe(true);
    expect(res.nextDoc.isVisited).toBe(true);
    expect(res.nextDoc.isScouted).toBeUndefined();
    expect(res.nextDoc.isExplored).toBeUndefined();
    expect(res.flips.visited).toBe(true);
    expect(res.flips.scouted).toBeUndefined();
    expect(res.flips.explored).toBeUndefined();
  });

  it('sets isExplored only (independent of other flags)', () => {
    const doc = baseDoc();
    const res = applyHexIntentToDoc(doc, { explored: true });
    expect(res.changed).toBe(true);
    expect(res.nextDoc.isExplored).toBe(true);
    expect(res.nextDoc.isVisited).toBeUndefined(); // no back-fill
    expect(res.nextDoc.isScouted).toBeUndefined(); // no back-fill
  });

  it('can flip multiple fields in one call', () => {
    const doc = baseDoc();
    const res = applyHexIntentToDoc(doc, { scouted: true, visited: true, explored: true, landmarkKnown: true });
    expect(res.changed).toBe(true);
    expect(res.flips).toEqual({
      scouted: true,
      visited: true,
      explored: true,
      landmarkKnown: true,
    });
    expect(res.nextDoc.isScouted).toBe(true);
    expect(res.nextDoc.isVisited).toBe(true);
    expect(res.nextDoc.isExplored).toBe(true);
    expect(res.nextDoc.tags).toContain('landmark-known');
  });

  it('does nothing when flags already true (idempotent)', () => {
    const doc = baseDoc(`
isScouted: true
isVisited: true
isExplored: true
tags: ['landmark-known']
`);
    const res = applyHexIntentToDoc(doc, { scouted: true, visited: true, explored: true, landmarkKnown: true });
    expect(res.changed).toBe(false);
    expect(res.flips.scouted).toBeUndefined();
    expect(res.flips.visited).toBeUndefined();
    expect(res.flips.explored).toBeUndefined();
    expect(res.flips.landmarkKnown).toBeUndefined();
  });

  it('preserves existing tags and appends landmark-known at the end', () => {
    const doc = baseDoc(`
tags: ['haven', 'dungeon']
`);
    const res = applyHexIntentToDoc(doc, { landmarkKnown: true });
    expect(res.changed).toBe(true);
    expect(res.nextDoc.tags).toEqual(['haven', 'dungeon', 'landmark-known']);
  });

  it('does not duplicate landmark-known if already present', () => {
    const doc = baseDoc(`
tags: ['haven', 'landmark-known']
`);
    const res = applyHexIntentToDoc(doc, { landmarkKnown: true });
    expect(res.changed).toBe(false);
    expect(res.nextDoc.tags).toEqual(['haven', 'landmark-known']);
  });

  it('creates tags array when missing and landmarkKnown is true', () => {
    const doc = baseDoc();
    const res = applyHexIntentToDoc(doc, { landmarkKnown: true });
    expect(res.changed).toBe(true);
    expect(res.nextDoc.tags).toEqual(['landmark-known']);
  });

  it('ignores false/undefined flags (true-only semantics)', () => {
    const doc = baseDoc();
    // @ts-expect-error: test robustness if someone passes false at runtime
    const res = applyHexIntentToDoc(doc, { scouted: false, visited: undefined, explored: 0 as any });
    expect(res.changed).toBe(false);
    expect(res.flips).toEqual({});
    expect(res.nextDoc.isScouted).toBeUndefined();
    expect(res.nextDoc.isVisited).toBeUndefined();
    expect(res.nextDoc.isExplored).toBeUndefined();
  });

  it('does not mutate the original document object', () => {
    const doc = baseDoc();
    const snapshot = JSON.stringify(doc);
    const res = applyHexIntentToDoc(doc, { scouted: true });
    expect(JSON.stringify(doc)).toBe(snapshot); // original untouched
    expect(res.nextDoc).not.toBe(doc); // returned copy
    expect(res.nextDoc.isScouted).toBe(true);
  });
});
