import { useChat } from '@ai-sdk/react'
import { env } from '@repo/env/web'
import { DefaultChatTransport } from 'ai'

export function useAiChat() {
  return useChat({
    onError: (error) => console.error('[ai] chat error:', error),
    transport: new DefaultChatTransport({
      api: `${env.VITE_API_URL}/ai`,
    }),
  })
}
