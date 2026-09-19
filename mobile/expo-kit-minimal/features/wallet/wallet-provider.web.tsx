import type { SolanaClusterId } from '@wallet-ui/core'
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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
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
// 1. WebWalletBridge — owns ONE stable WebWalletContext.Provider around the
//    app children for the provider's whole lifetime, plus connect() (opens
//    the picker; resolves on a compatible selection, rejects on cancel,
//    wallet error, or a wallet that returns no usable account), disconnect,
//    the RPC client, and the disconnected context. Because the provider
//    element and the children's position inside it never change with wallet
//    state, connecting or disconnecting re-renders consumers but never
//    remounts the subtree beneath it — navigator state included.
// 2. ConnectedBridge — mounted as a SIBLING of the children while an account
//    exists; calls the account-bound hooks unconditionally and publishes the
//    connected operations up to the bridge, which swaps them into the
//    context value in place. Its mount/unmount cycle is confined to itself.
// 3. WalletPickerRow — one per discovered wallet; `useConnect(wallet)` per row
//    is the rules-of-hooks-safe way to drive a dynamic wallet list.
//
// Connect lifecycle: every attempt carries an id (the `connectAttempt` state
// doubles as picker visibility and attempt identity). Rows report their
// result tagged with the attempt that spawned them; the bridge settles only
// the current attempt, so a wallet response landing after cancel — or from a
// superseded attempt — is dropped instead of applying a connection nobody is
// waiting for. Attempts also re-key the rows, so a new attempt always starts
// a fresh `useConnect` call rather than tripping a stale row's busy guard.
//
// Request lifecycle: every pending caller of the seam must settle — success,
// wallet rejection, picker cancel, an explicit disconnect, a concurrent
// sign-in, or provider unmount. The pending connect attempt and deferred
// sign-in live in refs the bridge rejects on each of those paths; unmount
// rejection runs in an effect cleanup so an abandoned connect()/signIn()
// can never hang forever.
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

interface PendingConnect {
  attempt: number
  deferred: Deferred<UiWalletAccount>
}

interface PendingSignIn {
  deferred: Deferred<WalletSignInOutput>
  input: WalletSignInInput
  // True once the connected bridge has handed the request to the wallet.
  // The entry stays in the ref until the wallet settles so unmount,
  // disconnect, or a picker cancel can still reject an in-flight sign-in.
  started: boolean
}

// The connected half of the context, produced by ConnectedBridge (which owns
// the account-bound hooks) and published up to WebWalletBridge, which swaps
// it into the stable provider value.
interface ConnectedOps {
  account: WalletAccount
  sendTransactions: UseWalletReturn['sendTransactions']
  signIn: UseWalletReturn['signIn']
  signMessages: UseWalletReturn['signMessages']
}

// Features the app cannot function without, enforced at two levels. Wallets
// lacking them — or not declaring the active chain — are excluded from the
// picker. But wallet-level declarations don't guarantee the account: the
// account-bound hooks (`useSignMessage`, the transaction sending signer)
// bind the ACCOUNT's own feature list and chain set and THROW AT RENDER on a
// miss, so the returned account is checked again at selection, and again as
// a guard before ConnectedBridge mounts the hooks. `solana:signIn` is
// optional and handled separately in ConnectedBridge below.
const REQUIRED_FEATURES = ['solana:signMessage', 'solana:signAndSendTransaction']

function isCompatibleWallet(wallet: UiWallet, chain: SolanaClusterId): boolean {
  return (
    REQUIRED_FEATURES.every((feature) => wallet.features.includes(feature as never)) &&
    wallet.chains.includes(chain as never)
  )
}

function isCompatibleAccount(account: UiWalletAccount, chain: SolanaClusterId): boolean {
  return (
    REQUIRED_FEATURES.every((feature) => account.features.includes(feature as never)) &&
    account.chains.includes(chain as never)
  )
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
  const wallets = useMemo(
    () => allWallets.filter((wallet) => isCompatibleWallet(wallet, cluster.id)),
    [allWallets, cluster.id],
  )
  const client = useMemo(() => createClient(cluster), [cluster])
  const nextConnectAttempt = useRef(0)
  const pendingConnect = useRef<PendingConnect | null>(null)
  const pendingSignIn = useRef<PendingSignIn | null>(null)
  const [connectAttempt, setConnectAttempt] = useState<number | null>(null)
  const [connectedOps, setConnectedOps] = useState<ConnectedOps | null>(null)
  const [, bumpSignInDrain] = useState(0) // write-only: exists to schedule a drain commit

  // Every pending request the bridge owns must settle — including when the
  // provider itself goes away. Rejecting on unmount guarantees a caller is
  // never left awaiting a promise nobody can still fulfill.
  useEffect(
    () => () => {
      const reason = new Error('The wallet provider was unmounted.')
      pendingConnect.current?.deferred.reject(reason)
      pendingConnect.current = null
      pendingSignIn.current?.deferred.reject(reason)
      pendingSignIn.current = null
    },
    [],
  )

  // A deferred sign-in that loses its account before the connected bridge
  // could hand it to the wallet can never be fulfilled — reject it rather
  // than leaving the caller waiting on a future connect. Fires only on the
  // connected→disconnected transition, so a request still waiting through
  // an open connect attempt is untouched; wallet-side disconnects that
  // bypass disconnectAll land here.
  useEffect(() => {
    if (account) return
    const pending = pendingSignIn.current
    if (!pending) return
    pendingSignIn.current = null
    pending.deferred.reject(new Error('The wallet was disconnected.'))
  }, [account])

  const connect = useCallback(async (): Promise<WalletAccount> => {
    if (account) {
      return toWalletAccount(account)
    }
    if (wallets.length === 0) {
      throw new Error('No wallet-standard wallets detected in this browser. Install a Solana wallet extension.')
    }
    // Concurrent connect() calls share the open attempt's deferred.
    const pending = pendingConnect.current ?? {
      attempt: ++nextConnectAttempt.current,
      deferred: createDeferred<UiWalletAccount>(),
    }
    pendingConnect.current = pending
    // The deferred can also be rejected by onCancel/onError/unmount on paths
    // where nobody awaits it directly; mark it handled so those rejections
    // never surface as unhandled-promise noise.
    pending.deferred.promise.catch(() => {})
    setConnectAttempt(pending.attempt)
    const uiAccount = await pending.deferred.promise
    return toWalletAccount(uiAccount)
  }, [account, wallets])

  // Settle the pending attempt — but only if `attempt` still identifies it.
  // A picker row whose wallet finished after the user cancelled, or that
  // belongs to a superseded attempt, lands here with a stale id and is
  // dropped rather than applying a connection nobody is waiting for.
  const settleConnect = useCallback((attempt: number | null): PendingConnect | null => {
    const pending = pendingConnect.current
    if (attempt === null || !pending || pending.attempt !== attempt) {
      return null
    }
    pendingConnect.current = null
    setConnectAttempt(null)
    return pending
  }, [])

  const onAccounts = useCallback(
    (accounts: readonly UiWalletAccount[], attempt: number | null) => {
      const pending = settleConnect(attempt)
      if (!pending) {
        return
      }
      try {
        // The wallet's feature list says nothing about the account it
        // returns: pick the first account that can actually sign on this
        // cluster, or reject rather than mounting hooks that throw at render.
        const list = Array.isArray(accounts) ? accounts : []
        const selected = list.find((a) => isCompatibleAccount(a, cluster.id))
        if (!selected) {
          throw new Error(
            list.length === 0
              ? 'The selected wallet did not return any accounts.'
              : `The selected wallet has no account that can sign and send transactions on ${cluster.id}.`,
          )
        }
        selectAccount(selected)
        pending.deferred.resolve(selected)
      } catch (error) {
        pending.deferred.reject(error instanceof Error ? error : new Error(String(error)))
      }
    },
    [cluster.id, selectAccount, settleConnect],
  )

  const onError = useCallback(
    (error: unknown, attempt: number | null) => {
      settleConnect(attempt)?.deferred.reject(error instanceof Error ? error : new Error(String(error)))
    },
    [settleConnect],
  )

  const onCancel = useCallback(() => {
    const pending = pendingConnect.current
    pendingConnect.current = null
    setConnectAttempt(null)
    const reason = new Error('Wallet connection was cancelled.')
    pending?.deferred.reject(reason)
    pendingSignIn.current?.deferred.reject(reason)
    pendingSignIn.current = null
  }, [])

  // Sign-in before connect: remember the request, connect, then let the
  // connected bridge (which owns the account-bound hooks) fulfill it on
  // mount. One at a time: a second call while the first is still connecting
  // is rejected outright rather than overwriting the pending slot and
  // orphaning the first caller forever.
  const signInDisconnected = useCallback(
    async (input: WalletSignInInput): Promise<WalletSignInOutput> => {
      if (pendingSignIn.current) {
        throw new Error('A sign-in is already in progress.')
      }
      const pending: PendingSignIn = { deferred: createDeferred<WalletSignInOutput>(), input, started: false }
      pendingSignIn.current = pending
      // Guarantee a commit follows this call: a request created while the
      // connected bridge is already mounted — a signIn reference captured
      // during the pre-publish window and invoked later — is drained by the
      // every-commit effect, but only if a render happens. Nothing else
      // would schedule one.
      bumpSignInDrain((n) => n + 1)
      // The deferred is rejected by onCancel / ConnectedBridge on paths where
      // nobody awaits it (e.g. connect threw first); mark it handled so those
      // rejections don't surface as unhandled-promise console noise.
      pending.deferred.promise.catch(() => {})
      try {
        await connect()
      } catch (error) {
        // Connect failed (no wallet, cancelled): drop the request so a later
        // connect cannot fulfill a sign-in nobody is still awaiting — unless
        // the bridge already started it (a restored session or a parallel
        // connect handed it to the wallet first), in which case the request
        // keeps its own outcome.
        if (pendingSignIn.current === pending) {
          pendingSignIn.current = null
        }
        if (pending.started) {
          return pending.deferred.promise
        }
        throw error
      }
      return pending.deferred.promise
    },
    [connect],
  )

  // An explicit disconnect cancels everything still in flight — an open
  // connect attempt (picker included) and a sign-in still waiting to be
  // fulfilled — so no caller hangs on a wallet the user just dropped.
  const disconnectAll = useCallback(async () => {
    const reason = new Error('The wallet was disconnected.')
    const conn = pendingConnect.current
    pendingConnect.current = null
    setConnectAttempt(null)
    conn?.deferred.reject(reason)
    const signInReq = pendingSignIn.current
    pendingSignIn.current = null
    signInReq?.deferred.reject(reason)
    await disconnect()
  }, [disconnect])

  const base = useMemo(
    () => ({
      chain: cluster.id,
      client,
      connect,
      disconnect: disconnectAll,
      identity,
    }),
    [cluster.id, client, connect, disconnectAll, identity],
  )

  const value = useMemo<UseWalletReturn>(() => {
    // Published ops are vended only while they still describe the account
    // wallet-ui reports — a stale set (disconnect not yet cleaned up, or a
    // mid-switch account) falls back to the disconnected contract rather
    // than signing with the wrong account.
    if (connectedOps && account && connectedOps.account.address === account.address) {
      return { ...base, ...connectedOps }
    }
    return {
      ...base,
      account: undefined,
      sendTransactions: async () => {
        throw new Error('Connect a wallet before sending transactions.')
      },
      signIn: signInDisconnected,
      signMessages: async () => {
        throw new Error('Connect a wallet before signing messages.')
      },
    }
  }, [account, base, connectedOps, signInDisconnected])

  // ONE provider for the provider's whole lifetime: `children` sits at a
  // fixed position inside it, so wallet state changes re-render consumers
  // but never remount the app subtree. The hook-bearing ConnectedBridge and
  // the picker live as siblings, not wrappers.
  return (
    <WebWalletContext.Provider value={value}>
      {children}
      {account ? (
        <ConnectedBridge account={account} base={base} pendingSignInRef={pendingSignIn} publishOps={setConnectedOps} />
      ) : null}
      <WalletPicker
        attempt={connectAttempt}
        onAccounts={onAccounts}
        onCancel={onCancel}
        onError={onError}
        visible={connectAttempt !== null}
        wallets={wallets}
      />
    </WebWalletContext.Provider>
  )
}

interface ConnectedBridgeProps {
  account: UiWalletAccount
  base: Pick<UseWalletReturn, 'chain' | 'client' | 'connect' | 'disconnect' | 'identity'>
  pendingSignInRef: { current: PendingSignIn | null }
  publishOps: Dispatch<SetStateAction<ConnectedOps | null>>
}

// The account-bound hooks throw at render for an account missing a required
// feature or the active chain, so every variant is gated on
// `isCompatibleAccount` — the picker's filter is not the only path an account
// can arrive by (a wallet can switch accounts after connecting). Optional
// `solana:signIn` gets its own branch: wallets without it get a `signIn`
// that reports unsupported rather than crashing the screen.
function ConnectedBridge(props: ConnectedBridgeProps) {
  if (!isCompatibleAccount(props.account, props.base.chain)) {
    return <ConnectedBridgeUnsupported {...props} />
  }
  if (props.account.features.includes('solana:signIn' as never)) {
    return <ConnectedBridgeWithSignIn {...props} />
  }
  return <ConnectedBridgeWithSigning {...props} signIn={signInUnsupported} />
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

  return <ConnectedBridgeWithSigning {...props} signIn={signIn} />
}

// Mounted only for accounts that satisfy `isCompatibleAccount`: both hooks
// below throw at render when the account lacks the feature or the chain.
function ConnectedBridgeWithSigning({
  signIn,
  ...props
}: ConnectedBridgeProps & { signIn: UseWalletReturn['signIn'] }) {
  const { account, base } = props
  const signer = useWalletAccountTransactionSendingSigner(account, base.chain)
  const signMessage = useSignMessage(account)

  const signMessages = useCallback(
    async <K extends Uint8Array | Uint8Array[]>(message: K): Promise<K> => {
      // MWA's sign_messages returns signed payloads — the message bytes with
      // the signature appended. wallet-standard returns `{signedMessage,
      // signature}` separately, so the seam concatenates here: both platforms
      // must vend the same shape or the contract is not portable.
      const sign = async (m: Uint8Array) => {
        const { signature, signedMessage } = await signMessage({ message: m })
        const signed = new Uint8Array(signedMessage.length + signature.length)
        signed.set(signedMessage)
        signed.set(signature, signedMessage.length)
        return signed
      }
      if (Array.isArray(message)) {
        return (await Promise.all(message.map(sign))) as K
      }
      return (await sign(message as Uint8Array)) as K
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

  return (
    <ConnectedBridgeCore {...props} sendTransactions={sendTransactions} signIn={signIn} signMessages={signMessages} />
  )
}

// Reached when the wallet switches to an account that cannot sign on this
// cluster after connecting: the account-bound hooks would throw at render,
// so the context still reports the account but every signing action fails
// with a helpful error instead of crashing the screen.
function ConnectedBridgeUnsupported(props: ConnectedBridgeProps) {
  const chain = props.base.chain
  const sendTransactions = useCallback(async (): Promise<string> => {
    throw new Error(`The connected account cannot sign and send transactions on ${chain}.`)
  }, [chain])
  const signMessages = useCallback(
    async <K extends Uint8Array | Uint8Array[]>(_message: K): Promise<K> => {
      throw new Error(`The connected account cannot sign messages on ${chain}.`)
    },
    [chain],
  )
  return (
    <ConnectedBridgeCore
      {...props}
      sendTransactions={sendTransactions}
      signIn={signInUnsupported}
      signMessages={signMessages}
    />
  )
}

function ConnectedBridgeCore({
  account,
  pendingSignInRef,
  publishOps,
  sendTransactions,
  signIn,
  signMessages,
}: ConnectedBridgeProps & Pick<UseWalletReturn, 'sendTransactions' | 'signIn' | 'signMessages'>) {
  // Fulfill a sign-in that was requested while the disconnected contract
  // was being vended. Runs on EVERY commit, not just mount: the context
  // still serves the disconnected signIn for the commit between "account
  // set" and "ops published" (and the same window on account switch), so a
  // request can land here while the bridge is already mounted — the next
  // commit (the ops publish is always one) drains it. `started` marks the
  // hand-off: the entry then stays in the ref until the wallet settles, so
  // unmount, disconnect, or a picker cancel can still reject an in-flight
  // sign-in; the identity check keeps a settled request from clearing a
  // newer one.
  useEffect(() => {
    const pending = pendingSignInRef.current
    if (!pending || pending.started) return
    pending.started = true
    signIn(pending.input).then(
      (output) => {
        if (pendingSignInRef.current === pending) {
          pendingSignInRef.current = null
        }
        pending.deferred.resolve(output)
      },
      (error) => {
        if (pendingSignInRef.current === pending) {
          pendingSignInRef.current = null
        }
        pending.deferred.reject(error)
      },
    )
  })

  // Publish this variant's operations up to the stable context — but only
  // when the account changes. The account-bound hooks are free to vend
  // fresh function identities every render, so republishing per render
  // would re-render the bridge forever; every op is bound to `account`
  // anyway, so a published set is stale only when the account itself is.
  const opsRef = useRef<ConnectedOps | null>(null)
  // Render-phase write by design: the ref is read only by the post-commit
  // publish effect below, so the committed render's write is the one read.
  opsRef.current = { account: toWalletAccount(account), sendTransactions, signIn, signMessages }
  useEffect(() => {
    publishOps(opsRef.current)
    return () => publishOps(null)
  }, [account, publishOps])

  return null
}

function WalletPicker({
  attempt,
  onAccounts,
  onCancel,
  onError,
  visible,
  wallets,
}: {
  attempt: number | null
  onAccounts: (accounts: readonly UiWalletAccount[], attempt: number | null) => void
  onCancel: () => void
  onError: (error: unknown, attempt: number | null) => void
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
              attempt={attempt}
              autoConnect={visible && wallets.length === 1}
              key={`${wallet.name}:${attempt}`}
              onAccounts={onAccounts}
              onError={onError}
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
  attempt,
  autoConnect,
  onAccounts,
  onError,
  wallet,
}: {
  attempt: number | null
  autoConnect: boolean
  onAccounts: (accounts: readonly UiWalletAccount[], attempt: number | null) => void
  onError: (error: unknown, attempt: number | null) => void
  wallet: UiWallet
}) {
  const [isConnecting, connect] = useConnect(wallet)
  const requested = useRef(false)

  const select = useCallback(async () => {
    if (requested.current) return
    requested.current = true
    try {
      // The bridge owns the outcome: it validates the returned accounts
      // (empty or incompatible lists reject) and applies the selection only
      // if this attempt is still current — a response landing after cancel
      // is dropped there, not here.
      onAccounts(await connect(), attempt)
    } catch (error) {
      // Wallet-side failures (declined authorization, extension errors)
      // must reject the pending connect(), not disappear into the console.
      onError(error, attempt)
    } finally {
      requested.current = false
    }
  }, [attempt, connect, onAccounts, onError])

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
