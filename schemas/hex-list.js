import { z } from 'zod';
import { HexSchema } from './hex.js';

export const HexListSchema = z.array(
  HexSchema
).describe('Data for hexes in a hex map.');
