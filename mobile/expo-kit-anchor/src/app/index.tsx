import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { HELLO_WORLD_PROGRAM_ADDRESS } from '@project/anchor'
import { AppAddressLink } from '../components/app-address-link'
import { CounterFeature } from '../features/counter/counter-feature'
import { NetworkUiSelect } from '../features/network/network-ui-select'
import { formatError } from '../utils/format-error'

export default function App() {
  const insets = useSafeAreaInsets()
  const { account, connect, disconnect } = useMobileWallet()
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (account) {
      console.log('Connected account:', account.address)
    }
  }, [account])

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
    // Anchor the content to the top so the layout stays put when content changes.
    <View
      className="flex-1 bg-white dark:bg-black items-center px-8"
      style={{ paddingBottom: insets.bottom, paddingTop: insets.top + 64 }}
    >
      {/* Heading */}
      <Text className="text-4xl font-extrabold text-gray-800 dark:text-white mb-3 tracking-tight">Expo Kit Anchor</Text>

      {/* Subheading */}
      <Text className="text-base text-gray-600 dark:text-gray-400 mb-8 text-center max-w-sm">
        Start customizing your app by editing{' '}
        <Text className="font-semibold text-gray-800 dark:text-white">src/app/index.tsx</Text>
      </Text>

      <View className="mb-4">
        <AppAddressLink address={HELLO_WORLD_PROGRAM_ADDRESS} label="Program" />
      </View>

      <View className="mb-8 items-center">
        {account ? (
          <View className="items-center">
            <View className="mb-2">
              <AppAddressLink address={account.address.toString()} label="Wallet" />
            </View>
            <Pressable
              disabled={isBusy}
              onPress={() => void run(disconnect)}
              className={`bg-red-500 px-6 py-3 rounded-xl active:bg-red-600 ${isBusy ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-bold">{isBusy ? 'Working...' : 'Disconnect Wallet'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={isBusy}
            onPress={() => void run(connect)}
            className={`bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700 ${isBusy ? 'opacity-50' : ''}`}
          >
            <Text className="text-white font-bold text-lg">{isBusy ? 'Working...' : 'Connect Wallet'}</Text>
          </Pressable>
        )}
        {error ? <Text className="text-red-500 mt-3 text-center max-w-sm">{error}</Text> : null}
        <View className="mt-4">
          <NetworkUiSelect />
        </View>
      </View>

      {account ? <CounterFeature /> : null}

      <StatusBar style="auto" />
    </View>
  )
}
