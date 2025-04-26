import {
  ZodArray,
  ZodBoolean, ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  type ZodTypeAny,
  ZodUnion,
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
      const unwrappedForTraversal = unwrapEffects(value as ZodTypeAny);

      const description = (value as ZodTypeAny).description || unwrappedForTraversal.description || '';
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const isOptional = value instanceof ZodOptional || value instanceof ZodNullable;
      const type = getFieldType(value);
      flat.push({
        key: fullKey,
        type,
        required: parentRequired && !isOptional,
        description,
        depth,
      });

      // Recurse into nested objects
      if (unwrappedForTraversal instanceof ZodObject) {
        flat.push(...flattenZodSchema(unwrappedForTraversal, fullKey, depth + 1));
      }

      // Recurse into arrays of objects
      if (unwrappedForTraversal instanceof ZodArray) {
        const elementUnwrapped = unwrapEffects(unwrappedForTraversal.element);
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
  // Unwrap common wrappers first
  while (
    schema instanceof ZodOptional ||
    schema instanceof ZodNullable ||
    schema instanceof ZodDefault ||
    schema instanceof ZodEffects
    ) {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable || schema instanceof ZodDefault) {
      schema = schema._def.innerType;
    } else if (schema instanceof ZodEffects) {
      schema = schema._def.schema;
    }
  }

  if (schema instanceof ZodString) return 'string';
  if (schema instanceof ZodNumber) return 'number';
  if (schema instanceof ZodBoolean) return 'boolean';
  if (schema instanceof ZodEnum) return `enum (${schema._def.values.join(' | ')})`;
  if (schema instanceof ZodArray) {
    const elementType = getFieldType(schema._def.type);
    return `array of ${elementType}`;
  }
  if (schema instanceof ZodObject) return 'object';
  if (schema instanceof ZodUnion) {
    return schema._def.options.map((opt: ZodTypeAny) => getFieldType(opt)).join(' | ');
  }
  return 'unknown';
}

// Helper to unwrap ZodEffects (from .optional(), .nullable(), .default(), etc.)
function unwrapEffects(schema: ZodTypeAny): ZodTypeAny {
  while (
    schema instanceof ZodOptional ||
    schema instanceof ZodNullable ||
    schema instanceof ZodEffects
    ) {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      schema = schema._def.innerType;
    } else if (schema instanceof ZodEffects) {
      schema = schema._def.schema;
    }
  }

  // Special case: unwrap unions if one branch is an object
  if (schema instanceof ZodUnion) {
    const objectOption = schema._def.options.find((opt: ZodTypeAny) => {
      const unwrapped = unwrapEffects(opt);
      return unwrapped instanceof ZodObject || (unwrapped instanceof ZodArray && unwrapEffects(unwrapped.element) instanceof ZodObject);
    });

    if (objectOption) {
      return unwrapEffects(objectOption);
    } else {
      // Fallback: just return the first option if no object is found
      return unwrapEffects(schema._def.options[0]);
    }
  }

  return schema;
}
