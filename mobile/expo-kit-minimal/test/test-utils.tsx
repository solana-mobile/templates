import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'
import { Address, Instruction } from '@solana/kit'
import { ReactElement } from 'react'
import { vi } from 'vitest'

/** A fixed address so assertions stay deterministic. */
export const TEST_ADDRESS = 'GsbwXfJraMomNxBcjK9jJ3YuPBQTd7pTvbwEfJvvZoP1' as Address

/**
 * Render a component tree with the providers the app relies on.
 *
 * React Query is configured without retries and without a cache shared between tests, so a failing
 * query fails fast instead of hanging the test.
 *
 * `render` is async in React Native Testing Library v14 — always await this helper.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false, staleTime: 0 } },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

export interface MobileWalletMockOptions {
  /** Lamports returned by `client.rpc.getBalance`. */
  balance?: bigint
  /** Pass `null` to simulate a disconnected wallet. */
  account?: { address: Address; label: string } | null
}

/**
 * Build a stand-in for `useMobileWallet()`.
 *
 * This is the seam that replaces the Mobile Wallet Adapter transport: no wallet app, no device and
 * no RPC calls are involved, so the tests stay fast and deterministic while still driving the real
 * components.
 */
export function createMobileWalletMock({ account, balance = 1_500_000_000n }: MobileWalletMockOptions = {}) {
  return {
    account: account === undefined ? { address: TEST_ADDRESS, label: 'Test Wallet' } : account,
    chain: 'solana:devnet',
    client: {
      rpc: {
        getBalance: vi.fn((_address: Address) => ({ send: () => Promise.resolve({ value: balance }) })),
        getGenesisHash: vi.fn(() => ({ send: () => Promise.resolve('EtWTRABZaYq6iMfeYKouRu166VU2xqa1') })),
        getVersion: vi.fn(() => ({
          send: () => Promise.resolve({ 'feature-set': 1234567890, 'solana-core': '2.1.0' }),
        })),
      },
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    identity: { name: 'expo-kit-minimal', uri: 'https://example.com' },
    sendTransactions: vi.fn((_instructions: Instruction[]) => Promise.resolve('SignatureFromMockedWallet')),
    signIn: vi.fn(),
    signMessages: vi.fn((_message: Uint8Array) => Promise.resolve([])),
  }
}
