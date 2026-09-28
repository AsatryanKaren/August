import type { Localized, Offer } from '../src/types'
import { query } from './db'

const blank: Localized = { hy: '', en: '', ru: '' }

function asJson<T>(value: T | string): T {
  return typeof value === 'string' ? (JSON.parse(value) as T) : value
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.slice(0, 800) : fallback
}

function localized(value: unknown): Localized {
  if (!value || typeof value !== 'object') return { ...blank }
  const source = value as Partial<Localized>
  return {
    hy: text(source.hy),
    en: text(source.en),
    ru: text(source.ru),
  }
}

function day(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function image(value: unknown) {
  if (typeof value !== 'string' || value.length > 500) return ''
  if (value === '') return ''
  if (value.startsWith('/uploads/') || value.startsWith('/photos/')) return value
  return ''
}

export function emptyOffer(): Offer {
  return { image: '', from: '', to: '', title: { ...blank }, description: { ...blank }, visible: false }
}

export async function readOffer(): Promise<Offer> {
  const rows = await query<{ data: Offer | string }>('SELECT data FROM settings WHERE id = $1', ['offer'])
  if (!rows[0]) return emptyOffer()
  const data = asJson(rows[0].data)
  return {
    image: image(data.image),
    from: day(data.from),
    to: day(data.to),
    title: localized(data.title),
    description: localized(data.description),
    visible: Boolean(data.visible),
  }
}

export async function saveOffer(body: Partial<Offer>): Promise<Offer | null> {
  const offer: Offer = {
    image: image(body.image),
    from: day(body.from),
    to: day(body.to),
    title: localized(body.title),
    description: localized(body.description),
    visible: Boolean(body.visible),
  }
  if (offer.from && offer.to && offer.from > offer.to) return null
  await query(
    `INSERT INTO settings (id, data) VALUES ('offer', $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = excluded.data`,
    [JSON.stringify(offer)],
  )
  return offer
}
