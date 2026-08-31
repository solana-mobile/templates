import { Currency } from '@project/anchor'
import type { Address } from '@solana/kit'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { AppButton } from '../../../components/app-button'
import { AppKeyboardView } from '../../../components/app-keyboard-view'
import { AppTextInput } from '../../../components/app-text-input'
import { useFriendsQuery } from '../../../features/friends/data-access/use-friends'
import { usePotProgram } from '../../../features/pots/data-access/use-pot-program'
import { POT_CATEGORIES } from '../../../features/pots/pot-category'
import { useSolPriceQuery } from '../../../features/price/data-access/use-sol-price-query'
import { parseAmountInput, solToLamports } from '../../../utils/currency'
import { ellipsify } from '../../../utils/ellipsify'
import { formatError } from '../../../utils/format-error'

export default function CreatePotScreen() {
  const router = useRouter()
  const friendsQuery = useFriendsQuery()
  const solPriceQuery = useSolPriceQuery()
  const { createPotMutation } = usePotProgram()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(POT_CATEGORIES[0].category)
  const [currency, setCurrency] = useState(Currency.Sol)
  const [target, setTarget] = useState('')
  const [unlockDays, setUnlockDays] = useState('30')
  const [signersRequired, setSignersRequired] = useState('1')
  const [contributors, setContributors] = useState<Address[]>([])
  const [error, setError] = useState<string | null>(null)
  // Captured once on mount; only used to preview the unlock date.
  const [now] = useState(() => Date.now())

  const targetAmount = parseAmountInput(target)
  // Amounts on chain are always SOL. A USD target is converted at the current
  // rate when the pot is created.
  const targetSol = currency === Currency.Usd && targetAmount ? targetAmount / (solPriceQuery.data ?? 0) : targetAmount
  const days = Number.parseInt(unlockDays, 10)
  const signers = Number.parseInt(signersRequired, 10)
  const unlockDate = new Date(now + (Number.isFinite(days) ? days : 0) * 86_400_000)
  const isValid =
    name.trim().length > 0 &&
    name.trim().length <= 32 &&
    description.length <= 200 &&
    !!targetSol &&
    Number.isFinite(targetSol) &&
    targetSol > 0 &&
    Number.isInteger(days) &&
    days >= 0 &&
    Number.isInteger(signers) &&
    signers > 0 &&
    signers <= contributors.length + 1

  function toggleContributor(address: Address) {
    setContributors((current) =>
      current.includes(address) ? current.filter((entry) => entry !== address) : [...current, address],
    )
  }

  function onCreate() {
    if (!isValid || !targetSol) {
      return
    }
    setError(null)
    createPotMutation.mutate(
      {
        category,
        contributors,
        currency,
        description: description.trim(),
        name: name.trim(),
        signersRequired: signers,
        targetAmount: solToLamports(targetSol),
        unlockDays: BigInt(days),
      },
      {
        onError: (mutationError) => setError(formatError(mutationError)),
        onSuccess: ({ pot }) => router.replace({ params: { pot }, pathname: '/(tabs)/pots/[pot]' }),
      },
    )
  }

  return (
    <AppKeyboardView>
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerClassName="gap-4 p-4 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        <AppTextInput label="Name" onChangeText={setName} placeholder="Vacation Fund" value={name} />
        <AppTextInput
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="What are you saving for?"
          value={description}
        />

        <View>
          <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {POT_CATEGORIES.map((entry) => {
              const isSelected = entry.category === category
              return (
                <Pressable
                  key={entry.label}
                  onPress={() => setCategory(entry.category)}
                  className={`px-4 py-2 rounded-full border ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <Text className={isSelected ? 'text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                    {entry.emoji} {entry.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Display currency</Text>
          <View className="flex-row gap-2">
            {[
              { label: 'SOL', value: Currency.Sol },
              { label: 'USD', value: Currency.Usd },
            ].map((entry) => {
              const isSelected = entry.value === currency
              return (
                <Pressable
                  key={entry.label}
                  onPress={() => setCurrency(entry.value)}
                  className={`px-4 py-2 rounded-full border ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <Text className={isSelected ? 'text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                    {entry.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Contributions always move SOL on chain; USD only changes how amounts are shown.
          </Text>
        </View>

        <View className="gap-1">
          <AppTextInput
            keyboardType="decimal-pad"
            label={`Target amount (${currency === Currency.Usd ? 'USD' : 'SOL'})`}
            onChangeText={setTarget}
            placeholder={currency === Currency.Usd ? '100' : '1.5'}
            value={target}
          />
          {currency === Currency.Usd && targetSol && Number.isFinite(targetSol) ? (
            <Text className="text-xs text-gray-500 dark:text-gray-500">≈ {targetSol.toFixed(4)} SOL</Text>
          ) : null}
        </View>

        <View className="gap-1">
          <AppTextInput
            keyboardType="number-pad"
            label="Unlock in (days)"
            onChangeText={setUnlockDays}
            placeholder="30"
            value={unlockDays}
          />
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            The pot stays locked until {unlockDate.toLocaleDateString()}. The unlock time is set by the cluster clock
            when the pot is created.
          </Text>
        </View>

        <AppTextInput
          keyboardType="number-pad"
          label="Signatures required to release"
          onChangeText={setSignersRequired}
          placeholder="1"
          value={signersRequired}
        />

        <View>
          <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Contributors</Text>
          {friendsQuery.data?.length ? (
            <View className="flex-row flex-wrap gap-2">
              {friendsQuery.data.map((friend) => {
                const isSelected = contributors.includes(friend.address)
                return (
                  <Pressable
                    key={friend.address}
                    onPress={() => toggleContributor(friend.address)}
                    className={`px-4 py-2 rounded-full border ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Text className={isSelected ? 'text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                      {friend.displayName ?? friend.domain ?? ellipsify(friend.address)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <Text className="text-gray-500 dark:text-gray-500">
              You are the first contributor. Add friends in the Friends tab to invite them here.
            </Text>
          )}
        </View>

        <AppButton
          disabled={!isValid || createPotMutation.isPending}
          label={createPotMutation.isPending ? 'Working...' : 'Create Pot'}
          onPress={onCreate}
        />
        {error ? <Text className="text-red-500 text-center">{error}</Text> : null}
      </ScrollView>
    </AppKeyboardView>
  )
}
