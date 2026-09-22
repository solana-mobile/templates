import { ellipsify } from '@/lib/ellipsify'

export function SolanaUiWalletAddress({
  address,
  len = 6,
}: {
  address?: string
  len?: number
}) {
  if (!address) {
    return null
  }

  return ellipsify(address, len, '…')
}
