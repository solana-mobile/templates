import { cn } from '@/lib/utils'

/**
 * A wallet's own icon, as published to the wallet-standard registry.
 *
 * The source is always a data URI, so there is no network request and nothing to fall back to when
 * a wallet publishes none — in that case the element is simply not rendered.
 */
export function SolanaUiWalletIcon({
  className,
  name,
  src,
}: {
  className?: string
  name?: string
  src?: string
}) {
  if (!src) {
    return null
  }

  return <img alt={name ?? ''} className={cn('size-4', className)} src={src} />
}
