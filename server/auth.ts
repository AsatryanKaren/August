import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import { query } from './db'

const COOKIE = 'august_session'
const WEEK = 60 * 60 * 24 * 14

function adminLogin() {
  return (process.env.ADMIN_LOGIN || 'august').trim().toLowerCase()
}

export async function ensureAdmin() {
  const loginName = adminLogin()
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('Set ADMIN_PASSWORD in .env')
  const existing = await query<{ id: string; login: string; password_hash: string }>(
    'SELECT id, login, password_hash FROM users LIMIT 1',
  )
  if (existing[0]) {
    if (existing[0].login !== loginName) {
      await query('UPDATE users SET login = $1 WHERE id = $2', [loginName, existing[0].id])
    }
    const samePassword = await bcrypt.compare(password, existing[0].password_hash)
    if (!samePassword) {
      const passwordHash = await bcrypt.hash(password, 12)
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, existing[0].id])
      await query('DELETE FROM sessions WHERE user_id = $1', [existing[0].id])
    }
    return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await query('INSERT INTO users (id, login, password_hash) VALUES ($1, $2, $3)', [
    randomUUID(),
    loginName,
    passwordHash,
  ])
}

export async function userFromCookie(cookie: string | undefined) {
  if (!cookie) return null
  const rows = await query<{ id: string; login: string }>(
    `SELECT users.id, users.login
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = $1 AND sessions.expires_at > now()`,
    [cookie],
  )
  return rows[0] ?? null
}

export async function login(name: string, password: string) {
  const rows = await query<{ id: string; login: string; password_hash: string }>(
    'SELECT id, login, password_hash FROM users WHERE login = $1',
    [name.trim().toLowerCase()],
  )
  const user = rows[0]
  if (!user) return null
  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return null
  const id = randomBytes(32).toString('hex')
  await query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval \'14 days\')', [
    id,
    user.id,
  ])
  return { id, login: user.login }
}

export async function logout(cookie: string | undefined) {
  if (cookie) await query('DELETE FROM sessions WHERE id = $1', [cookie])
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: WEEK,
  }
}

export function writeSessionCookie(c: Context, sessionId: string) {
  setCookie(c, COOKIE, sessionId, cookieOptions())
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, { path: '/' })
}

export async function currentUser(c: Context) {
  return userFromCookie(getCookie(c, COOKIE))
}
