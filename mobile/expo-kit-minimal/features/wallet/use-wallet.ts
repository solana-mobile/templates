// Facade for TypeScript and non-platform tooling. Metro never bundles this file:
// it resolves use-wallet.native.ts on Android/iOS and use-wallet.web.ts on web.
// Keep this extension in lockstep with the variants: a `.ts` facade beside
// `.tsx` variants (or vice versa) makes web resolve the facade — which
// re-exports the native variant — and fail at runtime.
export * from './use-wallet.native'
