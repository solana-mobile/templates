import { ScrollView, Text } from 'react-native'
import { AppButton } from '../../../components/app-button'
import { formatError } from '../../../utils/format-error'

// The farm has not been created yet: explain the one wallet approval the game
// needs and offer to create it.
export function FarmUiEmpty({
  error,
  isPending,
  onCreate,
}: {
  error: Error | null
  isPending: boolean
  onCreate: () => void
}) {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="items-center px-8 py-12 gap-4">
      <Text className="text-6xl">🌱</Text>
      <Text className="text-2xl font-bold text-gray-800 dark:text-white">Start your farm</Text>
      <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
        Creating the farm is the one transaction your wallet approves. It creates the farm account and moves 0.01 SOL of
        gas money to a player wallet generated on this device — from then on, harvesting and buying crops sign locally
        without any prompts.
      </Text>
      <AppButton
        disabled={isPending}
        label={isPending ? 'Waiting for wallet...' : 'Create Farm'}
        onPress={onCreate}
        variant="success"
      />
      {error ? <Text className="text-red-500 text-center">{formatError(error)}</Text> : null}
    </ScrollView>
  )
}
