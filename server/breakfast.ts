import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { breakfastProgress, formatPhone, normalizePhone } from '../src/phone'
import type { BreakfastCard, BreakfastCheck, BreakfastSummary } from '../src/types'
import { query } from './db'
import { uploadPath } from './uploads'

type CheckRow = { id: string; image: string; createdAt: string }

async function checksFor(phone: string): Promise<BreakfastCheck[]> {
  const rows = await query<CheckRow>(
    `SELECT id, image, created_at AS "createdAt"
     FROM breakfast_checks WHERE phone = $1 ORDER BY created_at DESC`,
    [phone],
  )
  return rows
}

function card(phone: string, checks: BreakfastCheck[]): BreakfastCard {
  return { phone, label: formatPhone(phone), ...breakfastProgress(checks.length), checks }
}

export async function breakfastCard(rawPhone: string): Promise<BreakfastCard | null> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return null
  return card(phone, await checksFor(phone))
}

export async function addBreakfastCheck(rawPhone: string, image: string): Promise<BreakfastCard | null> {
  const phone = normalizePhone(rawPhone)
  if (!phone || !image.startsWith('/uploads/')) return null
  await query(
    `INSERT INTO breakfast_checks (id, phone, image, created_at) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), phone, image, new Date().toISOString()],
  )
  return card(phone, await checksFor(phone))
}

export async function listBreakfastCards(): Promise<BreakfastSummary[]> {
  const rows = await query<{ phone: string; count: string; latest: string }>(
    `SELECT phone, count(*)::text AS count, max(created_at) AS latest
     FROM breakfast_checks GROUP BY phone ORDER BY count(*) DESC, max(created_at) DESC`,
  )
  return rows.map((row) => {
    const count = Number(row.count) || 0
    return { phone: row.phone, label: formatPhone(row.phone), latest: row.latest, ...breakfastProgress(count) }
  })
}

export async function deleteBreakfastCheck(id: string) {
  const rows = await query<{ image: string }>(
    'DELETE FROM breakfast_checks WHERE id = $1 RETURNING image',
    [id],
  )
  const image = rows[0]?.image ?? ''
  const name = image.replace(/^\/uploads\//, '')
  const file = name ? uploadPath(name) : null
  if (file) {
    try {
      unlinkSync(file)
    } catch {
      /* the row is already gone */
    }
  }
  return rows.length > 0
}
