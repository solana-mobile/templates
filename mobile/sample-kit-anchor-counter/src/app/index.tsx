import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useMobileWallet } from '@wallet-ui/react-native-kit'

import { useCluster } from '@/features/cluster/data-access/cluster-provider'
import { ClusterUiSwitcher } from '@/features/cluster/ui/cluster-ui-switcher'
import { CounterFeature } from '@/features/counter/counter-feature'
import { formatError } from '@/utils/format-error'

export default function App() {
  const { cluster } = useCluster()
  const { account, connect, disconnect } = useMobileWallet()
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // Wallet actions can be declined or fail. Run them here so a rejection never
  // escapes as an unhandled promise and the reason ends up on screen.
  async function run(action: () => Promise<unknown>) {
    if (isBusy) {
      return
    }
    setIsBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(formatError(e))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-black items-center justify-center px-8">
      {/* Heading */}
      <Text className="text-4xl font-extrabold text-gray-800 dark:text-white mb-3 tracking-tight">Anchor Counter</Text>

      {/* Subheading */}
      <Text className="text-base text-gray-700 dark:text-gray-300 mb-6 text-center leading-relaxed">
        A global counter on <Text className="font-semibold">{cluster.label}</Text>, read and incremented through a{' '}
        <Text className="text-blue-500 font-semibold">Codama-generated client</Text> for the Anchor program in{' '}
        <Text className="font-semibold">anchor/</Text>.
      </Text>

      <View className="mb-8">
        <ClusterUiSwitcher />
      </View>

      {/* Reading the counter needs no wallet — only the write buttons do. */}
      <CounterFeature />

      {account ? (
        <View className="items-center mt-8">
          <Text className="text-gray-600 dark:text-gray-400 mb-2">
            Connected: {account.address.toString().slice(0, 8)}...
          </Text>
          <Pressable
            disabled={isBusy}
            onPress={() => void run(disconnect)}
            className={`bg-red-500 px-6 py-3 rounded-xl active:bg-red-600 ${isBusy ? 'opacity-50' : ''}`}
          >
            <Text className="text-white font-bold">{isBusy ? 'Working...' : 'Disconnect Wallet'}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="items-center mt-8">
          <Pressable
            disabled={isBusy}
            onPress={() => void run(connect)}
            className={`bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700 ${isBusy ? 'opacity-50' : ''}`}
          >
            <Text className="text-white font-bold text-lg">{isBusy ? 'Working...' : 'Connect Wallet'}</Text>
          </Pressable>
        </View>
      )}
      {error ? <Text className="text-red-500 mt-3 text-center max-w-sm">{error}</Text> : null}

      <StatusBar style="auto" />
    </View>
  )
}
