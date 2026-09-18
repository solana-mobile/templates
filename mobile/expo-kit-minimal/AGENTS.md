# Agent Instructions

This file gives AI coding agents the minimum context needed to work safely in this app. It applies to the whole project.

## Start Here

- This app runs on **Android** through Mobile Wallet Adapter and on the **web** through wallet-standard browser wallets. Both platforms are wired through the wallet seam in `features/wallet/` — read it before touching anything wallet-shaped.
- `README.md` covers running, testing and resetting the project.
- Keep changes small and local.

## Common Commands

- `npm run android` builds and runs on a device or emulator; `npm run web` starts the dev server for the browser.
- `npm run web:build` exports the static web build to `dist/`.
- `npm run test` runs the Vitest suite; `npm run ci` runs every check in the definition of done below.

## Wallet Seam Invariants

These rules are what keep one codebase working on both platforms. Several of them fail at bundle or render time rather than at `tsc`, so do not learn them the hard way.

- **Wallet access goes through the seam.** Feature code calls `useWallet()` from `@/features/wallet/use-wallet` and takes its types from `@/features/wallet/wallet-types`. Never import `@wallet-ui/react-native-kit`, `@wallet-ui/react`, `@solana/react` or `@solana-mobile/*` outside `features/wallet/`. (`@wallet-ui/core` is the exception — cluster factories and types like `SolanaCluster` are platform-neutral and used by `constants/app-config.ts` and `features/network/`.)
- **Facade and variants share one extension.** `use-wallet` and `wallet-provider` each exist as a facade plus `.native` and `.web` variants: `use-wallet.ts` beside `use-wallet.{native,web}.ts`, `wallet-provider.tsx` beside `wallet-provider.{native,web}.tsx`. Metro never bundles a facade — but a `.ts` facade beside `.tsx` variants makes web resolve the facade, which re-exports the native variant and crashes at runtime. Rename or reshape one file, update all three together.
- **The picker is rendered in React Native.** The web wallet picker is `Modal`/`View`/`Text`/`Button` through react-native-web, never a library DOM widget, and it lives inside `features/wallet/` — not `components/`.
- **Polyfills are native-only.** `polyfill.native.js` installs `react-native-quick-crypto`; `polyfill.web.js` stays an empty module because browsers provide WebCrypto natively. Web-side code must not import the native polyfill's dependencies.
- **One wallet-standard registry per bundle.** In the web variant, discovery and context hooks (`WalletUi`, `useWalletUi`, `useConnect`, `createWalletUiConfig`) come from `@wallet-ui/react`, while account-bound hooks (`useSignMessage`, `useSignIn`, `useWalletAccountTransactionSendingSigner`) come from `@solana/react` — the app's own top-level copy, which resolves the same registry. Importing the account-bound hooks via `@wallet-ui/react` instead reaches its nested `@solana/react`, a second registry whose lookups miss every connected wallet. Nothing imports `@wallet-standard/*` directly.
- **No `window`/`document`/`localStorage` at import or render scope.** `expo export -p web` pre-renders every route in Node (`web.output: "static"`), so browser globals may only be touched inside effects and event handlers.
- **`reset-project` keeps `features/wallet/`.** The reset deletes `components/`, `utils/`, `test/`, `e2e/` and the demo features but keeps the seam, so nothing under `features/wallet/` may import from a deleted path — and the seam's own tests must stay self-contained, with no `@/test/` imports.

## Definition Of Done

A change is done when `npm run ci` is green: `tsc --noEmit`, `expo lint`, `prettier --check`, the Vitest suite, `expo prebuild -p android`, and `expo export -p web`. The `npm run e2e` script drives the app on an Android emulator against a real wallet and runs only on demand — it has no web analogue yet.
