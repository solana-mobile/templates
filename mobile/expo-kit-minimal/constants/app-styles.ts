import { Platform, StyleSheet } from 'react-native'

export const appStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d1d1',
    borderRadius: 2,
    borderWidth: 1,
    elevation: 1,
    padding: 4,
    // `elevation` is Android-only; give web cards the same subtle depth.
    ...Platform.select({ web: { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)' } }),
  },
  // Keeps the phone-width layout from stretching edge to edge on wide screens.
  content: {
    alignSelf: 'center',
    maxWidth: 600,
    width: '100%',
  },
  screen: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 8,
  },
  stack: {
    gap: 8,
  },
  textDanger: {
    color: '#b3261e',
  },
  textSuccess: {
    color: '#1b6b30',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
})
