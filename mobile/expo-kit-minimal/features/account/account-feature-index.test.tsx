import { fireEvent } from '@testing-library/react-native'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountFeatureIndex } from '@/features/account/account-feature-index'
import { createMobileWalletMock, renderWithProviders, TEST_ADDRESS } from '@/test/test-utils'

// `vi.mock` is hoisted above the imports, so the mock value lives in a mutable holder that each test
// reassigns before rendering.
const wallet = vi.hoisted(() => ({ current: null as ReturnType<typeof createMobileWalletMock> | null }))

vi.mock('@wallet-ui/react-native-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wallet-ui/react-native-kit')>()),
  useMobileWallet: () => wallet.current,
}))

describe('AccountFeatureIndex', () => {
  beforeEach(() => {
    wallet.current = createMobileWalletMock()
  })

  describe('when a wallet is connected', () => {
    it('shows the connected wallet label', async () => {
      const screen = await renderWithProviders(<AccountFeatureIndex />)

      expect(screen.getByText(/Connected to Test Wallet/)).toBeTruthy()
    })

    it('renders the balance returned by the RPC client', async () => {
      wallet.current = createMobileWalletMock({ balance: 2_250_000_000n })

      const screen = await renderWithProviders(<AccountFeatureIndex />)

      expect(await screen.findByText(/Balance: 2\.25 SOL/)).toBeTruthy()
      expect(wallet.current.client.rpc.getBalance).toHaveBeenCalledWith(TEST_ADDRESS)
    })

    it('sends a memo instruction through the wallet when signing a transaction', async () => {
      const screen = await renderWithProviders(<AccountFeatureIndex />)

      await fireEvent.press(screen.getByRole('button', { name: /sign transaction/i }))

      expect(wallet.current!.sendTransactions).toHaveBeenCalledOnce()
      const [instructions] = wallet.current!.sendTransactions.mock.calls[0]
      expect(instructions).toHaveLength(1)
      expect(instructions[0].programAddress).toBe('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
      expect(new TextDecoder().decode(instructions[0].data)).toBe(`gm from Mobile Wallet Adapter - ${TEST_ADDRESS}`)
    })

    it('signs a message containing the connected address', async () => {
      const screen = await renderWithProviders(<AccountFeatureIndex />)

      await fireEvent.press(screen.getByRole('button', { name: /sign message/i }))

      expect(wallet.current!.signMessages).toHaveBeenCalledOnce()
      const [message] = wallet.current!.signMessages.mock.calls[0]
      expect(new TextDecoder().decode(message)).toBe(`Signing a message with ${TEST_ADDRESS}`)
    })

    it('reports failure on the button when signing a message is rejected', async () => {
      wallet.current = createMobileWalletMock()
      wallet.current.signMessages.mockRejectedValueOnce(new Error('User rejected the request'))

      const screen = await renderWithProviders(<AccountFeatureIndex />)
      await fireEvent.press(screen.getByRole('button', { name: /sign message/i }))

      expect(await screen.findByRole('button', { name: /sign message failed/i })).toBeTruthy()
    })

    it('disconnects the wallet', async () => {
      const screen = await renderWithProviders(<AccountFeatureIndex />)

      await fireEvent.press(screen.getByRole('button', { name: /disconnect/i }))

      expect(wallet.current!.disconnect).toHaveBeenCalledOnce()
    })
  })

  describe('when no wallet is connected', () => {
    beforeEach(() => {
      wallet.current = createMobileWalletMock({ account: null })
    })

    it('offers to connect instead of showing account actions', async () => {
      const screen = await renderWithProviders(<AccountFeatureIndex />)

      expect(screen.getByRole('button', { name: /^connect$/i })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /sign transaction/i })).toBeNull()
      expect(screen.queryByText(/Connected to/)).toBeNull()
    })

    it('connects the wallet', async () => {
      const screen = await renderWithProviders(<AccountFeatureIndex />)

      await fireEvent.press(screen.getByRole('button', { name: /^connect$/i }))

      expect(wallet.current!.connect).toHaveBeenCalledOnce()
    })

    it('does not query the balance', async () => {
      await renderWithProviders(<AccountFeatureIndex />)

      expect(wallet.current!.client.rpc.getBalance).not.toHaveBeenCalled()
    })
  })
})
