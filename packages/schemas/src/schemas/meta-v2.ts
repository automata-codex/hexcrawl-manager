import { z } from 'zod';

const Backend = z.enum(['meta', 'ledger', 'external']);

const AppliedCollections = z.record(z.array(z.string())); // e.g. { sessions: [...], seasons: [...] }

const Fingerprints = z.record(z.string().regex(/^sha256:[0-9a-fA-F]+$/));

const Mirror = z
  .object({
    lastMirrorAt: z.string().datetime(),
    info: z.record(z.any()).optional(),
  })
  .partial()
  .refine((obj) => 'lastMirrorAt' in obj, {
    message: 'mirror.lastMirrorAt required if mirror present',
  });

const SubsystemState = z
  .object({
    backend: Backend,
    applied: AppliedCollections.optional(),
    checkpoints: z
      .record(z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    fingerprints: Fingerprints.optional(),
    mirror: Mirror.optional(),
  })
  .strict();

export const MetaSchemaV2 = z
  .object({
    version: z.literal(2),
    nextSessionSeq: z.number().int().positive(),
    state: z.record(SubsystemState),
  })
  .strict();

export type MetaDataV2 = z.infer<typeof MetaSchemaV2>;
