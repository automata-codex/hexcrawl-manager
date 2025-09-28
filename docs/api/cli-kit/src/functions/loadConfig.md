# Function: loadConfig()

> **loadConfig**(): `null` \| \{ `repoRoot`: `string`; \}

Defined in: [packages/cli-kit/src/repo/load-config.ts:22](https://github.com/alexgs/skyreach/blob/404c4c007a794e5a320a26b0aac063d937e09ea9/packages/cli-kit/src/repo/load-config.ts#L22)

Load and validate the skyreach.config.json file. Caches the result after the
first load.

## Returns

`null` \| \{ `repoRoot`: `string`; \}

The parsed config or null if not found/invalid.
