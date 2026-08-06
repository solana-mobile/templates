import { Pressable, Text } from 'react-native'

export interface CounterUiButtonProps {
  disabled?: boolean
  label: string
  onPress: () => void
}

export function CounterUiButton({ disabled = false, label, onPress }: CounterUiButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`bg-blue-600 px-5 py-3 rounded-xl active:bg-blue-700 ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className="text-white font-bold">{label}</Text>
    </Pressable>
  )
}
