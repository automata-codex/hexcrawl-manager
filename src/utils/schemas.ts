export type FlattenedField = {
  key: string;
  type: string;
  required: boolean;
  description: string;
  depth: number;
};

type FlattenOptions = {
  definitions?: Record<string, JsonSchema>;
  filename?: string;
  rootSchema?: JsonSchema;
};

type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  additionalProperties?: JsonSchema | boolean;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $ref?: string;
  definitions?: Record<string, JsonSchema>;
};

export function flattenJsonSchema(
  schema: JsonSchema,
  options: FlattenOptions = {},
  prefix = '',
  depth = 0,
  parentRequired = true
): FlattenedField[] {
  const flat: FlattenedField[] = [];

  function resolveRef(ref: string, rootSchema: JsonSchema, fileName: string): JsonSchema | 'SELF' {
    if (ref === '#' || ref === '#/') {
      return 'SELF';
    }

    if (!ref.startsWith('#/')) {
      throw new Error(`Unsupported external $ref: ${ref} in file ${fileName}`);
    }

    const path = ref.slice(2).split('/'); // Remove "#/" and split
    let current: any = rootSchema;

    for (const segment of path) {
      if (!(segment in current)) {
        throw new Error(`Missing $ref target: ${ref} (segment ${segment}) in file ${fileName}`);
      }
      current = current[segment];
    }

    return current;
  }

  const currentType = schema.type || (schema.anyOf || schema.oneOf ? 'union' : 'unknown');

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, options.rootSchema ?? {}, options.filename ?? '[unknown file]');

    if (resolved === 'SELF') {
      flat.push({
        key: prefix || '[root]',
        type: '<self>',
        required: parentRequired,
        description: schema.description || '',
        depth,
      });
      return flat;
    }

    return flattenJsonSchema(resolved, options, prefix, depth, parentRequired);
  }

  if (currentType === 'object' && schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const isRequired = schema.required?.includes(key) ?? false;
      const propType = prop.type || (prop.anyOf || prop.oneOf ? 'union' : 'unknown');

      flat.push({
        key: fullKey,
        type: propType,
        required: parentRequired && isRequired,
        description: prop.description || '',
        depth,
      });

      flat.push(...flattenJsonSchema(prop, options, fullKey, depth + 1, parentRequired && isRequired));
    }
  }

  if (currentType === 'array' && schema.items && !Array.isArray(schema.items)) {
    const item = schema.items;
    const itemType = item.type || (item.anyOf || item.oneOf ? 'union' : 'unknown');

    flat.push({
      key: prefix ? `${prefix}.[item]` : '[item]',
      type: `array of ${itemType}`,
      required: parentRequired,
      description: item.description || '',
      depth: depth + 1,
    });

    flat.push(...flattenJsonSchema(item, options, prefix ? `${prefix}.[item]` : '[item]', depth + 2, parentRequired));
  }

  if (currentType === 'object' && schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    const additional = schema.additionalProperties;
    const additionalType = additional.type || (additional.anyOf || additional.oneOf ? 'union' : 'unknown');

    flat.push({
      key: prefix ? `${prefix}.[key]` : '[key]',
      type: `record of ${additionalType}`,
      required: parentRequired,
      description: additional.description || '',
      depth: depth + 1,
    });

    flat.push(...flattenJsonSchema(additional, options, prefix ? `${prefix}.[key]` : '[key]', depth + 2, parentRequired));
  }

  if (schema.anyOf || schema.oneOf) {
    const optionsList = schema.anyOf || schema.oneOf || [];
    flat.push({
      key: prefix,
      type: optionsList.map(opt => opt.type || 'unknown').join(' | '),
      required: parentRequired,
      description: schema.description || '',
      depth,
    });
  }

  return flat;
}
