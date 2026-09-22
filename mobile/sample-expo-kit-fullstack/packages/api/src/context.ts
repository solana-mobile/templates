import { auth } from '@repo/auth'
import { env } from '@repo/env/api'
import { createSolanaClient } from '@repo/solana-client'
import type { Context as HonoContext } from 'hono'

export type CreateContextOptions = {
  context: HonoContext
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  })

  const solana = createSolanaClient({
    rpcUrl: env.SOLANA_ENDPOINT,
  })

  return {
    session,
    solana,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
