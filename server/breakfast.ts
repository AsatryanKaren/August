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

async function approvedFor(phone: string) {
  const rows = await query<{ rewards: number }>('SELECT rewards FROM breakfast_approvals WHERE phone = $1', [phone])
  return Number(rows[0]?.rewards ?? 0) || 0
}

/** A free breakfast counts only after staff have checked the receipts on the admin desk. */
function review(rewards: number, approvedRewards: number) {
  const approved = Math.min(approvedRewards, rewards)
  return { approved, pending: rewards - approved }
}

async function card(phone: string, checks: BreakfastCheck[]): Promise<BreakfastCard> {
  const progress = breakfastProgress(checks.length)
  return {
    phone,
    label: formatPhone(phone),
    ...progress,
    ...review(progress.rewards, await approvedFor(phone)),
    checks,
  }
}

export async function breakfastCard(rawPhone: string): Promise<BreakfastCard | null> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return null
  return card(phone, await checksFor(phone))
}

export async function approveBreakfast(rawPhone: string): Promise<BreakfastCard | null> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return null
  const checks = await checksFor(phone)
  const { rewards } = breakfastProgress(checks.length)
  await query(
    `INSERT INTO breakfast_approvals (phone, rewards, approved_at) VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE SET rewards = EXCLUDED.rewards, approved_at = EXCLUDED.approved_at`,
    [phone, rewards, new Date().toISOString()],
  )
  return card(phone, checks)
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
  const rows = await query<{ phone: string; count: string; latest: string; approved: number | null }>(
    `SELECT checks.phone, count(*)::text AS count, max(checks.created_at) AS latest,
       max(approvals.rewards) AS approved
     FROM breakfast_checks checks
     LEFT JOIN breakfast_approvals approvals ON approvals.phone = checks.phone
     GROUP BY checks.phone ORDER BY count(*) DESC, max(checks.created_at) DESC`,
  )
  const cards = rows.map((row) => {
    const progress = breakfastProgress(Number(row.count) || 0)
    return {
      phone: row.phone,
      label: formatPhone(row.phone),
      latest: row.latest,
      ...progress,
      ...review(progress.rewards, Number(row.approved) || 0),
    }
  })
  // Cards waiting for review come first; the rest keep their order.
  return [...cards.filter((row) => row.pending > 0), ...cards.filter((row) => row.pending === 0)]
}

export async function breakfastImages() {
  const rows = await query<{ image: string }>('SELECT image FROM breakfast_checks')
  return rows.map((row) => row.image)
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
