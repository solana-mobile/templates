import { useEffect, useState } from 'react'

/**
 * Reports whether the component has mounted in the browser.
 *
 * Wallet state is client-only: the server has no wallet-standard registry, so a component that
 * renders it directly produces different markup on the server than on the first client render, and
 * React discards the whole server tree with a hydration error. Gating on this hook makes both
 * passes agree, and the real state lands on the render after mount.
 */
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return hasMounted
}
