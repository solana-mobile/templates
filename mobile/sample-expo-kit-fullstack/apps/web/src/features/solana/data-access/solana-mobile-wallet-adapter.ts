import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from '@solana-mobile/wallet-standard-mobile'

/**
 * Registers Mobile Wallet Adapter as a wallet-standard wallet.
 *
 * This is the whole mobile-wallet integration: MWA joins the same registry browser-extension
 * wallets announce themselves on, so the wallet plugin discovers it alongside everything else and
 * no code below this point knows the difference.
 *
 * MWA appears only in Chrome on Android, where it connects to a wallet installed on the same
 * device, and only over a secure context.
 *
 * Localnet is deliberately absent from `chains`: mobile wallets do not carry a localnet
 * configuration, and the ones that resolve `solana:localnet` at all tend to map it to mainnet,
 * which surfaces as a confusing network mismatch at signing time rather than an honest refusal.
 *
 * Call this once, before React renders.
 */
export function registerMobileWalletAdapter(): void {
  if (typeof window === 'undefined') {
    return
  }

  if (!window.isSecureContext) {
    console.warn(
      'Solana Mobile Wallet Adapter not loaded: https connection required',
    )
    return
  }

  registerMwa({
    appIdentity: {
      icon: 'favicon.png',
      name: 'Sample Expo Kit Fullstack',
      uri: window.location.origin,
    },
    authorizationCache: createDefaultAuthorizationCache(),
    chainSelector: createDefaultChainSelector(),
    chains: ['solana:devnet', 'solana:testnet', 'solana:mainnet'],
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  })
}
