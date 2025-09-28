# Variable: RumorSchema

> `const` **RumorSchema**: `ZodObject`\<\{ `description`: `ZodString`; `id`: `ZodString`; `isAvailable`: `ZodOptional`\<`ZodBoolean`\>; `isKnown`: `ZodOptional`\<`ZodBoolean`\>; `notes`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `status`: `ZodEnum`\<\[`"true"`, `"false"`, `"misleading"`\]\>; `title`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `description`: `string`; `id`: `string`; `isAvailable?`: `boolean`; `isKnown?`: `boolean`; `notes?`: `string`[]; `status`: `"true"` \| `"false"` \| `"misleading"`; `title`: `string`; \}, \{ `description`: `string`; `id`: `string`; `isAvailable?`: `boolean`; `isKnown?`: `boolean`; `notes?`: `string`[]; `status`: `"true"` \| `"false"` \| `"misleading"`; `title`: `string`; \}\>

Defined in: [packages/schemas/src/schemas/rumor.ts:3](https://github.com/alexgs/skyreach/blob/404c4c007a794e5a320a26b0aac063d937e09ea9/packages/schemas/src/schemas/rumor.ts#L3)
