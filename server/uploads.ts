import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX_BYTES = 8 * 1024 * 1024
const namePattern = /^[0-9]{13}-[a-f0-9]{16}\.(jpg|png|webp)$/

export function uploadDir() {
  const dir = process.env.UPLOAD_DIR || join(process.cwd(), '.data', 'uploads')
  mkdirSync(dir, { recursive: true })
  return dir
}

function kind(bytes: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png'
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp'
  }
  return null
}

export async function saveUpload(file: Blob): Promise<string | null> {
  if (file.size <= 0 || file.size > MAX_BYTES) return null
  const bytes = Buffer.from(await file.arrayBuffer())
  const ext = kind(bytes)
  if (!ext) return null
  const name = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`
  writeFileSync(join(uploadDir(), name), bytes)
  return `/uploads/${name}`
}

export function uploadPath(name: string) {
  if (!namePattern.test(name)) return null
  const file = join(uploadDir(), name)
  return existsSync(file) ? file : null
}

export function listUploads() {
  return readdirSync(uploadDir())
    .filter((name) => namePattern.test(name))
    .sort((a, b) => (a < b ? 1 : -1))
    .map((name) => `/uploads/${name}`)
}
