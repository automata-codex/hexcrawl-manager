import { z } from 'zod';

export const BuilderEnum = z.enum([
  'alseid',
  'bearfolk',
  'cultists',
  'dragons',
  'dwarves',
  'first-civilization',
  'goblins',
  'natural',
]);

export type Builder = z.infer<typeof BuilderEnum>;
