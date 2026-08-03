# Example Expo app with @wallet-ui/react-native-kit

This is an example of how to use [`@wallet-ui/react-native-kit`](https://www.npmjs.com/package/@wallet-ui/react-native-kit) with Expo.

## Testing

Tests run on [Vitest](https://vitest.dev) with [React Native Testing Library](https://callstack.github.io/react-native-testing-library/). No emulator, device or wallet app is needed, so the whole suite runs in a couple of seconds and works in CI.

```bash
npm run test           # run once
npm run test:watch     # re-run on change
npm run test:coverage  # run once with a coverage report
```

`npm run ci` runs the suite alongside the type check, linter and formatter.

### Two layers of tests

The suite is deliberately split into two layers that both run on every commit. A third layer — driving a real wallet app on a real device — needs an emulator and is not part of this suite.

| Layer  | Scope                                         | Example                                                                             |
| ------ | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| **L1** | Pure functions, no React                      | [`ellipsify.test.ts`](utils/ellipsify.test.ts)                                      |
| **L2** | Components and hooks, wallet transport mocked | [`account-feature-index.test.tsx`](features/account/account-feature-index.test.tsx) |

**L1** tests import a function and assert on its output — the formatting helpers in [`utils/`](utils) are the whole of it, because that is the whole of this template's logic that does not need React.

Transaction building is deliberately _not_ tested at L1. Building the memo instruction is a single call into [`@solana-program/memo`](https://www.npmjs.com/package/@solana-program/memo); wrapping it in a function just to unit test it would only assert that a dependency and a template string work. What is worth pinning is that pressing the button hands the wallet the right instruction, and that is an L2 assertion. Extract a helper when a transaction grows logic of its own — branching, several instructions, computed amounts — and test it at L1 then.

**L2** tests render real components and press real buttons. The only thing replaced is the Mobile Wallet Adapter transport — `useMobileWallet()` is mocked so that no wallet app is launched and no RPC request leaves the process:

```tsx
vi.mock('@wallet-ui/react-native-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wallet-ui/react-native-kit')>()),
  useMobileWallet: () => wallet.current,
}))
```

Everything else — `View`, `Text`, `Button`, React Query, the network provider — is the real implementation. Shared helpers live in [`test/test-utils.tsx`](test/test-utils.tsx): `renderWithProviders` wraps a tree in a fresh React Query client, and `createMobileWalletMock` builds the stand-in wallet.

### Writing tests

A few conventions worth knowing before you add to the suite.

**`render` is async.** React Native Testing Library v14 returns a promise from `render`, `fireEvent` and `rerender`. Await them, and query through the awaited result rather than the `screen` global:

```tsx
const screen = await renderWithProviders(<AccountFeatureIndex />)
await fireEvent.press(screen.getByRole('button', { name: /sign transaction/i }))
```

The `screen` export is reassigned internally by `render`, which a static ESM import will not observe — so it stays stuck on the "render has not been called" stub. The awaited render result carries the same queries and always works.

**Match button labels case-insensitively.** Android's `Button` uppercases its title, so the rendered text is `SIGN TRANSACTION`. A `/sign transaction/i` regex keeps tests readable and platform-independent. Anchor it (`/^connect$/i`) when one label is a substring of another.

**Prefer roles over text.** `getByRole('button', { name: ... })` asserts the element is actually reachable by assistive technology, which `getByText` does not.

### How it works

[`vitest-native`](https://github.com/danfry1/vitest-native) makes React Native loadable under Vitest: it applies the Babel transform React Native's Flow-typed source needs and mocks the native module boundary. Configuration lives in [`vitest.config.mts`](vitest.config.mts).

Tests execute the real `react-native` package rather than a reimplementation, so the rendered tree contains genuine host components (`RCTView`, `RCTText`) with real accessibility props. The platform is pinned to `android`, matching Mobile Wallet Adapter, and presets supply native mocks for Reanimated, Gesture Handler, Safe Area Context and Async Storage.

The config file uses the `.mts` extension because this package is CommonJS; a plain `vitest.config.ts` would be loaded as CJS and fail.

> React Native Testing Library v14 requires Node 22.13 or newer.
