import { createContext, useContext, useMemo } from 'react'
import { createClient } from './create-client'
import type { UseWalletReturn, WalletProviderProps } from './wallet-types'

// Interim web implementation: wallet-standard connect/sign lands in the next
// ticket, so until then the web bundle gets a disconnected context whose
// wallet actions reject with a clear message. Keeping the seam in place means
// no native-only module ever enters the web bundle, and the RPC client is real
// so balance/network reads already work.
//
// This file must stay static-render-safe: `expo export -p web` pre-renders
// every route in Node (`app.json` keeps `web.output: "static"`), so no
// `window`/`document`/`localStorage` access at import or render scope.

const WebWalletContext = createContext<UseWalletReturn | null>(null)

export function useWebWallet(): UseWalletReturn {
  const value = useContext(WebWalletContext)
  if (!value) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return value
}

function unavailable(): Promise<never> {
  return Promise.reject(new Error('Web wallet support is not yet available — connect a wallet on Android instead.'))
}

export function WalletProvider({ children, cluster, identity }: WalletProviderProps) {
  const value = useMemo<UseWalletReturn>(
    () => ({
      account: undefined,
      chain: cluster.id,
      client: createClient(cluster),
      identity,
      connect: unavailable,
      // Disconnecting a wallet that was never connected is a no-op, not an error.
      disconnect: () => Promise.resolve(),
      sendTransactions: unavailable,
      signIn: unavailable,
      signMessages: unavailable,
    }),
    [cluster, identity],
  )

  return <WebWalletContext.Provider value={value}>{children}</WebWalletContext.Provider>
}
