import type { Address, Lamports } from '@solana/kit'

import { client } from './rpc'

/**
 * Reports the account balance: once from an RPC read, then again on every change, until
 * `abortSignal` fires.
 *
 * Kit's subscriptions are async iterables, so "subscribe" is a `for await` loop — there is no
 * callback registry to maintain and no unsubscribe function to remember, because aborting the signal
 * ends the loop and closes the socket. Disconnecting a wallet is one `AbortController.abort()`.
 *
 * The order of the two calls matters. Subscribing first means a change that lands while the read is
 * still in flight is buffered by the iterable and delivered as soon as the loop starts, so it
 * overwrites the read rather than being lost. Reading first would leave a gap.
 *
 * That order is also why the subscription is opened on a signal of this function's own, aborted on
 * the way out. A rejecting read returns before the `for await` begins, so the subscription would
 * otherwise be left open with nobody reading it — waiting on the caller to abort a stream it never
 * saw start.
 */
export async function trackBalance({
  abortSignal,
  address,
  onBalance,
}: {
  abortSignal: AbortSignal
  address: Address
  onBalance: (lamports: Lamports) => void
}): Promise<void> {
  const done = new AbortController()
  const signal = AbortSignal.any([abortSignal, done.signal])

  try {
    const notifications = await client.rpcSubscriptions
      .accountNotifications(address, { commitment: 'confirmed' })
      .subscribe({ abortSignal: signal })

    const { value } = await client.rpc.getBalance(address, { commitment: 'confirmed' }).send({ abortSignal: signal })
    onBalance(value)

    for await (const notification of notifications) {
      onBalance(notification.value.lamports)
    }
  } finally {
    done.abort()
  }
}
