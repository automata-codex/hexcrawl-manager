import { z } from 'zod';

export const ScopeSchema = z.enum([
  'public:view',
  'hidden:view',
  'gm:view',
]);

export const ScopeListSchema = z.array(ScopeSchema);
