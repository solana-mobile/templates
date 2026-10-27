# Solana Mobile Templates

The Solana Mobile templates and how they reach the other repositories that publish them.

## Language

**Foundation repo**:
`solana-foundation/templates`, which publishes a copy of our templates under its `mobile/` directory.
_Avoid_: downstream, the other repo, upstream

**Mobile sync**:
A one-way mirror of the Source repo's `mobile/` into the Foundation repo's `mobile/`, delivered as a pull request.
_Avoid_: export, publish, sync back

**Source repo**:
`solana-mobile/templates`, the authoritative home of every Solana Mobile template.
_Avoid_: origin, our repo
