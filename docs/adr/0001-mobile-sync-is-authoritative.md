# The Mobile sync is authoritative and drops Foundation-only templates

The Source repo owns every Solana Mobile template, so the Mobile sync replaces the Foundation repo's `mobile/` wholesale instead of merging into it. A template name that exists only in the Foundation repo is removed, including names we have since renamed.

## Considered Options

- **Aliases for renamed templates**: preferred long-term, but they need changes to the `create-solana-dapp` CLI, which are slow to land. Revisit when that work is possible.
- **Allowlist of synced templates**: rejected, because two lists drift and "authoritative" stops meaning identical.

## Consequences

- `create-solana-dapp --template mobile/<old-name>` stops working once a sync that renames that template is merged.
