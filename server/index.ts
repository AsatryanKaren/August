import 'dotenv/config'
import { serve } from '@hono/node-server'
import { app, prepare } from './app'
import { closeDb } from './db'

const port = Number(process.env.PORT || 8787)
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'

await prepare()

const server = serve({ fetch: app.fetch, port, hostname: host }, () => {
  console.log(`August API on http://${host}:${port}`)
})

async function shutdown() {
  server.close()
  await closeDb()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
