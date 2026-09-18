// Facade for TypeScript and non-platform tooling. Metro never bundles this file:
// it resolves wallet-provider.native.tsx on Android/iOS and wallet-provider.web.tsx
// on web. Keep this `.tsx` extension in lockstep with the variants: a `.ts`
// facade beside `.tsx` variants makes web resolve the facade — which re-exports
// the native variant — and fail at runtime.
export * from './wallet-provider.native'
