import { useEffect, useState } from 'react'
import type { BreakfastCard, BreakfastSummary, Database, Lang, MenuItem, Offer, Reservation, ReservationStatus } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function useDatabase() {
  const [data, setData] = useState<Database | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    let last = 'Could not load the menu'
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const next = await request<Database>('/api/menu')
        if (!next?.items) throw new Error('Menu was not ready')
        setData(next)
        setError(null)
        return
      } catch (err) {
        last = err instanceof Error ? err.message : last
        await new Promise((resolve) => window.setTimeout(resolve, 400))
      }
    }
    setError(last)
  }

  useEffect(() => {
    void reload()
  }, [])

  return { data, error, reload }
}

export const api = {
  createItem(item: Omit<MenuItem, 'id'>) {
    return request<MenuItem>('/api/items', { method: 'POST', body: JSON.stringify(item) })
  },
  updateItem(id: string, patch: Partial<MenuItem>) {
    return request<MenuItem>(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  },
  deleteItem(id: string) {
    return request<void>(`/api/items/${id}`, { method: 'DELETE' })
  },
  createReservation(input: Omit<Reservation, 'id' | 'status' | 'createdAt'>) {
    return request<Reservation>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  setReservationStatus(id: string, status: ReservationStatus) {
    return request<Reservation>(`/api/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  reset() {
    return request<Database>('/api/reset', { method: 'POST' })
  },
  saveOffer(offer: Offer) {
    return request<Offer>('/api/offer', { method: 'PUT', body: JSON.stringify(offer) })
  },
  me() {
    return request<{ login: string }>('/api/me')
  },
  login(login: string, password: string) {
    return request<{ login: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    })
  },
  logout() {
    return request<{ ok: true }>('/api/logout', { method: 'POST' })
  },
  uploads() {
    return request<{ urls: string[] }>('/api/uploads')
  },
  breakfastCard(phone: string) {
    return request<BreakfastCard>(`/api/breakfast?phone=${encodeURIComponent(phone)}`)
  },
  breakfastCards() {
    return request<BreakfastSummary[]>('/api/breakfast/admin')
  },
  deleteBreakfast(id: string) {
    return request<void>(`/api/breakfast/${id}`, { method: 'DELETE' })
  },
  async addBreakfast(phone: string, file: File) {
    const body = new FormData()
    body.append('phone', phone)
    body.append('file', file)
    const response = await fetch('/api/breakfast', { method: 'POST', body, credentials: 'include' })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return (await response.json()) as BreakfastCard
  },
  async uploadPhoto(file: File) {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/uploads', { method: 'POST', body, credentials: 'include' })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return (await response.json()) as { url: string }
  },
}

export function money(price: number, lang: Lang, label?: string) {
  const locale = lang === 'hy' ? 'hy-AM' : lang === 'ru' ? 'ru-RU' : 'en-US'
  const fmt = new Intl.NumberFormat(locale)
  if (label) {
    const parts = label.split('/').map((part) => {
      const value = Number(part.trim())
      return Number.isFinite(value) ? fmt.format(value) : part.trim()
    })
    return `${parts.join(' / ')} ֏`
  }
  return `${fmt.format(price)} ֏`
}
