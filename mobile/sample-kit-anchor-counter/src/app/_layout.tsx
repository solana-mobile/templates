import '../global.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { AppIdentity, MobileWalletProvider } from '@wallet-ui/react-native-kit'
import type { PropsWithChildren } from 'react'

import { ClusterProvider, useCluster } from '@/features/cluster/data-access/cluster-provider'

const identity: AppIdentity = { name: 'Anchor Counter' }
const queryClient = new QueryClient()

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <AppWalletProvider>
          <Slot />
        </AppWalletProvider>
      </ClusterProvider>
    </QueryClientProvider>
  )
}

function AppWalletProvider({ children }: PropsWithChildren) {
  const { cluster } = useCluster()

  return (
    <MobileWalletProvider cluster={cluster} identity={identity} key={cluster.id}>
      {children}
    </MobileWalletProvider>
  )
}
