import { mkdirSync } from 'node:fs'
import pg from 'pg'

type Row = Record<string, unknown>

type Lite = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Row[] }>
  exec: (text: string) => Promise<unknown>
  close: () => Promise<void>
}

let pool: pg.Pool | null = null
let lite: Lite | null = null

const statements = [
  `CREATE TABLE IF NOT EXISTS categories (
    id text PRIMARY KEY,
    name jsonb NOT NULL,
    sort integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS items (
    id text PRIMARY KEY,
    category_id text NOT NULL,
    name jsonb NOT NULL,
    description jsonb NOT NULL,
    price integer NOT NULL,
    price_label text,
    image text NOT NULL DEFAULT '',
    available boolean NOT NULL DEFAULT true,
    featured boolean NOT NULL DEFAULT false,
    sort integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS breakfast_checks (
    id text PRIMARY KEY,
    phone text NOT NULL,
    image text NOT NULL,
    created_at text NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS breakfast_checks_phone ON breakfast_checks (phone)`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id text PRIMARY KEY,
    name text NOT NULL,
    phone text NOT NULL,
    date text NOT NULL,
    time text NOT NULL,
    guests integer NOT NULL,
    note text NOT NULL DEFAULT '',
    status text NOT NULL,
    created_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id text PRIMARY KEY,
    data jsonb NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    login text NOT NULL UNIQUE,
    password_hash text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    expires_at timestamptz NOT NULL
  )`,
]

function sslFor(url: string): pg.ConnectionConfig['ssl'] {
  if (/localhost|127\.0\.0\.1|railway\.internal/.test(url)) return undefined
  if (url.includes('sslmode=disable')) return undefined
  if (url.includes('sslmode=require') || url.includes('rlwy.net')) return { rejectUnauthorized: false }
  return undefined
}

export async function openDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    pool = new pg.Pool({ connectionString: databaseUrl, ssl: sslFor(databaseUrl) })
    for (const statement of statements) await pool.query(statement)
    await renameLoginColumn()
    return
  }

  mkdirSync('.data', { recursive: true })
  const { PGlite } = await import('@electric-sql/pglite')
  lite = new PGlite('.data/august')
  for (const statement of statements) await lite.exec(statement)
  await renameLoginColumn()
}

async function renameLoginColumn() {
  const columns = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
  )
  const names = new Set(columns.map((column) => column.column_name))
  if (names.has('email') && !names.has('login')) {
    await query('ALTER TABLE users RENAME COLUMN email TO login')
  }
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (pool) {
    const result = await pool.query(text, params)
    return result.rows as T[]
  }
  if (!lite) throw new Error('Database is not open')
  const result = await lite.query(text, params)
  return result.rows as T[]
}

export async function closeDb() {
  await pool?.end()
  await lite?.close()
  pool = null
  lite = null
}
