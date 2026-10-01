# sample-expo-kit-farming-idle

Farming Idle is a **sample**, not a template: a complete reference app to read, run, and copy the parts you need. Templates in this repository are starting points; this app shows what a finished feature set looks like on the [expo-kit-anchor](../expo-kit-anchor) stack — an idle clicker game on Solana where every harvest is a real transaction, rebuilt from the classic [FarmingIdleGame tutorial app](https://github.com/solana-mobile/tutorial-apps/tree/main/FarmingIdleGame).

The pattern worth copying is the **two-wallet split**: the connected wallet (the _owner_) holds the funds and approves the few transactions that matter, while a burner keypair generated on the device (the _player_) signs the high-frequency gameplay transactions with no approval prompts. That is what makes a tap-to-harvest game playable when every tap hits the chain.

## Features

- Tap to harvest: every harvest is an on-chain transaction signed silently by the player wallet
- Eight crop upgrades that keep farming per second between harvests, priced with compounding costs
- A global on-chain top-5 leaderboard; submitting a score resets the farm for the next run
- A wallet screen that moves gas money between the owner and player wallets and can rotate the burner keypair
- No backend: the farm, the leaderboard, and the math all live in the Anchor program

## Technologies

- [Anchor](https://www.anchor-lang.com/) (Solana program framework)
- [Expo](https://expo.dev)
- [Uniwind](https://uniwind.dev/) (Tailwind CSS for React Native)
- [@solana/kit](https://www.solanakit.com/)
- [@wallet-ui/react-native-kit](https://wallet-ui.dev/)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

This step builds the dependencies for the development client.

```bash
npm run android
```

The app connects to devnet by default, where the program is already deployed — you don't need the Rust toolchain to run it. Your wallet needs a small amount of devnet SOL for the farm account and the player wallet's gas deposit; get some at [faucet.solana.com](https://faucet.solana.com).

## The Anchor program

The `anchor` directory contains the `farming_idle` program, deployed on devnet at [`Hyfitmh1dAkw852R3DrXtWmLcmVoVkiR4H6D9DAMytH7`](https://explorer.solana.com/address/Hyfitmh1dAkw852R3DrXtWmLcmVoVkiR4H6D9DAMytH7?cluster=devnet). Five instructions cover the whole game:

| Instruction              | Behavior                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `initialize_farm`        | Creates the farm PDA and tops up the player wallet with 0.01 SOL of gas money; owner and player both sign      |
| `harvest`                | Banks 1 point plus everything the crops produced since the last harvest; player signs alone                    |
| `upgrade_farm`           | Spends banked points on crop plots, with each plot 15% more expensive than the last; player signs alone        |
| `initialize_leaderboard` | Creates the single global leaderboard account; anyone can pay for it once per cluster                          |
| `submit_farm`            | Puts the run's score on the leaderboard if it beats the lowest seat, then resets the farm; owner + player sign |

PDA seeds:

- Farm: `["farm", player, owner]`
- Leaderboard: `["leaderboard"]`

Rules enforced on-chain:

- Every farm instruction re-derives the PDA from the farm's own `player` and `owner` fields, so a farm from another pair can't be passed in
- Harvest yields derive from `Clock::get()`, never from a client-supplied duration
- Upgrade costs use integer math (15% compounding, floored per step) that the TypeScript client mirrors exactly — see `anchor/src/client/js/farming-idle.ts`
- `submit_farm` requires the owner's signature too: the leaderboard records the owner wallet, so the burner key alone can't speak in its name

Working on the program requires the [Rust](https://www.rust-lang.org/tools/install), [Solana](https://solana.com/docs/intro/installation), and [Anchor](https://www.anchor-lang.com/docs/installation) toolchains.

1. Generate a program keypair and sync the program ID

   This generates your own keypair, syncs it into `Anchor.toml` and `declare_id!`, rebuilds the program so the IDL carries the new address, and regenerates the TypeScript client from it:

   ```bash
   npm run anchor:setup
   ```

2. Build and test the program

   ```bash
   npm run anchor:test
   ```

   This builds the program, spins up a local validator, deploys, and runs the [Vitest](https://vitest.dev/) tests in `anchor/tests`, including the rejection paths: harvesting with the wrong player and buying upgrades the farm can't afford.

3. Deploy your own instance to devnet

   ```bash
   npm run anchor:deploy:devnet
   ```

### The generated TypeScript client

The app talks to the program through a fully typed client generated by [Codama](https://github.com/codama-idl/codama) from the program's IDL. It lives in `anchor/src/client/js/generated` and only depends on `@solana/kit`. Import it anywhere in the app via the `@project/anchor` alias:

```ts
import { fetchMaybeFarm, findFarmPda, getHarvestInstruction } from '@project/anchor'
```

After changing the program, rebuild the IDL and regenerate the client:

```bash
npm run anchor:build
npm run codama:js
```

Add hand-written wrappers around the generated code in `anchor/src/client/js/index.ts` — the `generated` directory is overwritten on every run. This sample keeps the shared game math there (`farming-idle.ts`), so the app and the tests compute the same costs and yields as the program.

## How the app is put together

- **Player wallet** (`src/features/player`) is the heart of the sample: a keypair created from 32 random bytes, kept in the device keystore with `expo-secure-store`, one per owner wallet, and turned into a `KeyPairSigner` with `createKeyPairSignerFromPrivateKeyBytes`. Resetting it deletes the stored key and generates a new one, which makes the existing farm and any SOL left in the player wallet unreachable — the app asks you to confirm, but withdraw first.
- **Transactions** (`src/features/transactions`) has the two signing paths side by side: `use-send-player-instructions.ts` signs with the local keypair and submits straight to the RPC (no prompts), while `use-send-owner-instructions.ts` goes through Mobile Wallet Adapter — with the player keypair co-signing as a partial signer when an instruction needs both, as `initialize_farm` and `submit_farm` do.
- **Farm** (`src/features/farm`) reads the farm account with the generated client (`use-farm-query.ts`), estimates the pending harvest client-side on a 250 ms ticker (`use-available-harvest.ts`), and wires all five instructions into mutations (`use-farm-program.ts`).
- **Leaderboard** (`src/features/leaderboard`) fetches the global account and offers to create it on clusters where it doesn't exist yet, such as your own localnet.
- **Wallet** (`src/features/wallet`) moves gas money: deposits go owner → player through the wallet app, withdrawals send the player's balance back without a prompt, since the player wallet signs for itself.

## Develop against localnet

For a faster loop you can run everything against a local validator, forwarded to your device over adb:

1. Start the localnet and keep it running: `npx solana-mobile localnet`
2. Deploy the program to it: `npm run anchor:deploy:localnet`
3. Switch the network to Localnet with the selector in the app
4. Connect your wallet and tap Request Airdrop to fund it

Two things to know: localnet needs a debug build — `npm run android` makes one, and Android debug builds allow the cleartext `http://localhost` endpoint while release builds only talk HTTPS. And the regular Seeker wallet only signs for public clusters, so signing on localnet requires a localnet-capable wallet such as [fakewallet](https://github.com/solana-mobile/mobile-wallet-adapter/tree/main/android/fakewallet).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Uniwind documentation](https://uniwind.dev/): Learn how to style your app with Tailwind CSS.
- [Anchor documentation](https://www.anchor-lang.com/docs): Learn how to build Solana programs with Anchor.
- [Solana documentation](https://solana.com/docs): Learn how to build on Solana.
