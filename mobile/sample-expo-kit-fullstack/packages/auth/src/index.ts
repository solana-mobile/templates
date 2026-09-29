import { expo } from '@better-auth/expo'
import { db } from '@repo/db'
import * as schema from '@repo/db/schema/auth'
import { env } from '@repo/env/api'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { siws } from 'better-auth-solana'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',

    schema: schema,
  }),
  trustedOrigins: [
    ...env.CORS_ORIGINS,
    ...(env.NODE_ENV === 'development'
      ? [
          'exp://',
          'exp://**',
          'sample-expo-kit-fullstack://**',
          'exp://192.168.*.*:*/**',
          'http://localhost:8081',
        ]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [
    expo(),
    siws({
      anonymous: true,
      domain: new URL(env.BETTER_AUTH_URL).hostname,
      emailDomainName: env.SOLANA_EMAIL_DOMAIN,
    }),
  ],
})
