# Solana Templates

Official templates for the [Solana Mobile CLI](https://github.com/solana-mobile/solana-mobile-cli), built on
[create-solana-dapp](https://github.com/solana-foundation/create-solana-dapp).

Browse the public template gallery at https://solana.com/developers/templates.

## Usage

Create a new Solana Mobile project using the interactive CLI:

```sh
# bun
bun x solana-mobile@latest create

# npm
npx solana-mobile@latest create

# pnpm
pnpm dlx solana-mobile@latest create
```

Or specify a template directly:

```sh
npx solana-mobile@latest create -t expo-kit-uniwind
```

Run `npx solana-mobile@latest create --list-templates` to see every available template.

## Template Categories

- **Mobile** - Templates for Solana Mobile

See [TEMPLATES.md](TEMPLATES.md) for the complete list.

## Contributing

We welcome contributions! Found a bug or have an idea? [Open an issue](https://github.com/solana-mobile/templates/issues/new)
first. Pull requests need to reference an accepted issue; the templates are deliberately small and opinionated, so we
agree on a change before code is written. Trivial fixes such as typos and broken links are exempt.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Development

```sh
pnpm install
pnpm generate    # Generate templates.json and TEMPLATES.md
pnpm lint        # Check templates and formatting
pnpm format      # Format code
```

AI coding agents should start with [AGENTS.md](AGENTS.md), which links to the focused docs under `docs/agents/`.

## Contributors

<!-- automd:contributors github="solana-mobile/templates" license="Apache-2.0" -->

Published under the [APACHE-2.0](https://github.com/solana-mobile/templates/blob/main/LICENSE) license.
Made by [community](https://github.com/solana-mobile/templates/graphs/contributors) 💛
<br><br>
<a href="https://github.com/solana-mobile/templates/graphs/contributors">
<img src="https://contrib.rocks/image?repo=solana-mobile/templates" />
</a>

<!-- /automd -->
