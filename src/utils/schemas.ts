import {
  type ZodTypeAny,
  ZodObject,
  ZodArray,
  ZodEnum,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodOptional,
  ZodNullable,
  ZodEffects,
} from 'zod';

type FlattenedField = {
  key: string;
  type: string;
  required: boolean;
  description: string;
  depth: number;
};

export function flattenZodSchema(
  schema: ZodTypeAny,
  prefix = '',
  depth = 0,
  parentRequired = true
): FlattenedField[] {
  const flat: FlattenedField[] = [];

  // Handle preprocessed schemas like .optional(), .nullable(), or .default()
  const unwrapped = unwrapEffects(schema);

  if (unwrapped instanceof ZodObject) {
    const shape = unwrapped.shape as Record<string, ZodTypeAny>;
    for (const [key, value] of Object.entries(shape)) {
      const valueUnwrapped = unwrapEffects(value);

      const fullKey = prefix ? `${prefix}.${key}` : key;
      let type = getFieldType(valueUnwrapped);
      const isOptional = value instanceof ZodOptional || value instanceof ZodNullable;

      flat.push({
        key: fullKey,
        type,
        required: parentRequired && !isOptional,
        description: valueUnwrapped.description || '',
        depth,
      });

      // Recurse into nested objects
      if (valueUnwrapped instanceof ZodObject) {
        flat.push(...flattenZodSchema(valueUnwrapped, fullKey, depth + 1));
      }

      // Recurse into arrays of objects
      if (valueUnwrapped instanceof ZodArray) {
        const elementUnwrapped = unwrapEffects(valueUnwrapped.element);
        if (elementUnwrapped instanceof ZodObject) {
          flat.push(...flattenZodSchema(elementUnwrapped, fullKey, depth + 1));
        }
      }
    }
  }

  return flat;
}

// Helper to get field type as a string
function getFieldType(schema: ZodTypeAny): string {
  if (schema instanceof ZodString) return 'string';
  if (schema instanceof ZodNumber) return 'number';
  if (schema instanceof ZodBoolean) return 'boolean';
  if (schema instanceof ZodEnum) return `enum (${schema._def.values.join(' | ')})`;
  if (schema instanceof ZodArray) {
    const elementType = getFieldType(unwrapEffects(schema.element));
    return `array of ${elementType}`;
  }
  if (schema instanceof ZodObject) return 'object';
  return 'unknown';
}

// Helper to unwrap ZodEffects (from .optional(), .nullable(), .default(), etc.)
function unwrapEffects(schema: ZodTypeAny): ZodTypeAny {
  while (schema instanceof ZodOptional || schema instanceof ZodNullable || schema instanceof ZodEffects) {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      schema = schema._def.innerType;
    } else if (schema instanceof ZodEffects) {
      schema = schema._def.schema;
    }
  }
  return schema;
}
