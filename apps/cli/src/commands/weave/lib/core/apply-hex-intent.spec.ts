import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

import { applyHexIntentToDoc } from './apply-hex-intent';

describe('applyHexIntentToDoc', () => {
  it('sets isScouted and adds tag only once', () => {
    const doc = yaml.parse(`
id: q12
slug: q12
name: Whatever
landmark: "Old tower"
regionId: baruun-khil
terrain: hills
biome: prairie
elevation: 1200
`);
    const res1 = applyHexIntentToDoc(doc, { scouted: true, landmarkKnown: true });
    expect(res1.changed).toBe(true);
    expect(res1.nextDoc.isScouted).toBe(true);
    expect(res1.nextDoc.tags).toContain('landmark-known');

    const res2 = applyHexIntentToDoc(res1.nextDoc, { scouted: true, landmarkKnown: true });
    expect(res2.changed).toBe(false);
  });
});
