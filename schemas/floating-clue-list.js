import { z } from 'zod';
import { FloatingClueSchema } from './floating-clue.js';

export const FloatingClueListSchema = z.array(FloatingClueSchema);
