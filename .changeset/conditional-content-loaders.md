---
"@achm/web": minor
---

Improve content collection loading for open-source users

- Add conditional loaders that return empty arrays for directories with only `.gitkeep` files
- Add `collectionHasContent()` helper to check if a directory has actual content
- Add `yamlFileHasContent()` helper to check if a YAML file has non-empty content
- Remove deprecated `getDirectoryYamlLoader` function
- Migrate all collections to use Astro's `glob` loader instead of custom loader
- Data files using array format must now be split into individual files (one per item)
- Remove empty `.gitkeep` directories from demo data to reduce noise for new users
