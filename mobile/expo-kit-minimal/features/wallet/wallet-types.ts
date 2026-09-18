import type { Address, Instruction, createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core'
import type { ReactNode } from 'react'

// Platform-neutral wallet contract. Feature code imports wallet types only from
// this module (via use-wallet / wallet-provider); the native implementation is
// backed by Mobile Wallet Adapter, the web implementation by wallet-standard
// browser wallets.

export interface WalletClient {
  rpc: ReturnType<typeof createSolanaRpc>
  rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>
}

/**
 * The identity this app presents to the wallet.
 *
 * Declared here rather than imported: `@wallet-ui/core` does not export it (it
 * is a Mobile Wallet Adapter concept the kit re-exports from
 * `@solana-mobile/mobile-wallet-adapter-protocol`), and declaring a
 * platform-neutral copy keeps the MWA-shaped type out of the web side. The
 * `.native` variant maps it onto the kit's `AppIdentity`, which is structurally
 * identical.
 *
 * The name is load-bearing: `scripts/reset-project.js` recovers the user's
 * identity by matching the literal text `static identity: AppIdentity = { … }`
 * in `constants/app-config.ts` and silently falls back to a default on a miss,
 * so renaming this type would quietly discard the user's config on every reset.
 */
export interface AppIdentity {
  icon?: string
  name?: string
  uri?: string
}

export interface WalletAccount {
  address: Address
  icon?: string
  label?: string
}

export interface WalletSignInInput {
  address?: string
  chainId?: string
  domain?: string
  nonce?: string
  statement?: string
  uri?: string
}

export interface WalletSignInOutput {
  account: WalletAccount
  signature: Uint8Array
  signedMessage: Uint8Array
}

export interface UseWalletReturn {
  account: WalletAccount | undefined
  chain: SolanaClusterId
  client: WalletClient
  identity: AppIdentity
  connect: () => Promise<WalletAccount>
  disconnect: () => Promise<void>
  sendTransactions: (instructions: Instruction[]) => Promise<string>
  signIn: (input: WalletSignInInput) => Promise<WalletSignInOutput>
  signMessages: <K extends Uint8Array | Uint8Array[]>(message: K) => Promise<K>
}

export interface WalletProviderProps {
  children: ReactNode
  cluster: SolanaCluster
  identity: AppIdentity
}
