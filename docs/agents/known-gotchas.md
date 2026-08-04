# Known Gotchas

## Generated Files

`templates.json`, `TEMPLATES.md`, and `.github/workflows/templates.json` are generated. If they change unexpectedly, run `pnpm generate` from a clean worktree and inspect the diff before keeping the changes.

## Template Group Scanning

The generator and the check scan direct children of each root `repokit.groups` path. A directory inside a scanned group without a valid `package.json` fails both. The generator no longer skips invalid templates with a warning — it refuses to write anything until every template is valid, so `pnpm generate` and `pnpm lint` fail on the same input.

## Open Graph Images

Every template needs `og-image.png` at `1200x630` and under the enforced size limit. Use `pnpm create-image` when a quick generated image is enough.

## Formatting

Root `pnpm lint` includes `prettier --check .`, so docs and template files can fail lint even if template metadata is valid.

Generated files and the root `pnpm-lock.yaml` are intentionally ignored by root Prettier rules. Mobile templates may intentionally ship lockfiles because Expo is dependency-sensitive; check existing patterns before adding or removing one.

## Template Tests

`test-templates.yml` filters out `community/` templates. For tested templates, the shared action always runs `npm run ci` after installation, so those templates need a working `ci` script.

## Package Manager Matrix

CI can expose issues that only appear with one package manager. Engine constraints in dependencies can break a package manager/Node combination even when local installs work.
