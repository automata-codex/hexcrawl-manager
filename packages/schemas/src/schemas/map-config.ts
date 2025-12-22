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
// Use z.output to get the type after defaults are applied
export type GridConfig = z.output<typeof GridConfigSchema>;

/**
 * Icon definition - maps a key to an SVG file with default styling.
 */
export const IconDefinitionSchema = z.object({
  file: z.string().describe('SVG filename in map-assets/ or framework icons/'),
  size: z.number().positive().default(40).describe('Default width/height in pixels'),
});
export type IconDefinition = z.output<typeof IconDefinitionSchema>;

/**
 * Tag-to-icon mapping - renders an icon on all hexes with a given tag.
 */
export const TagIconSchema = z.object({
  tag: z.string().describe('Hex tag to match'),
  icon: z.string().describe('Icon key from the icons section'),
  size: z.number().positive().optional().describe('Override default icon size'),
  stroke: z.string().optional().describe('SVG stroke color'),
  strokeWidth: z.number().positive().optional().default(4),
  fill: z.string().optional().describe('SVG fill color'),
  layer: z.string().describe('Layer key for visibility toggle'),
});
export type TagIcon = z.output<typeof TagIconSchema>;

/**
 * Layer configuration for the layers panel.
 */
export const LayerConfigSchema = z.object({
  key: z.string().describe('Unique layer identifier'),
  label: z.string().describe('Human-readable label for UI'),
  defaultVisible: z.boolean().default(true),
  scopes: z.array(z.string()).optional().describe('Required scopes to see this layer'),
});
export type LayerConfig = z.output<typeof LayerConfigSchema>;

/**
 * Full map configuration from map.yaml.
 */
export const MapConfigSchema = z.object({
  grid: GridConfigSchema,
  outOfBounds: z.array(z.string()).default([]),
  icons: z
    .record(z.string(), IconDefinitionSchema)
    .default({})
    .describe('Icon definitions keyed by icon name'),
  tagIcons: z
    .array(TagIconSchema)
    .default([])
    .describe('Mappings from hex tags to icons'),
  layers: z
    .array(LayerConfigSchema)
    .default([])
    .describe('Layer visibility configuration'),
});
// Use z.output to get the type after defaults are applied
export type MapConfig = z.output<typeof MapConfigSchema>;
