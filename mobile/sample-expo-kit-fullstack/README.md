# sample-expo-kit-fullstack

This is a reference sample, not a template: read it, run it, copy the parts you need. It is a full-stack Solana app —
an Expo mobile app, a TanStack Start web app, and a Hono API sharing one database, one auth layer, and one Solana
client across a Turborepo monorepo.

> [!IMPORTANT]
> This sample is Bun-only. Use Bun to install dependencies and run project commands; npm, pnpm, and Yarn are not
> supported.

## What's Included

- **Backend** — Hono API with oRPC for type-safe APIs
- **Mobile App** — React Native with Expo, wallet integration via Mobile Wallet Adapter
- **Web App** — React with TanStack Start for SSR
- **Database** — SQLite/Turso with Drizzle ORM
- **Auth** — Better-Auth with Sign in with Solana
- **AI Chat** — Optional Google Gemini integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Mobile | React Native, Expo |
| Web | React, TanStack Start |
| API | Hono, oRPC |
| Database | SQLite/Turso, Drizzle |
| Solana | @solana/kit 8 with @solana/kit-plugin-rpc, @solana/kit-plugin-wallet, and @solana/react on web; @wallet-ui/react-native-kit on mobile |
| Styling | TailwindCSS, heroui-native |
| Monorepo | Turborepo |

## Prerequisites

- [Bun](https://bun.sh) 1.4 or newer
- [Turso CLI](https://docs.turso.tech/cli/installation) (for local database)
- Android Studio with an emulator, or a physical Android device

## Getting Started

```bash
# Create the app and install dependencies
bun x solana-mobile@latest create my-app -t sample-expo-kit-fullstack
```

The generator installs dependencies, copies the environment examples, generates a local Better Auth secret, and
installs the agent skills listed below. Now, continue to [1. Set Up the Database](#1-set-up-the-database).

### 1. Set Up the Database

Start a local libSQL database:

```bash
bun run db:local
```

This starts a libSQL server on port 8080 using the [Turso CLI](https://docs.turso.tech/cli/installation).

Alternatively, if you prefer Docker:

```bash
docker run --rm -p 8080:8080 ghcr.io/tursodatabase/libsql-server:latest
```

Push the schema:

```bash
bun run db:push
```

### 2. Start the apps

#### Start the API

```bash
bun run dev:api
```

This starts the API at http://localhost:3000

#### Start the Web App

```bash
bun run dev:web
```

This starts the Web app at http://localhost:3001

### 3. Build and Run the Mobile App

The mobile app requires a native build (it won't run in Expo Go due to native dependencies).

In a separate terminal:

```bash
bun run dev:mobile
```

This builds the app and installs it on your connected device or emulator. Subsequent runs will be faster as they use the cached build.

## Wallet Support

The app uses Mobile Wallet Adapter to connect to Solana wallets. Supported wallets include:

- **Seeker Wallet** (built-in on Solana Seeker devices)
- Phantom
- Solflare
- Backpack

Unsupported mobile wallets:
- Jupiter

On the emulator, install a wallet app from the Play Store to test wallet connections.

Wallet signing and transaction examples only run after an explicit action in the app and approval in the connected wallet. The installed agent skills do not receive wallet keys or permission to sign or submit transactions. Disconnect the wallet or remove the app connection in the wallet to revoke access.

## Project Structure

```
sample-expo-kit-fullstack/
├── apps/
│   ├── api/         # API (Hono, oRPC)
│   ├── mobile/      # Mobile app (React Native, Expo)
│   └── web/         # Web app (React, TanStack Start)
├── packages/
│   ├── api/         # Shared API routes and business logic
│   ├── auth/        # Authentication configuration
│   ├── config/      # Shared TypeScript configuration
│   ├── db/          # Database schema and queries
│   ├── env/         # Environment variable validation
│   └── solana-client/  # Solana RPC client utilities
```

Everything under `packages/` is an internal package published to the workspace under the `@repo` scope — `@repo/db`,
`@repo/env`, and so on. The scope is deliberately generic so renaming the project never rewrites an import.

`@repo/solana-client` is the API's client and is read-only: it installs `rpc` and `rpcSubscriptions` from
`SOLANA_ENDPOINT` and nothing else, so the server can never sign or submit. The web app builds its own client per
cluster in `apps/web/src/features/solana/data-access/create-solana-client.ts`, where `@solana/kit-plugin-wallet`
supplies the payer and `@solana/react` publishes the client to the tree.

## Environment Variables

Edit `apps/api/.env` to configure the API:

| Variable                       | Description | Default                         |
|--------------------------------|-------------|---------------------------------|
| `BETTER_AUTH_SECRET`           | Auth secret (min 32 chars). Generate with `openssl rand -hex 32` | —                               |
| `BETTER_AUTH_URL`              | API URL for auth callbacks | `http://localhost:3000`         |
| `CORS_ORIGINS`                 | Comma-separated list of allowed origins for CORS | `http://localhost:3001,sample-expo-kit-fullstack://`        |
| `DATABASE_URL`                 | Database connection URL | `http://localhost:8080`         |
| `DATABASE_AUTH_TOKEN`          | Database auth token | `local`                         |
| `SOLANA_ENDPOINT`              | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_EMAIL_DOMAIN`          | Default domain for generated emails | `example.com`                   |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional. Enables AI chat feature | —                               |

## Enabling AI Chat (Optional)

The app includes an AI chat feature powered by Google Gemini. To enable it:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key and add it to `apps/api/.env`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
   ```
4. Restart the API

## Deployment

The project includes a `docker-compose.yml` for containerized deployment. It runs the database, api, and web app together with no ports exposed on the database.

### Deploy on Dokploy

1. Create a new **Compose** project pointing to your fork
2. Set the compose path to `./docker-compose.yml`
3. Configure environment variables and domains in Dokploy
4. Deploy

### Deploy with Docker Compose

1. Create a `.env` file in the project root with your production values (see [Environment Variables](#environment-variables) for a full list).
2. Add the following deployment-specific variables to your `.env` file:
   ```dotenv
   BETTER_AUTH_SECRET=<your-secret>
   BETTER_AUTH_URL=https://your-api-domain.com
   CORS_ORIGINS=https://your-web-domain.com
   VITE_API_URL=https://your-api-domain.com
   ```
3. Run:
   ```bash
   docker compose up -d --build
   ```

The compose file uses sensible defaults for all variables. For reverse proxy setups, point your domains to the exposed ports (`API_PORT` defaults to 3000, `WEB_PORT` defaults to 3001).

## Available Scripts

From the project root:

| Command | Description |
|---------|-------------|
| `bun rename <name>` | Rename the project across all files |
| `bun run build` | Build all apps |
| `bun run check-types` | TypeScript type checking |
| `bun run clean` | Remove generated build, cache, dependency, and mobile native directories |
| `bun run db:local` | Start local database (Turso dev server on port 8080) |
| `bun run db:push` | Push schema to the database |
| `bun run db:studio` | Open database UI |
| `bun run dev:api` | Start the API |
| `bun run dev:mobile` | Start the mobile app dev server |
| `bun run dev:web` | Start the web app |
| `bun run lint` | Run linting and formatting checks |
| `bun run lint:fix` | Fix linting and formatting issues |

## Agent Skills

Scaffolding this sample installs a set of [agent skills](https://skills.sh) for the stack it is built on, so a coding
agent reads the current documentation for each library instead of guessing from its training data:

| Skill | Source |
|-------|--------|
| `ai-sdk` | [vercel/ai](https://github.com/vercel/ai/tree/main/skills/use-ai-sdk) |
| `better-auth-best-practices` | [better-auth/skills](https://github.com/better-auth/skills/tree/main/better-auth/best-practices) |
| `heroui-native` | [heroui-inc/heroui](https://github.com/heroui-inc/heroui/tree/v3/skills/heroui-native) |
| `hono` | [honojs/skills](https://github.com/honojs/skills/tree/main/skills/hono) |
| `solana-dev` | [solana-foundation/solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill) |
| `solana-mobile-dev` | [solana-mobile/solana-mobile-dev-skill](https://github.com/solana-mobile/solana-mobile-dev-skill) |
| `turborepo` | [vercel/turborepo](https://github.com/vercel/turborepo/tree/main/skills/turborepo) |
| `vercel-composition-patterns` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) |
| `vercel-react-native-skills` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills) |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) |

The skills are instructions and reference documentation only. They carry no credentials, receive no wallet keys, and
grant no permission to sign or submit transactions. Add or remove one with the [`skills`](https://skills.sh) CLI:

```bash
bun x skills add https://github.com/vercel/turborepo/tree/main/skills/turborepo
bun x skills remove turborepo
```

## Troubleshooting

### Mobile app can't reach the API

The mobile app logs `API URL` on startup. If that URL is wrong or unreachable from your Android device or emulator, set `EXPO_PUBLIC_API_URL=http://<your-mac-lan-ip>:3000` in `apps/mobile/.env` and restart the app.

### Mobile app won't start

Make sure you've run `bun run dev:mobile` at least once to create the native build. The app requires native modules that aren't available in Expo Go.

### Wallet not connecting

- Ensure you have a compatible wallet app installed on your device/emulator
- Check that the wallet app is up to date
- On emulator, you may need to install a wallet from the Play Store

### Database connection errors

- Verify the database is running: `bun run db:local`
- Ensure `DATABASE_URL` in `.env` matches your setup (default: `http://localhost:8080`)

## License

Apache-2.0
