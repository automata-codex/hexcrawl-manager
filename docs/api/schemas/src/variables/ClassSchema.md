# Variable: ClassSchema

> `const` **ClassSchema**: `ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `subclasses`: `ZodArray`\<`ZodObject`\<\{ `name`: `ZodString`; `page`: `ZodOptional`\<`ZodNumber`\>; `source`: `ZodEnum`\<\[`"phb"`, `"tcoe"`, `"toh"`, `"xgte"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `name`: `string`; `page?`: `number`; `source`: `"phb"` \| `"tcoe"` \| `"toh"` \| `"xgte"`; \}, \{ `name`: `string`; `page?`: `number`; `source`: `"phb"` \| `"tcoe"` \| `"toh"` \| `"xgte"`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `subclasses`: `object`[]; \}, \{ `id`: `string`; `name`: `string`; `subclasses`: `object`[]; \}\>

Defined in: [packages/schemas/src/schemas/class.ts:9](https://github.com/alexgs/skyreach/blob/develop/packages/schemas/src/schemas/class.ts#L9)
