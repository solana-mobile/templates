<!--
  Every pull request references an issue. The templates are deliberately small and
  opinionated, so the change is agreed in the issue before any code is written.
  A PR without a linked issue gets the `needs-issue` label until one is added.
-->

## Linked issue

<!-- Required. Use a closing keyword so GitHub links them, e.g. "Fixes #123". -->

Fixes #<issue-number>

## Summary

<!-- What does this PR change, and why? Keep it to a few sentences; the detail belongs in the issue. -->

## How was this tested?

<!-- Which template(s) did you generate and run, and what did you check? -->

## Checklist

- [ ] The change is scoped to what the issue describes; unrelated changes are in separate PRs
- [ ] `pnpm generate` was run and the regenerated metadata is committed
- [ ] `pnpm lint` passes
