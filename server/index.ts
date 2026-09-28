import 'dotenv/config'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { serve } from '@hono/node-server'
import { Hono, type Context, type Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { clearSessionCookie, currentUser, ensureAdmin, login, logout, writeSessionCookie } from './auth'
import { closeDb, openDb } from './db'
import { normalizePhone } from '../src/phone'
import { addBreakfastCheck, breakfastCard, deleteBreakfastCheck, listBreakfastCards } from './breakfast'
import { listUploads, saveUpload, uploadPath } from './uploads'
import {
  createItem,
  createReservation,
  deleteItem,
  readMenu,
  resetMenu,
  seedIfEmpty,
  setReservationStatus,
  updateItem,
} from './store'
import { saveOffer } from './offer'
import { connectTelegram, notifyReservation, telegramWebhook } from './telegram'
import type { MenuItem, Offer } from '../src/types'

const app = new Hono()
const attempts = new Map<string, { count: number; resetAt: number }>()

function originAllowed(c: Context) {
  const origin = c.req.header('origin')
  if (!origin) return true
  const allowed = new Set(
    [process.env.APP_ORIGIN, 'http://127.0.0.1:5173', 'http://localhost:5173'].filter(
      (value): value is string => Boolean(value),
    ),
  )
  if (allowed.has(origin)) return true
  try {
    return new URL(origin).host === (c.req.header('host') ?? '')
  } catch {
    return false
  }
}

function tooMany(ip: string) {
  const now = Date.now()
  const current = attempts.get(ip)
  if (!current || current.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return false
  }
  current.count += 1
  return current.count > 30
}

async function requireAuth(c: Context, next: Next) {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'unauthorized' }, 401)
  await next()
}

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/telegram') return next()
  if (c.req.method === 'GET' || c.req.method === 'HEAD') return next()
  if (!originAllowed(c)) return c.json({ error: 'origin' }, 403)
  await next()
})

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/uploads/:name', (c) => {
  const file = uploadPath(c.req.param('name') ?? '')
  if (!file) return c.notFound()
  const type =
    file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  return c.body(readFileSync(file), 200, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
})

app.get('/api/uploads', requireAuth, (c) => c.json({ urls: listUploads() }))

app.post('/api/uploads', requireAuth, async (c) => {
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof Blob)) return c.json({ error: 'invalid' }, 400)
  const url = await saveUpload(file)
  if (!url) return c.json({ error: 'invalid' }, 400)
  return c.json({ url }, 201)
})

app.put('/api/offer', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<Offer> | null
  const offer = await saveOffer(body ?? {})
  if (!offer) return c.json({ error: 'invalid' }, 400)
  return c.json(offer)
})

app.get('/api/menu', async (c) => {
  const user = await currentUser(c)
  return c.json(await readMenu(Boolean(user)))
})

app.get('/api/me', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'unauthorized' }, 401)
  return c.json({ login: user.login })
})

app.post('/api/login', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (tooMany(ip)) return c.json({ error: 'invalid' }, 429)
  const body = (await c.req.json().catch(() => null)) as { login?: string; password?: string } | null
  const session = await login(String(body?.login ?? ''), String(body?.password ?? ''))
  if (!session) return c.json({ error: 'invalid' }, 401)
  writeSessionCookie(c, session.id)
  return c.json({ login: session.login })
})

app.post('/api/logout', async (c) => {
  await logout(getCookie(c, 'august_session'))
  clearSessionCookie(c)
  return c.json({ ok: true })
})

app.post('/api/items', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<MenuItem> | null
  const item = await createItem(body ?? {})
  if (!item) return c.json({ error: 'invalid' }, 400)
  return c.json(item, 201)
})

app.patch('/api/items/:id', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<MenuItem> | null
  const item = await updateItem(c.req.param('id') ?? '', body ?? {})
  if (!item) return c.json({ error: 'missing' }, 404)
  return c.json(item)
})

app.delete('/api/items/:id', requireAuth, async (c) => {
  const removed = await deleteItem(c.req.param('id') ?? '')
  if (!removed) return c.json({ error: 'missing' }, 404)
  return c.body(null, 204)
})

app.get('/api/breakfast', async (c) => {
  const card = await breakfastCard(c.req.query('phone') ?? '')
  if (!card) return c.json({ error: 'invalid' }, 400)
  return c.json(card)
})

app.post('/api/breakfast', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (tooMany(`breakfast:${ip}`)) return c.json({ error: 'invalid' }, 429)
  const body = await c.req.parseBody()
  const file = body.file
  const phone = String(body.phone ?? '')
  if (!(file instanceof Blob) || !normalizePhone(phone)) return c.json({ error: 'invalid' }, 400)
  const image = await saveUpload(file)
  if (!image) return c.json({ error: 'invalid' }, 400)
  const card = await addBreakfastCheck(phone, image)
  if (!card) return c.json({ error: 'invalid' }, 400)
  return c.json(card, 201)
})

app.get('/api/breakfast/admin', requireAuth, async (c) => {
  return c.json(await listBreakfastCards())
})

app.delete('/api/breakfast/:id', requireAuth, async (c) => {
  const removed = await deleteBreakfastCheck(c.req.param('id') ?? '')
  if (!removed) return c.json({ error: 'missing' }, 404)
  return c.body(null, 204)
})

app.post('/api/reservations', async (c) => {
  const body = await c.req.json().catch(() => null)
  const reservation = await createReservation(body ?? {})
  if (!reservation) return c.json({ error: 'invalid' }, 400)
  void notifyReservation(reservation)
  return c.json(reservation, 201)
})

app.post('/api/telegram', telegramWebhook)

app.patch('/api/reservations/:id', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as { status?: string } | null
  const reservation = await setReservationStatus(c.req.param('id') ?? '', body?.status)
  if (!reservation) return c.json({ error: 'missing' }, 404)
  return c.json(reservation)
})

app.post('/api/reset', requireAuth, async (c) => {
  await resetMenu()
  return c.json(await readMenu(true))
})

if (process.env.NODE_ENV === 'production') {
  const dist = join(process.cwd(), 'dist')
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
  }
  app.get('*', (c) => {
    const raw = c.req.path === '/' ? 'index.html' : c.req.path.replace(/^\/+/, '')
    const file = normalize(join(dist, raw))
    const safe = file.startsWith(dist) && existsSync(file) && statSync(file).isFile() ? file : join(dist, 'index.html')
    if (!existsSync(safe)) return c.text('August is not built yet', 404)
    const body = readFileSync(safe)
    return c.body(body, 200, { 'Content-Type': types[extname(safe)] ?? 'application/octet-stream' })
  })
}

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'failed' }, 500)
})

const port = Number(process.env.PORT || 8787)
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'

await openDb()
await seedIfEmpty()
await ensureAdmin()
await connectTelegram()

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
