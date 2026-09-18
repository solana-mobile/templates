import { createWalletUiConfig, useConnect, useWalletUi, WalletUi } from '@wallet-ui/react'
import { useSignIn, useSignMessage, useWalletAccountTransactionSendingSigner } from '@solana/react'
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Instruction,
} from '@solana/kit'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Modal, StyleSheet, Text, View } from 'react-native'
import { createClient } from './create-client'
import type {
  AppIdentity,
  UseWalletReturn,
  WalletAccount,
  WalletProviderProps,
  WalletSignInInput,
  WalletSignInOutput,
} from './wallet-types'

// The web implementation of the seam: the same contract the native side fills
// with Mobile Wallet Adapter, backed here by wallet-standard browser wallets.
// Three layers, because account-bound hooks (`useSignMessage`, `useSignIn`,
// the signer) cannot be called conditionally:
//
// 1. WebWalletBridge — owns connect() (opens the picker, resolves on
//    selection), disconnect, the RPC client, and the disconnected context.
// 2. ConnectedBridge — mounted only once an account exists; calls the
//    account-bound hooks unconditionally and publishes the full context.
// 3. WalletPickerRow — one per discovered wallet; `useConnect(wallet)` per row
//    is the rules-of-hooks-safe way to drive a dynamic wallet list.
//
// The picker is rendered with React Native components (Modal/View/Text/Button
// through react-native-web), never a library DOM widget, and lives here under
// features/wallet/ — `reset-project` deletes `components/` and `utils/`
// wholesale, so UI placed there would dangle out of a seam the reset keeps.
//
// Import surface — deliberately two packages, both resolving to ONE
// wallet-standard registry:
// - `@wallet-ui/react` provides WalletUi/useWalletUi/useConnect (discovery,
//   selection, persistence) — whose handles live in the top-level
//   `@wallet-standard/ui-registry` via `@wallet-standard/react`.
// - `@solana/react` provides the account-bound hooks — the app's own top-level
//   copy (the same one the native kit uses), which resolves the SAME registry.
//   Importing these hooks via `@wallet-ui/react` instead would pull its nested
//   `@solana/react` 6.x — a second `ui-registry` instance whose lookups miss
//   every handle `useWalletUi` produces (and whose `UiWallet*` types brand-
//   mismatch the handles' own types). One registry is the invariant; both
//   imports serving it is how it survives package-manager dedup.
// The handle types are derived from `useWalletUi`'s return rather than named
// so they can never drift from the handles the provider actually vends.
//
// This file must stay static-render-safe: `expo export -p web` pre-renders
// every route in Node (`app.json` keeps `web.output: "static"`), so no
// `window`/`document`/`localStorage` access at import or render scope —
// discovery and storage live inside WalletUi's own hooks, and everything else
// is behind effects and event handlers.

type UiWalletAccount = NonNullable<ReturnType<typeof useWalletUi>['account']>
type UiWallet = ReturnType<typeof useWalletUi>['wallets'][number]

const WebWalletContext = createContext<UseWalletReturn | null>(null)

export function useWebWallet(): UseWalletReturn {
  const value = useContext(WebWalletContext)
  if (!value) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return value
}

export function WalletProvider({ children, cluster, identity }: WalletProviderProps) {
  const config = useMemo(() => createWalletUiConfig({ clusters: [cluster] }), [cluster])
  return (
    <WalletUi key={cluster.id} config={config}>
      <WebWalletBridge cluster={cluster} identity={identity}>
        {children}
      </WebWalletBridge>
    </WalletUi>
  )
}

function toWalletAccount(account: UiWalletAccount): WalletAccount {
  return { address: account.address as WalletAccount['address'], icon: account.icon, label: account.label }
}

interface Deferred<T> {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

interface PendingSignIn {
  deferred: Deferred<WalletSignInOutput>
  input: WalletSignInInput
}

// Features the app cannot function without. Wallets lacking them are excluded
// from the picker: calling an account-bound hook (useSignMessage, the signer)
// for an unsupported wallet THROWS AT RENDER TIME. `solana:signIn` is optional
// and handled separately in ConnectedBridge below.
const REQUIRED_FEATURES = ['solana:signMessage', 'solana:signAndSendTransaction']

function isCompatibleWallet(wallet: UiWallet): boolean {
  return REQUIRED_FEATURES.every((feature) => wallet.features.includes(feature as never))
}

function WebWalletBridge({
  children,
  cluster,
  identity,
}: {
  children: ReactNode
  cluster: WalletProviderProps['cluster']
  identity: AppIdentity
}) {
  const { account, connect: selectAccount, disconnect, wallets: allWallets } = useWalletUi()
  const wallets = useMemo(() => allWallets.filter(isCompatibleWallet), [allWallets])
  const client = useMemo(() => createClient(cluster), [cluster])
  const [pickerVisible, setPickerVisible] = useState(false)
  const pendingConnect = useRef<Deferred<UiWalletAccount> | null>(null)
  const pendingSignIn = useRef<PendingSignIn | null>(null)

  const connect = useCallback(async (): Promise<WalletAccount> => {
    if (account) {
      return toWalletAccount(account)
    }
    if (wallets.length === 0) {
      throw new Error('No wallet-standard wallets detected in this browser. Install a Solana wallet extension.')
    }
    const deferred = pendingConnect.current ?? createDeferred<UiWalletAccount>()
    pendingConnect.current = deferred
    setPickerVisible(true)
    const uiAccount = await deferred.promise
    return toWalletAccount(uiAccount)
  }, [account, wallets])

  const onSelect = useCallback(
    (uiAccount: UiWalletAccount) => {
      selectAccount(uiAccount)
      setPickerVisible(false)
      pendingConnect.current?.resolve(uiAccount)
      pendingConnect.current = null
    },
    [selectAccount],
  )

  const onCancel = useCallback(() => {
    setPickerVisible(false)
    const reason = new Error('Wallet connection was cancelled.')
    pendingConnect.current?.reject(reason)
    pendingConnect.current = null
    pendingSignIn.current?.deferred.reject(reason)
    pendingSignIn.current = null
  }, [])

  // Sign-in before connect: remember the request, connect, then let the
  // connected bridge (which owns the account-bound hooks) fulfill it on mount.
  const signInDisconnected = useCallback(
    async (input: WalletSignInInput): Promise<WalletSignInOutput> => {
      const pending: PendingSignIn = { deferred: createDeferred<WalletSignInOutput>(), input }
      pendingSignIn.current = pending
      // The deferred is rejected by onCancel / ConnectedBridge on paths where
      // nobody awaits it (e.g. connect threw first); mark it handled so those
      // rejections don't surface as unhandled-promise console noise.
      pending.deferred.promise.catch(() => {})
      try {
        await connect()
      } catch (error) {
        // Connect failed (no wallet, cancelled): drop the request so a later
        // connect cannot fulfill a sign-in nobody is still awaiting.
        if (pendingSignIn.current === pending) {
          pendingSignIn.current = null
        }
        throw error
      }
      return pending.deferred.promise
    },
    [connect],
  )

  const base = useMemo(
    () => ({
      chain: cluster.id,
      client,
      connect,
      disconnect: async () => disconnect(),
      identity,
    }),
    [cluster.id, client, connect, disconnect, identity],
  )

  const disconnectedValue = useMemo<UseWalletReturn>(
    () => ({
      ...base,
      account: undefined,
      sendTransactions: async () => {
        throw new Error('Connect a wallet before sending transactions.')
      },
      signIn: signInDisconnected,
      signMessages: async () => {
        throw new Error('Connect a wallet before signing messages.')
      },
    }),
    [base, signInDisconnected],
  )

  return (
    <>
      {account ? (
        <ConnectedBridge account={account} base={base} pendingSignInRef={pendingSignIn}>
          {children}
        </ConnectedBridge>
      ) : (
        <WebWalletContext.Provider value={disconnectedValue}>{children}</WebWalletContext.Provider>
      )}
      <WalletPicker onCancel={onCancel} onSelect={onSelect} visible={pickerVisible} wallets={wallets} />
    </>
  )
}

interface ConnectedBridgeProps {
  account: UiWalletAccount
  base: Pick<UseWalletReturn, 'chain' | 'client' | 'connect' | 'disconnect' | 'identity'>
  children: ReactNode
  pendingSignInRef: { current: PendingSignIn | null }
}

// `useSignIn` throws at render when the wallet lacks `solana:signIn`, so the
// hook may only be mounted behind a feature check. Wallets without it get a
// `signIn` that reports unsupported rather than crashing the screen.
function ConnectedBridge(props: ConnectedBridgeProps) {
  if (props.account.features.includes('solana:signIn' as never)) {
    return <ConnectedBridgeWithSignIn {...props} />
  }
  return <ConnectedBridgeCore {...props} signIn={signInUnsupported} />
}

async function signInUnsupported(): Promise<WalletSignInOutput> {
  throw new Error('This wallet does not support Sign In With Solana.')
}

function ConnectedBridgeWithSignIn(props: ConnectedBridgeProps) {
  const signInWithAccount = useSignIn(props.account)

  const signIn = useCallback(
    async (input: WalletSignInInput): Promise<WalletSignInOutput> => {
      // The hook is bound to the account already, so the input's optional
      // address hint does not cross the wallet-standard boundary.
      const { address: _address, ...rest } = input
      const output = await signInWithAccount(rest)
      return {
        account: toWalletAccount(output.account),
        signature: output.signature as Uint8Array,
        signedMessage: output.signedMessage as Uint8Array,
      }
    },
    [signInWithAccount],
  )

  return <ConnectedBridgeCore {...props} signIn={signIn} />
}

function ConnectedBridgeCore({
  account,
  base,
  children,
  pendingSignInRef,
  signIn,
}: ConnectedBridgeProps & { signIn: UseWalletReturn['signIn'] }) {
  const signer = useWalletAccountTransactionSendingSigner(account, base.chain)
  const signMessage = useSignMessage(account)

  const signMessages = useCallback(
    async <K extends Uint8Array | Uint8Array[]>(message: K): Promise<K> => {
      // MWA concatenates [message][signature]; wallet-standard returns
      // {signature} separately. Consumers here only await the result, so the
      // signature bytes are the honest shape to return.
      if (Array.isArray(message)) {
        const signed = await Promise.all(message.map(async (m) => (await signMessage({ message: m })).signature))
        return signed as K
      }
      const { signature } = await signMessage({ message: message as Uint8Array })
      return signature as K
    },
    [signMessage],
  )

  const sendTransactions = useCallback(
    async (instructions: Instruction[]): Promise<string> => {
      const { value: latestBlockhash } = await base.client.rpc.getLatestBlockhash().send()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstructions(instructions, m),
      )
      const signature = await signAndSendTransactionMessageWithSigners(message)
      return getBase58Decoder().decode(signature)
    },
    [base.client, signer],
  )

  // Fulfill a sign-in that was requested before the wallet connected.
  useEffect(() => {
    const pending = pendingSignInRef.current
    if (!pending) return
    pendingSignInRef.current = null
    signIn(pending.input).then(pending.deferred.resolve, pending.deferred.reject)
  }, [pendingSignInRef, signIn])

  const value = useMemo<UseWalletReturn>(
    () => ({
      ...base,
      account: toWalletAccount(account),
      sendTransactions,
      signIn,
      signMessages,
    }),
    [base, account, sendTransactions, signIn, signMessages],
  )

  return <WebWalletContext.Provider value={value}>{children}</WebWalletContext.Provider>
}

function WalletPicker({
  onCancel,
  onSelect,
  visible,
  wallets,
}: {
  onCancel: () => void
  onSelect: (account: UiWalletAccount) => void
  visible: boolean
  wallets: UiWallet[]
}) {
  return (
    <Modal onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Connect a wallet</Text>
          {wallets.map((wallet) => (
            <WalletPickerRow
              autoConnect={visible && wallets.length === 1}
              key={wallet.name}
              onSelect={onSelect}
              wallet={wallet}
            />
          ))}
          <Button onPress={onCancel} title="Cancel" />
        </View>
      </View>
    </Modal>
  )
}

function WalletPickerRow({
  autoConnect,
  onSelect,
  wallet,
}: {
  autoConnect: boolean
  onSelect: (account: UiWalletAccount) => void
  wallet: UiWallet
}) {
  const [isConnecting, connect] = useConnect(wallet)
  const requested = useRef(false)

  const select = useCallback(async () => {
    if (requested.current) return
    requested.current = true
    try {
      const accounts = await connect()
      if (accounts.length > 0) {
        onSelect(accounts[0])
      }
    } catch (e) {
      console.log(`Error connecting to ${wallet.name}: ${e}`)
    } finally {
      requested.current = false
    }
  }, [connect, onSelect, wallet.name])

  // With exactly one compatible wallet there is nothing to pick: connect()
  // auto-selects it, matching MWA's argument-less connect UX.
  useEffect(() => {
    if (autoConnect) {
      select().catch(console.log)
    }
  }, [autoConnect, select])

  return (
    <View style={styles.row}>
      <Button disabled={isConnecting} onPress={select} title={wallet.name} />
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    marginVertical: 4,
  },
  sheet: {
    backgroundColor: 'white',
    borderRadius: 12,
    gap: 8,
    minWidth: 280,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
})
