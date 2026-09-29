import { randomUUID } from 'node:crypto'
import { createSeed } from '../src/data/seed'
import type { CategoryId, Database, Localized, MenuItem, Reservation, ReservationStatus, Restaurant } from '../src/types'
import { query } from './db'
import { readOffer } from './offer'

type ItemRow = {
  id: string
  categoryId: string
  name: Localized | string
  description: Localized | string
  price: number
  priceLabel: string | null
  image: string
  available: boolean
  featured: boolean
}

const itemSelect = `SELECT id, category_id AS "categoryId", name, description, price,
  price_label AS "priceLabel", image, available, featured FROM items`

function asJson<T>(value: T | string): T {
  return typeof value === 'string' ? (JSON.parse(value) as T) : value
}

function toItem(row: ItemRow): MenuItem {
  const item: MenuItem = {
    id: row.id,
    categoryId: row.categoryId as CategoryId,
    name: asJson(row.name),
    description: asJson(row.description),
    price: Number(row.price) || 0,
    image: row.image ?? '',
    available: Boolean(row.available),
    featured: Boolean(row.featured),
  }
  if (row.priceLabel) item.priceLabel = row.priceLabel
  return item
}

async function writeSeed() {
  const seed = createSeed()
  await query('BEGIN')
  try {
    await query('DELETE FROM items')
    await query('DELETE FROM categories')
    await query('DELETE FROM reservations')
    await query(`DELETE FROM settings WHERE id NOT IN ('telegram', 'offer')`)
    for (const [sort, category] of seed.categories.entries()) {
      await query('INSERT INTO categories (id, name, sort) VALUES ($1, $2::jsonb, $3)', [
        category.id,
        JSON.stringify(category.name),
        sort,
      ])
    }
    for (const [sort, item] of seed.items.entries()) {
      await query(
        `INSERT INTO items
          (id, category_id, name, description, price, price_label, image, available, featured, sort)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
        [
          item.id,
          item.categoryId,
          JSON.stringify(item.name),
          JSON.stringify(item.description),
          item.price,
          item.priceLabel ?? null,
          item.image ?? '',
          item.available,
          item.featured,
          sort,
        ],
      )
    }
    await query('INSERT INTO settings (id, data) VALUES ($1, $2::jsonb)', [
      'restaurant',
      JSON.stringify(seed.restaurant),
    ])
    await query('COMMIT')
  } catch (error) {
    await query('ROLLBACK')
    throw error
  }
}

export async function seedIfEmpty() {
  const rows = await query<{ count: string }>('SELECT count(*)::text AS count FROM items')
  if (Number(rows[0]?.count ?? 0) > 0) return
  await writeSeed()
}

/** Fill Russian only where it still copies the English line. Edited Russian stays. */
export async function fillRussianFromSeed() {
  const seed = createSeed()
  for (const item of seed.items) {
    if (item.name.ru !== item.name.en) {
      await query(
        `UPDATE items SET name = jsonb_set(name, '{ru}', to_jsonb($2::text), true)
         WHERE id = $1 AND coalesce(name->>'ru', '') = coalesce(name->>'en', '')`,
        [item.id, item.name.ru],
      )
    }
    if (item.description.ru !== item.description.en) {
      await query(
        `UPDATE items SET description = jsonb_set(description, '{ru}', to_jsonb($2::text), true)
         WHERE id = $1 AND coalesce(description->>'ru', '') = coalesce(description->>'en', '')`,
        [item.id, item.description.ru],
      )
    }
  }
  for (const category of seed.categories) {
    if (category.name.ru === category.name.en) continue
    await query(
      `UPDATE categories SET name = jsonb_set(name, '{ru}', to_jsonb($2::text), true)
       WHERE id = $1 AND coalesce(name->>'ru', '') = coalesce(name->>'en', '')`,
      [category.id, category.name.ru],
    )
  }
}

/** The café details are not editable on the desk, so keep them in step with the seed copy. */
export async function syncRestaurantFromSeed() {
  await query(
    `INSERT INTO settings (id, data) VALUES ('restaurant', $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(createSeed().restaurant)],
  )
}

export async function resetMenu() {
  await writeSeed()
}

export async function readMenu(includeReservations: boolean): Promise<Database> {
  const categories = await query<{ id: CategoryId; name: Localized | string }>(
    'SELECT id, name FROM categories ORDER BY sort',
  )
  const items = await query<ItemRow>(`${itemSelect} ORDER BY sort`)
  const settings = await query<{ data: Restaurant | string }>('SELECT data FROM settings WHERE id = $1', [
    'restaurant',
  ])
  const restaurant = settings[0] ? asJson(settings[0].data) : createSeed().restaurant
  const reservations = includeReservations
    ? await query<Reservation>(
        `SELECT id, name, phone, date, time, guests, note, status, created_at AS "createdAt"
         FROM reservations ORDER BY created_at DESC`,
      )
    : []
  return {
    restaurant,
    categories: categories.map((category) => ({ id: category.id, name: asJson(category.name) })),
    items: items.map(toItem),
    reservations: reservations.map((row) => ({ ...row, guests: Number(row.guests) || 0 })),
    offer: await readOffer(),
  }
}

async function categoryExists(id: string) {
  const rows = await query('SELECT id FROM categories WHERE id = $1', [id])
  return rows.length > 0
}

function localized(value: unknown, fallback: Localized): Localized {
  if (!value || typeof value !== 'object') return fallback
  const source = value as Partial<Localized>
  return {
    hy: typeof source.hy === 'string' ? source.hy : fallback.hy,
    en: typeof source.en === 'string' ? source.en : fallback.en,
    ru: typeof source.ru === 'string' ? source.ru : fallback.ru,
  }
}

/** Dish photos come from the admin uploads or the house gallery. */
function imageOf(value: unknown, fallback = '') {
  if (typeof value !== 'string' || value.length > 500) return fallback
  if (value === '' || value.startsWith('/uploads/') || value.startsWith('/photos/')) return value
  return fallback
}

function labelOf(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : ''
}

function priceOf(value: unknown, fallback = 0) {
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) return fallback
  return Math.round(price)
}

export async function createItem(body: Partial<MenuItem>): Promise<MenuItem | null> {
  if (!body.categoryId || !(await categoryExists(body.categoryId))) return null
  const blank: Localized = { hy: '', en: '', ru: '' }
  const item: MenuItem = {
    id: randomUUID(),
    categoryId: body.categoryId,
    name: localized(body.name, blank),
    description: localized(body.description, blank),
    price: priceOf(body.price),
    image: imageOf(body.image),
    available: body.available !== false,
    featured: Boolean(body.featured),
  }
  if (labelOf(body.priceLabel)) item.priceLabel = labelOf(body.priceLabel)
  const sortRow = await query<{ next: number }>('SELECT coalesce(max(sort), 0) + 1 AS next FROM items')
  await query(
    `INSERT INTO items
      (id, category_id, name, description, price, price_label, image, available, featured, sort)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
    [
      item.id,
      item.categoryId,
      JSON.stringify(item.name),
      JSON.stringify(item.description),
      item.price,
      item.priceLabel ?? null,
      item.image,
      item.available,
      item.featured,
      Number(sortRow[0]?.next ?? 1),
    ],
  )
  return item
}

export async function updateItem(id: string, patch: Partial<MenuItem>): Promise<MenuItem | null> {
  const rows = await query<ItemRow>(`${itemSelect} WHERE id = $1`, [id])
  if (!rows[0]) return null
  if (patch.categoryId && !(await categoryExists(patch.categoryId))) return null
  const current = toItem(rows[0])
  const next: MenuItem = {
    ...current,
    id: current.id,
    categoryId: patch.categoryId ?? current.categoryId,
    name: patch.name ? localized(patch.name, current.name) : current.name,
    description: patch.description ? localized(patch.description, current.description) : current.description,
    price: patch.price === undefined ? current.price : priceOf(patch.price, current.price),
    image: patch.image === undefined ? current.image : imageOf(patch.image, current.image),
    available: patch.available === undefined ? current.available : Boolean(patch.available),
    featured: patch.featured === undefined ? current.featured : Boolean(patch.featured),
  }
  if (patch.priceLabel === undefined) next.priceLabel = current.priceLabel
  else if (!labelOf(patch.priceLabel)) delete next.priceLabel
  else next.priceLabel = labelOf(patch.priceLabel)

  await query(
    `UPDATE items SET category_id = $2, name = $3::jsonb, description = $4::jsonb, price = $5,
      price_label = $6, image = $7, available = $8, featured = $9 WHERE id = $1`,
    [
      next.id,
      next.categoryId,
      JSON.stringify(next.name),
      JSON.stringify(next.description),
      next.price,
      next.priceLabel ?? null,
      next.image,
      next.available,
      next.featured,
    ],
  )
  return next
}

export async function deleteItem(id: string) {
  const rows = await query<{ id: string }>('DELETE FROM items WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}

const statuses = new Set<ReservationStatus>(['new', 'confirmed', 'declined'])

export async function createReservation(body: Partial<Reservation>): Promise<Reservation | null> {
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const date = String(body.date ?? '').trim()
  const time = String(body.time ?? '').trim()
  if (!name || !phone || !date || !time) return null
  const guests = Number(body.guests)
  const reservation: Reservation = {
    id: randomUUID(),
    name: name.slice(0, 120),
    phone: phone.slice(0, 40),
    date: date.slice(0, 40),
    time: time.slice(0, 40),
    guests: Number.isFinite(guests) ? Math.min(12, Math.max(1, Math.round(guests))) : 2,
    note: String(body.note ?? '').trim().slice(0, 500),
    status: 'new',
    createdAt: new Date().toISOString(),
  }
  await query(
    `INSERT INTO reservations (id, name, phone, date, time, guests, note, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      reservation.id,
      reservation.name,
      reservation.phone,
      reservation.date,
      reservation.time,
      reservation.guests,
      reservation.note,
      reservation.status,
      reservation.createdAt,
    ],
  )
  return reservation
}

export async function setReservationStatus(id: string, status: unknown): Promise<Reservation | null> {
  if (typeof status !== 'string' || !statuses.has(status as ReservationStatus)) return null
  const rows = await query<Reservation>(
    `UPDATE reservations SET status = $2
     WHERE id = $1
     RETURNING id, name, phone, date, time, guests, note, status, created_at AS "createdAt"`,
    [id, status],
  )
  const row = rows[0]
  if (!row) return null
  return { ...row, guests: Number(row.guests) || 0 }
}
