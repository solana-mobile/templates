import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { AppButton } from '../../components/app-button'
import { formatError } from '../../utils/format-error'
import { useFarmProgram } from './data-access/use-farm-program'
import { FarmUiEmpty } from './ui/farm-ui-empty'
import { FarmUiGame } from './ui/farm-ui-game'

export function FarmFeature() {
  const { farmQuery, harvestMutation, initializeFarmMutation } = useFarmProgram()
  const [gained, setGained] = useState<bigint | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
    }
  }, [])

  async function onHarvest() {
    try {
      const points = await harvestMutation.mutateAsync()
      setGained(points)
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
      toastTimer.current = setTimeout(() => setGained(null), 2_500)
    } catch {
      // The failure reason renders through harvestMutation.error.
    }
  }

  if (farmQuery.isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-black items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  // A failed fetch must not fall through to the empty state: the farm may
  // exist, and offering to create it again would just fail on-chain.
  if (farmQuery.isError) {
    return (
      <View className="flex-1 bg-white dark:bg-black items-center justify-center px-8 gap-4">
        <Text className="text-red-500 text-center">{formatError(farmQuery.error)}</Text>
        <AppButton label="Retry" onPress={() => void farmQuery.refetch()} />
      </View>
    )
  }

  const farm = farmQuery.data?.farm
  if (!farm) {
    return (
      <FarmUiEmpty
        error={initializeFarmMutation.error}
        isPending={initializeFarmMutation.isPending}
        onCreate={() => initializeFarmMutation.mutate()}
      />
    )
  }

  return (
    <FarmUiGame
      error={harvestMutation.error}
      farm={farm}
      gained={gained}
      isHarvesting={harvestMutation.isPending}
      onHarvest={() => void onHarvest()}
    />
  )
}
