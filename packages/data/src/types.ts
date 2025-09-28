import { z } from 'zod';

import { ApReasonSchema } from '../../../schemas/ap-ledger';

export type ApReason = z.infer<typeof ApReasonSchema>;
