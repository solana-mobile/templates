# sample-kit-anchor-counter

A working demonstration of a Solana mobile app talking to an on-chain [Anchor](https://www.anchor-lang.com/) program — read it, run it, and copy the parts you need. Unlike the `expo-kit-*` templates, which are starting points you build on, this sample is a reference: the interesting content is the wiring between the program, the generated client, and the app.

The app reads and increments a global counter that lives in a program on devnet, so it works out of the box — no deployment required.

## Technologies

- [Anchor](https://www.anchor-lang.com/) (on-chain program in `anchor/`)
- [Codama](https://github.com/codama-idl/codama) (generates the TypeScript client from the Anchor IDL)
- [Expo](https://expo.dev)
- [Mobile Wallet Adapter](https://docs.solanamobile.com/getting-started/overview) via [@wallet-ui/react-native-kit](https://github.com/wallet-ui/wallet-ui)
- [@solana/kit](https://github.com/anza-xyz/kit)
- [Uniwind](https://uniwind.dev/) (Tailwind CSS for React Native)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Build and run the Android app

   ```bash
   npm run android
   ```

3. Connect an MWA-compatible wallet set to **devnet** and tap **+1**. The wallet signs an `increment` instruction, and the on-chain count updates once the transaction confirms.

## How it works

The flow from program to pixels:

1. **The program** lives in [anchor/programs/counter/src/lib.rs](anchor/programs/counter/src/lib.rs). It stores a single `Counter` account at a program-derived address (seed `"counter"`) with two instructions: `initialize` (create the account) and `increment` (add 1–100 to the count).
2. **The IDL** in [anchor/idl/counter.json](anchor/idl/counter.json) describes that program. It is committed so the client can be regenerated without a Rust toolchain.
3. **The generated client** in [src/features/counter/generated](src/features/counter/generated) is rendered from the IDL by [Codama](https://github.com/codama-idl/codama) — account codecs, instruction builders, PDA helpers, and typed errors, all on top of `@solana/kit`. It is committed so you can read it like any other source file. Regenerate it after changing the IDL:

   ```bash
   npm run codegen
   ```

4. **The data-access layer** in [src/features/counter/data-access](src/features/counter/data-access) wraps the generated client in React Query hooks: fetch the counter account, send an `increment`, and (for fresh deployments) `initialize`. Transactions are signed by the user's wallet through Mobile Wallet Adapter — see [sign-and-send-instructions.ts](src/features/counter/data-access/sign-and-send-instructions.ts).
5. **The UI** in [counter-feature.tsx](src/features/counter/counter-feature.tsx) renders the count and the buttons.

## One program, many chains

A deployed program has a different lifecycle than your app: the same code can live at different addresses on devnet, localnet, and mainnet. The sample keeps that decision in one place:

- [counter-program-address.ts](src/features/counter/data-access/counter-program-address.ts) maps cluster IDs to deployed program addresses and fails loudly for clusters that have no deployment.
- [cluster-provider.tsx](src/features/cluster/data-access/cluster-provider.tsx) holds the active cluster behind the in-app network switcher. Switching clusters re-resolves the program address, PDA derivation, RPC connection, and query caching in one move.

Every generated instruction builder and PDA helper accepts a `programAddress` override, so nothing in the app hardcodes the devnet address outside the map.

One honest limitation: with Mobile Wallet Adapter the **wallet** signs and submits the transaction for the chain its session was authorized on. Consumer wallets generally don't support localnet sessions — the Seeker's built-in wallet, for example, rejects them with a network mismatch. Reading the counter works on any cluster without a wallet; incrementing on localnet requires a wallet that supports localnet, such as Solana Mobile's [fakewallet](https://github.com/solana-mobile/mobile-wallet-adapter/tree/main/android/fakewallet) development wallet.

## Run on localnet

Start a local validator with port forwarding to your connected device or emulator:

```bash
bunx solana-mobile localnet start --detach
```

Then clone the devnet program (and counter account) onto it, passing your wallet address to receive localnet SOL for fees:

```bash
npm run localnet:sync -- <wallet-address>
```

Finally, flip the in-app network switcher to **Localnet**. Reading the counter works with any (or no) wallet; to _increment_ on localnet you need a wallet that supports localnet sessions — see the note at the end of "One program, many chains".

Two things worth knowing about the clone approach:

- The program binary enforces its declared program ID (Anchor error 4100: `DeclaredProgramIdMismatch`), so it must live at the same address on every cluster. The sync script uses surfpool's `surfnet_setAccount` cheatcode to place it there — a regular `solana program deploy` cannot choose an existing address. If you run `solana-test-validator` yourself instead, `--clone-upgradeable-program <address> --url devnet` achieves the same.
- If you deploy your own program (next section), its fresh program ID makes this constraint disappear — just point the `solana:localnet` entry of the address map at your deployment.

## Deploy your own program

The pre-deployed devnet program means you never have to touch Rust to use this sample. When you want to own the deployment:

1. Install the [Anchor toolchain](https://www.anchor-lang.com/docs/installation).
2. Generate a new program keypair and build:

   ```bash
   cd anchor && anchor keys sync && anchor build
   ```

3. Deploy to your target cluster (this example uses devnet):

   ```bash
   anchor deploy --provider.cluster devnet
   ```

4. Update the address for that cluster in [counter-program-address.ts](src/features/counter/data-access/counter-program-address.ts), then run `npm run codegen` if you changed the program's interface.
5. In the app, tap **Initialize Counter** to create the counter account on the new deployment.

The Rust sources are not part of the JavaScript build or CI — the app only needs the IDL and the generated client.

## Learn more

- [Anchor documentation](https://www.anchor-lang.com/docs): Learn how to write Solana programs.
- [Codama documentation](https://github.com/codama-idl/codama): Learn how clients are generated from IDLs.
- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Solana Mobile documentation](https://docs.solanamobile.com/): Learn how to build for Solana Mobile.
- [Uniwind documentation](https://uniwind.dev/): Learn how to style your app with Tailwind CSS.
