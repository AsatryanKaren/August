import { createSeed } from '../data/seed'
import type { Database } from '../types'

const KEY = 'august-cafeteria-db-v2'

const officialSocials = [
  { label: 'Facebook', href: 'https://www.facebook.com/augustcafeyerevan' },
  { label: 'Instagram', href: 'https://www.instagram.com/augustcafeteria/' },
]

function withOfficialSocials(db: Database): Database {
  const current = db.restaurant.socials ?? []
  const hrefs = new Set(current.map((link) => link.href.replace(/\/$/, '')))
  const missing = officialSocials.filter((link) => !hrefs.has(link.href.replace(/\/$/, '')))
  if (missing.length === 0) return db
  const next: Database = {
    ...db,
    restaurant: { ...db.restaurant, socials: [...current, ...missing] },
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function readDb(): Database {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    const seed = createSeed()
    localStorage.setItem(KEY, JSON.stringify(seed))
    return seed
  }
  try {
    return withOfficialSocials(JSON.parse(raw) as Database)
  } catch {
    const seed = createSeed()
    localStorage.setItem(KEY, JSON.stringify(seed))
    return seed
  }
}

export function writeDb(db: Database) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function resetDb(): Database {
  const seed = createSeed()
  localStorage.setItem(KEY, JSON.stringify(seed))
  return seed
}
