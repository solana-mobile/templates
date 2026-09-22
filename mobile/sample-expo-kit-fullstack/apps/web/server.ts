import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

type ServerEntry = {
  fetch: (request: Request) => Response | Promise<Response>
}

const port = Number(process.env.PORT ?? 3001)
const rootDir = process.cwd()
const webRoot = existsSync(join(rootDir, 'dist'))
  ? rootDir
  : join(rootDir, 'apps', 'web')
const clientDir = join(webRoot, 'dist', 'client')
const serverDir = join(webRoot, 'dist', 'server')

const assetCache = new Map<string, { content: Uint8Array; type: string }>()
const maxPreloadSizeBytes = Number(
  process.env.STATIC_PRELOAD_MAX_BYTES ?? 5 * 1024 * 1024,
)

const getContentType = (path: string) => {
  if (path.endsWith('.js')) return 'text/javascript'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.ico')) return 'image/x-icon'
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

const safeJoin = (base: string, target: string) => {
  const normalized = target.replace(/^\/+/, '')
  return join(base, normalized)
}

const maybePreload = async (path: string, filePath: string) => {
  if (assetCache.has(path)) return
  if (!existsSync(filePath)) return
  const stats = statSync(filePath)
  if (!stats.isFile()) return
  if (stats.size > maxPreloadSizeBytes) return
  const file = Bun.file(filePath)
  const content = new Uint8Array(await file.arrayBuffer())
  assetCache.set(path, { content, type: getContentType(filePath) })
}

const preloadStaticAssets = async () => {
  const manifestPath = join(clientDir, 'manifest.json')
  if (!existsSync(manifestPath)) return
  const manifestBuffer = await Bun.file(manifestPath).arrayBuffer()
  const manifest = JSON.parse(
    new TextDecoder().decode(manifestBuffer),
  ) as Record<string, { file?: string; css?: string[]; assets?: string[] }>

  for (const entry of Object.values(manifest)) {
    const files = [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]
    for (const file of files) {
      if (!file) continue
      const publicPath = `/${file}`
      const filePath = safeJoin(clientDir, file)
      await maybePreload(publicPath, filePath)
    }
  }
}

const loadServerEntry = async (): Promise<ServerEntry> => {
  const candidates = [
    join(serverDir, 'entry-server.js'),
    join(serverDir, 'entry-server.mjs'),
    join(serverDir, 'server.js'),
    join(serverDir, 'server.mjs'),
    join(serverDir, 'index.js'),
    join(serverDir, 'index.mjs'),
  ]

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const mod = await import(pathToFileURL(candidate).href)
    if (mod?.default?.fetch) return mod.default as ServerEntry
    if (mod?.fetch) return mod as ServerEntry
  }

  throw new Error(
    'Unable to locate the server entry. Build the app first with `bun run build`.',
  )
}

const main = async () => {
  await preloadStaticAssets()
  const serverEntry = await loadServerEntry()

  Bun.serve({
    port,
    async fetch(request: Request) {
      const url = new URL(request.url)
      const pathname = url.pathname

      if (pathname.startsWith('/assets/')) {
        const cached = assetCache.get(pathname)
        if (cached) {
          return new Response(cached.content as BodyInit, {
            headers: {
              'content-type': cached.type,
              'cache-control': 'public, max-age=31536000, immutable',
            },
          })
        }

        const filePath = safeJoin(clientDir, pathname)
        if (existsSync(filePath)) {
          const file = Bun.file(filePath)
          return new Response(file, {
            headers: {
              'content-type': getContentType(filePath),
              'cache-control': 'public, max-age=31536000, immutable',
            },
          })
        }
      }

      if (pathname.includes('.')) {
        const filePath = safeJoin(clientDir, pathname)
        if (existsSync(filePath)) {
          const file = Bun.file(filePath)
          return new Response(file, {
            headers: {
              'content-type': getContentType(filePath),
              'cache-control': 'public, max-age=31536000, immutable',
            },
          })
        }
      }

      return serverEntry.fetch(request)
    },
  })

  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${port}`)
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
