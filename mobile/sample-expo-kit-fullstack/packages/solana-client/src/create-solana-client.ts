import { createClient } from '@solana/kit'
import { solanaRpcConnection } from '@solana/kit-plugin-rpc'

/**
 * Builds the read-only Kit client the API uses.
 *
 * `solanaRpcConnection` is the plugin to reach for on the server: it installs `rpc` and
 * `rpcSubscriptions` from a plain endpoint URL and nothing else. The per-network plugins
 * (`solanaDevnetRpc` and friends) additionally install transaction planning and sending, which
 * require a payer on the client — and this client has none on purpose. Signing and sending happen
 * in the apps, against the user's wallet.
 *
 * The subscriptions URL defaults to `rpcUrl` with `http` swapped for `ws`, which is right for the
 * public endpoints and for a local validator. Pass `rpcSubscriptionsUrl` when a provider serves
 * websockets from a different host.
 */
export function createSolanaClient({
  rpcSubscriptionsUrl,
  rpcUrl,
}: {
  rpcSubscriptionsUrl?: string
  rpcUrl: string
}) {
  return createClient().use(
    solanaRpcConnection({
      rpcUrl,
      ...(rpcSubscriptionsUrl ? { rpcSubscriptionsUrl } : {}),
    }),
  )
}
