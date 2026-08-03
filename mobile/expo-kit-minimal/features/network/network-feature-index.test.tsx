import { fireEvent } from '@testing-library/react-native'
import { createSolanaDevnet, createSolanaTestnet } from '@wallet-ui/react-native-kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkFeatureIndex } from '@/features/network/network-feature-index'
import { NetworkProvider } from '@/features/network/network-provider'
import { createMobileWalletMock, renderWithProviders } from '@/test/test-utils'

const wallet = vi.hoisted(() => ({ current: null as ReturnType<typeof createMobileWalletMock> | null }))

vi.mock('@wallet-ui/react-native-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wallet-ui/react-native-kit')>()),
  useMobileWallet: () => wallet.current,
}))

const devnet = createSolanaDevnet({ url: 'https://api.devnet.solana.com' })
const testnet = createSolanaTestnet({ url: 'https://api.testnet.solana.com' })

function renderNetworkFeature() {
  return renderWithProviders(<NetworkProvider networks={[devnet, testnet]} render={() => <NetworkFeatureIndex />} />)
}

describe('NetworkFeatureIndex', () => {
  beforeEach(() => {
    wallet.current = createMobileWalletMock()
  })

  it('shows the selected network', async () => {
    const screen = await renderNetworkFeature()

    expect(screen.getByText(/Connected to Devnet/)).toBeTruthy()
  })

  it('renders the cluster version reported by the RPC client', async () => {
    const screen = await renderNetworkFeature()

    expect(await screen.findByText(/Version: 2\.1\.0 \(1234567890\)/)).toBeTruthy()
    expect(wallet.current!.client.rpc.getVersion).toHaveBeenCalled()
  })

  it('renders a shortened genesis hash', async () => {
    const screen = await renderNetworkFeature()

    expect(await screen.findByText(/Genesis Hash: EtWTRABZ\.\.6VU2xqa1/)).toBeTruthy()
  })

  it('only offers the networks that are not currently selected', async () => {
    const screen = await renderNetworkFeature()

    expect(screen.getByRole('button', { name: /connect to testnet/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /connect to devnet/i })).toBeNull()
  })

  it('switches to another network', async () => {
    const screen = await renderNetworkFeature()

    await fireEvent.press(screen.getByRole('button', { name: /connect to testnet/i }))

    expect(screen.getByText(/Connected to Testnet/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /connect to devnet/i })).toBeTruthy()
  })
})
