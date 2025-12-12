# Beyond the Skyreach Mountains

## 🛳️ Release Process

Skyreach uses a **“version-on-develop”** workflow with lightweight automation. A repo owner decides when to release; GitHub Actions handles tagging and consistency checks.

### Manual steps

1. **On `develop`**, prepare a release:

   ```bash
   git switch develop
   git co -b release-YYYY-MM-DD # create a release branch
   npm run release:version      # applies version bumps + changelogs
   git commit -am "Set new versions; update changelogs"
   git push
   ```

2. **Open a PR** from `release-YYYY-MM-DD` → `develop`.
   * The "Require changeset" action will fail, but you can still merge the PR.
   * **TODO** Add a check so the action doesn't run on `release-` branches.

3. **Open a PR** from `develop` → `main`.
   * The “Require Version Bump” action will fail the PR if you forgot to run `npm run release:version`.
   * Review and merge when you’re ready to ship.

### What happens automatically

* **On merge to `main`**

  * CI builds and tests the repo (no publish step—packages are local/private).
  * Any workspace (`apps/*` or `packages/*`) whose `package.json` changed gets a git tag: `<package-name>@<version>` (e.g. `@skyreach/core@2.9.0`)
  * Existing tags are never moved; tags are immutable version markers.

### Result

* `develop` and `main` stay in sync—no post-merge back-merge needed.
* Each release has clear, permanent tags for every workspace.
* Repo owner retains full manual control over when releases happen, while routine checks and tagging are automatic.

## Versioning data-only updates

When changes are made only to the `data/` directory (no code changes):

* Bump `@skyreach/web` version to mark the deployment
  * Use **minor** for new content/features (e.g., new articles, session reports)
  * Use **patch** for corrections or small updates
  * Include a clear changeset message indicating it's data-only:
    ```markdown
    ---
    '@skyreach/web': minor
    ---

    **Content Update:** Add new articles on hex exploration mechanics

    This release contains only content updates with no code changes.
    ```

**Rationale:** The web app is the public interface users interact with. From a user's perspective, new content changes the web app's behavior/content, making a version bump semantically correct. This also provides clear deployment tracking in the changelog.
