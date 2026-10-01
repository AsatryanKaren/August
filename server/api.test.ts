import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { app, prepare } from './app'
import { closeDb } from './db'

const home = process.cwd()
const dir = mkdtempSync(join(tmpdir(), 'august-test-'))
const PASSWORD = 'test-password'
// The smallest file the upload check accepts as a JPEG.
const receipt = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])

let session = ''

before(async () => {
  process.chdir(dir)
  delete process.env.DATABASE_URL
  delete process.env.TELEGRAM_BOT_TOKEN
  delete process.env.UPLOAD_DIR
  process.env.ADMIN_LOGIN = 'august'
  process.env.ADMIN_PASSWORD = PASSWORD
  await prepare()
})

after(async () => {
  await closeDb()
  process.chdir(home)
  rmSync(dir, { recursive: true, force: true })
})

function send(path: string, init: RequestInit = {}, asAdmin = false) {
  const headers = new Headers(init.headers)
  if (asAdmin) headers.set('cookie', `august_session=${session}`)
  return app.request(path, { ...init, headers })
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

function receiptForm(phone: string) {
  const form = new FormData()
  form.set('phone', phone)
  form.set('file', new Blob([receipt], { type: 'image/jpeg' }), 'receipt.jpg')
  return { method: 'POST', body: form }
}

test('the public menu is seeded and hides table requests', async () => {
  const res = await send('/api/menu')
  assert.equal(res.status, 200)
  const menu = await res.json()
  assert.ok(menu.categories.length > 0)
  assert.ok(menu.items.length > 0)
  assert.deepEqual(menu.reservations, [])
})

test('admin pages need a login, and a wrong password is refused', async () => {
  assert.equal((await send('/api/me')).status, 401)
  assert.equal((await send('/api/breakfast/admin')).status, 401)
  assert.equal((await send('/api/reset', { method: 'POST' })).status, 401)
  const wrong = await send('/api/login', json({ login: 'august', password: 'nope' }))
  assert.equal(wrong.status, 401)
})

test('the admin can log in', async () => {
  const res = await send('/api/login', json({ login: 'August', password: PASSWORD }))
  assert.equal(res.status, 200)
  const cookie = res.headers.get('set-cookie') ?? ''
  session = /august_session=([^;]+)/.exec(cookie)?.[1] ?? ''
  assert.ok(session, 'login sets the session cookie')
  const me = await send('/api/me', {}, true)
  assert.deepEqual(await me.json(), { login: 'august' })
})

test('a guest can book a table and the admin sees it', async () => {
  const missing = await send('/api/reservations', json({ name: 'Ani', phone: '', date: '', time: '' }))
  assert.equal(missing.status, 400)

  const res = await send(
    '/api/reservations',
    json({ name: 'Ani', phone: '+374 91 123456', date: '2026-10-10', time: '19:00', guests: 40 }),
  )
  assert.equal(res.status, 201)
  const reservation = await res.json()
  assert.equal(reservation.status, 'new')
  assert.equal(reservation.guests, 12, 'guests are capped at 12')

  const publicMenu = await (await send('/api/menu')).json()
  assert.deepEqual(publicMenu.reservations, [])
  const adminMenu = await (await send('/api/menu', {}, true)).json()
  assert.ok(adminMenu.reservations.some((row: { id: string }) => row.id === reservation.id))

  const update = await send(
    `/api/reservations/${reservation.id}`,
    { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) },
    true,
  )
  assert.equal(update.status, 200)
  assert.equal((await update.json()).status, 'confirmed')
})

test('requests from another site are refused', async () => {
  const res = await send('/api/reservations', {
    ...json({ name: 'Ani', phone: '091123456', date: '2026-10-10', time: '19:00' }),
    headers: { 'content-type': 'application/json', origin: 'https://evil.example', host: 'august.example' },
  })
  assert.equal(res.status, 403)
})

test('a full breakfast card waits for staff approval', async () => {
  assert.equal((await send('/api/breakfast?phone=12')).status, 400)

  const notImage = new FormData()
  notImage.set('phone', '091 123 456')
  notImage.set('file', new Blob(['hello'], { type: 'image/jpeg' }), 'receipt.jpg')
  assert.equal((await send('/api/breakfast', { method: 'POST', body: notImage })).status, 400)

  let card: { count: number; rewards: number; approved: number; pending: number } | null = null
  for (let i = 0; i < 10; i += 1) {
    const res = await send('/api/breakfast', receiptForm('091 123 456'))
    assert.equal(res.status, 201)
    card = await res.json()
  }
  assert.equal(card?.count, 10)
  assert.equal(card?.rewards, 1)
  assert.equal(card?.approved, 0)
  assert.equal(card?.pending, 1)

  // The same number written another way is the same card.
  const lookup = await (await send('/api/breakfast?phone=%2B37491123456')).json()
  assert.equal(lookup.count, 10)

  const approve = await send('/api/breakfast/approve', json({ phone: '091123456' }), true)
  assert.equal(approve.status, 200)
  const approved = await approve.json()
  assert.equal(approved.approved, 1)
  assert.equal(approved.pending, 0)

  const uploads = await (await send('/api/uploads', {}, true)).json()
  assert.deepEqual(uploads.urls, [], 'receipts stay out of the dish photo picker')
})

test('logging out ends the session', async () => {
  assert.equal((await send('/api/logout', { method: 'POST' }, true)).status, 200)
  assert.equal((await send('/api/me', {}, true)).status, 401)
})
