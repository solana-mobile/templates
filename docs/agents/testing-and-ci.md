# Testing And CI

Use the smallest validation that proves the change, then run broader checks when touching shared tooling or generated metadata.

## Local Commands

- `pnpm generate` updates generated template metadata.
- `pnpm lint` runs `solana-mobile templates check` and then Prettier. The check validates template metadata, duplicate names, `og-image.png`, and the `create-solana-dapp` init-script block, then compares `templates.json`, `TEMPLATES.md`, and `.github/workflows/templates.json` against what the renderer produces.
- `pnpm format` applies Prettier.

The check is read-only and reports every problem in one pass, so a failing run lists all of them rather than stopping at the first. Template problems are reported instead of artifact differences, not alongside them: fix the templates, then re-run to see whether artifacts also drifted.

## Template Checks

For a changed template, prefer validating from a fresh install path when practical. CI uses `solana-mobile create` (the Solana Mobile wrapper around `create-solana-dapp`) to instantiate templates, install dependencies, and run `npm run ci`.

Templates tested by CI need a `ci` script.

## CI Files

- `.github/workflows/validate-templates.yml` regenerates metadata and then runs `pnpm lint`. It regenerates first on purpose, so a PR does not fail merely because generated files are stale on the branch.
- `.github/workflows/test-templates.yml` runs template tests across package managers and template paths.
- `.github/actions/solana-mobile-create/action.yml` contains the shared template creation and install flow.
- `.github/actions/setup/action.yml` controls Node, package manager, Solana, Anchor, Rust, and other tool setup.

## Interpreting Failures

- Metadata failures usually mean `pnpm generate` was not run or a template `package.json` is missing fields. A `differs` message names the artifact that is stale; anything else names the template file to fix.
- Image failures usually mean `og-image.png` is missing, too large, or not `1200x630`.
- `npm run ci` failures usually mean a tested template is missing a `ci` script or its CI script no longer matches the template.
- Package manager failures can come from dependency engine constraints, lockfile differences, or template package scripts.
- Do not assume an unrelated CI failure is caused by the current PR without reproducing or isolating it.
