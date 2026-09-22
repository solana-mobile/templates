import { createClient, extendClient } from '@solana/kit'
import {
  solanaDevnetRpc,
  solanaLocalRpc,
  solanaTestnetRpc,
} from '@solana/kit-plugin-rpc'
import { walletSigner } from '@solana/kit-plugin-wallet'
import { memoProgram } from '@solana-program/memo'

import type { Cluster } from './clusters'

/**
 * Builds the Kit client for one cluster.
 *
 * `walletSigner` comes first because it is what sets `client.payer`, and the RPC plugin needs a
 * payer before it can install transaction planning and sending on top of it. The chain is then
 * stamped onto the client with `extendClient`, so a consumer can read the active network back off
 * the client in lockstep with `rpc` — during a network switch the selected cluster changes one
 * render before the rebuilt client is published, and anything keyed on the network has to move with
 * the client rather than ahead of it.
 *
 * The RPC plugin is picked per network rather than parameterised, because each one installs the
 * capabilities that network actually has. Two details keep the branch types apart, and both look
 * redundant until they collapse: the switch is on the destructured `id` rather than `cluster.id`,
 * because `Cluster` is not a discriminated union and switching on the property narrows nothing; and
 * every branch writes its own `extendClient` call so it stamps that narrowed literal. Hoisting
 * either one leaves the branches differing only in capabilities TypeScript is happy to
 * subtype-reduce away.
 *
 * The switch is exhaustive over `ClusterId` and has no `default`, so naming a network there stops
 * this compiling until it is handled here too.
 */
export function createSolanaClient(cluster: Cluster) {
  const { id, rpcUrl } = cluster
  const base = createClient().use(walletSigner({ chain: id }))

  switch (id) {
    case 'solana:devnet':
      return base
        .use(solanaDevnetRpc({ rpcUrl }))
        .use((client) => extendClient(client, { chain: id }))
        .use(memoProgram())
    case 'solana:localnet':
      return base
        .use(solanaLocalRpc({ rpcUrl }))
        .use((client) => extendClient(client, { chain: id }))
        .use(memoProgram())
    case 'solana:testnet':
      return base
        .use(solanaTestnetRpc({ rpcUrl }))
        .use((client) => extendClient(client, { chain: id }))
        .use(memoProgram())
  }
}

/**
 * The concrete client type published to the tree. Pass it to `useClient<AppClient>()` at every read
 * site so the wallet namespace, `rpc`, `rpcSubscriptions`, `memo`, and `chain` are all typed.
 */
export type AppClient = ReturnType<typeof createSolanaClient>
