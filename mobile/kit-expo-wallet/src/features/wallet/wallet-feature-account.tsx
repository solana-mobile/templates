import Ionicons from '@expo/vector-icons/Ionicons'
import { Account } from '@wallet-ui/react-native-kit'
import { Card } from 'heroui-native/card'
import { Pressable, View } from 'react-native'

import { useTheme } from '@/features/shell/data-access/use-theme'

export function WalletFeatureAccount({ account, disconnect }: { account: Account; disconnect: () => Promise<void> }) {
  const label = account.label ?? 'Mobile wallet'
  const { tintColor } = useTheme()

  return (
    <Card className="gap-2 p-5">
      <View className="flex-row items-center gap-2">
        <Ionicons color={tintColor} name="wallet-outline" size={22} />
        <Card.Title className="flex-1 text-xl font-bold">{label}</Card.Title>
        <Pressable
          accessibilityLabel="Disconnect wallet"
          accessibilityRole="button"
          className="items-center justify-center rounded-full"
          onPress={disconnect}
        >
          <Ionicons color={tintColor} name="power" size={18} />
        </Pressable>
      </View>
      <Card.Description className="leading-relaxed">{account.address.toString()}</Card.Description>
    </Card>
  )
}
