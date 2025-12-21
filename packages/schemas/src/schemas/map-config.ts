import { z } from 'zod';

/**
 * Supported coordinate notation styles for hex IDs.
 * - letter-number: e.g., "f12", "A3" (columns A-Z, max 26 columns)
 * - numeric: e.g., "0312", "0103" (4-digit padded, CCRR format)
 */
export const CoordinateNotationSchema = z.enum(['letter-number', 'numeric']);
export type CoordinateNotation = z.infer<typeof CoordinateNotationSchema>;

/**
 * Grid configuration for the hex map.
 */
export const GridConfigSchema = z.object({
  columns: z.number().int().positive().max(26),
  rows: z.number().int().positive(),
  notation: CoordinateNotationSchema.default('letter-number'),
});
export type GridConfig = z.infer<typeof GridConfigSchema>;

/**
 * Full map configuration from map.yaml.
 */
export const MapConfigSchema = z.object({
  grid: GridConfigSchema,
  outOfBounds: z.array(z.string()).default([]),
});
export type MapConfig = z.infer<typeof MapConfigSchema>;
