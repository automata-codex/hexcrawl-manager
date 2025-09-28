# Function: loadConfig()

> **loadConfig**(): `null` \| \{ `repoRoot`: `string`; \}

Defined in: [packages/cli-kit/src/repo/load-config.ts:22](https://github.com/alexgs/skyreach/blob/develop/packages/cli-kit/src/repo/load-config.ts#L22)

Load and validate the skyreach.config.json file. Caches the result after the
first load.

## Returns

`null` \| \{ `repoRoot`: `string`; \}

The parsed config or null if not found/invalid.
