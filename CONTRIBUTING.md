# Contributing to Solana Templates

Thanks for your interest in improving the Solana Mobile templates! This document explains how we work so that your
contribution lands quickly.

## Issues first, then pull requests

**Open an issue before you open a pull request.**

The templates in this repository are deliberately small and opinionated. Every template is a starting point that
developers generate and then own, so anything we add to one becomes something every new project carries. When the issue
comes first we can agree on whether a change belongs in a template, and in which one, before anyone writes code. That
saves your time as well as ours.

The workflow is:

1. **Search existing issues.** Someone may already have reported it.
2. **File an issue** at https://github.com/solana-mobile/templates/issues/new. Describe the problem or the change you
   want to make and which template(s) it affects.
3. **Wait for a maintainer to accept it.** If you'd like to work on it, say so in a comment.
4. **Open a pull request** that references the issue with a closing keyword such as `Fixes #123`.

Pull requests that don't reference an accepted issue may be closed without review. We'd rather point you to the right
place than let your work sit unreviewed, so we'll always leave a comment explaining why.

### Exceptions

You don't need an issue for trivial changes: typos, broken links, comment-only fixes, or small documentation
corrections. Write "trivial" in the linked-issue field of the PR template.

### What belongs here

This repository is for the templates themselves. The issue tracker is **not** the right place for:

- **Bugs in Mobile Wallet Adapter or other SDKs.** Report those in the SDK's own repository, for example
  [mobile-wallet-adapter](https://github.com/solana-mobile/mobile-wallet-adapter/issues).
- **Usage and how-to questions.** Ask on [Solana Stack Exchange](https://solana.stackexchange.com/questions/ask) with the
  `solana-mobile` tag, or join the [Solana Mobile Discord](https://discord.gg/solanamobile).
- **Features that only some projects need.** Templates stay minimal on purpose. If a feature is useful but not for
  everyone, it probably belongs in a sample or in documentation rather than in a template.

## Pull request guidelines

- **Keep it scoped.** One issue per pull request. Refactors, formatting changes, and unrelated fixes go in their own
  PRs.
- **Respect the template's scope.** A `minimal` template stays minimal. Adding platforms, providers, or abstractions to
  a template needs to be agreed in the issue first.
- **Describe how to verify it.** The PR template asks which template(s) you generated and what you checked. This is what
  lets a maintainer confirm the change without re-deriving your setup.
- **Regenerate metadata.** Run `pnpm generate` and commit the result whenever you change a template. CI fails the PR
  when the committed metadata is out of date.
- **Prefix your branch with your GitHub username**, for example `beeman/fix-anchor-issue` and not `fix/anchor-issue`.
- **Expect review turnaround to vary.** This is a small team. Linking an accepted issue is the best way to get to the
  front of the queue.

## Any contributions you make will be under the Apache 2.0 Software License

In short, when you submit code changes, your submissions are understood to be under the same
[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/) that covers the project.

## Report bugs using GitHub's [issues](https://github.com/solana-mobile/templates/issues)

We use GitHub issues to track public bugs. Report a bug by
[opening a new issue](https://github.com/solana-mobile/templates/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

People _love_ thorough bug reports.

## Use a Consistent Coding Style

- Code is formatted using the prettier configuration in the project root.
- Run `pnpm format` to make sure your code is formatted correctly.

## Development Workflow

In this section, you'll find the basic commands you need to run for building, testing, and maintaining the quality of the codebase.

### Setting Up the Project

To get started with development:

```shell
pnpm install
```

### Available Commands

To see all available commands, run:

```shell
pnpm run
```

**Core Development Commands:**

- `pnpm clean` - Clean generated files and artifacts
- `pnpm format` - Format code using prettier
- `pnpm generate` - Regenerate the template metadata artifacts
- `pnpm lint` - Check template metadata, generated artifacts, and formatting
- `pnpm update-deps` - Update all dependencies to latest versions

### Generated Files

`templates.json`, `TEMPLATES.md`, `README.md`, and `.github/workflows/templates.json` are
generated from the templates and their `package.json` files. They are committed to the
repository, so regenerate and commit them whenever you change a template:

```shell
pnpm generate
```

CI regenerates them too and fails the pull request when the result differs from what you
committed, with a diff of what is missing.

### Agent Skills

The [Expo agent skills](https://github.com/expo/skills) are vendored into the repository so every contributor gets the same guidance regardless of which agent they use. The files live in `.agents/skills`, the location read by Codex, Cursor, Gemini CLI, Cline and others; `.claude/skills` symlinks to them for Claude Code. `skills-lock.json` pins each skill by content hash.

Refresh them to the latest upstream versions with:

```shell
pnpm dlx skills@latest update -p -y
```

Add a skill from the same repository with `pnpm dlx skills@latest add expo/skills --skill <name> -y`. Both commands update `skills-lock.json`; commit the result along with the changed skill files.

### Code Quality

Ensure your code meets project standards:

```shell
pnpm format    # Format code
pnpm generate  # Refresh generated artifacts
pnpm lint      # Check for issues
```

### Committing Your Changes

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit:

- `fix`: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in semantic versioning).
- `feat`: a commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in semantic
  versioning).
- `BREAKING CHANGE`: a commit that has the text BREAKING CHANGE: at the beginning of its optional body or footer section
  introduces a breaking API change (correlating with MAJOR in semantic versioning). A BREAKING CHANGE can be part of
  commits of any type.
- Others: commit types other than fix: and feat: are allowed, for example @commitlint/config-conventional (based on the
  Angular convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others.

## License

By contributing, you agree that your contributions will be licensed under its Apache License 2.0.

## References

This document was adapted from the open-source contribution guidelines for
[Facebook's Draft](https://github.com/facebook/draft-js/blob/master/CONTRIBUTING.md)
