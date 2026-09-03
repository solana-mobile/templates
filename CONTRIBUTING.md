# Contributing to create-solana-dapp

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with GitHub

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We use [GitHub Flow](https://guides.github.com/introduction/flow/index.html), so all code changes happen through pull requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. Prefix your branch with your GitHub username (eg, `beeman/fix-anchor-issue` and not `fix/anchor-issue`)
3. If you've added code that should be tested, add tests.
4. If you've changed APIs, update the documentation.
5. Ensure the test suite passes.
6. Make sure your code lints.
7. Issue that pull request!

## Any contributions you make will be under the Apache 2.0 Software License

In short, when you submit code changes, your submissions are understood to be under the same
[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/) that covers the project.

## Report bugs using GitHub's [issues](https://github.com/solana-mobile/templates/issues)

We use GitHub issues to track public bugs. Report a bug by
[opening a new issue](https://github.com/solana-mobile/templates/issues/new); it's that easy!

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
