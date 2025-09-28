import { z } from 'zod';

import { PILLARS } from '@skyreach/core';

import type { ApReason as ZodApReason } from '../schemas/ap-ledger';

export type ApReason = z.infer<typeof ZodApReason>;

export type Pillar = typeof PILLARS[number];

export type Tier = 1 | 2 | 3 | 4;
