import { z } from 'zod';

export const ScopeSchema = z.enum([
  'gm:view',
  'player:view',
  'public:view',
]);

export const ScopeListSchema = z.array(ScopeSchema);
