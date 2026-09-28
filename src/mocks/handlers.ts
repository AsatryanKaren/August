import { http, HttpResponse } from 'msw'
import { readDb, resetDb, writeDb } from './db'
import type { MenuItem, Reservation, ReservationStatus } from '../types'

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const handlers = [
  http.get('/api/menu', () => HttpResponse.json(copy(readDb()))),

  http.post('/api/items', async ({ request }) => {
    const body = (await request.json()) as Omit<MenuItem, 'id'>
    const db = readDb()
    const item: MenuItem = {
      id: crypto.randomUUID(),
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      price: Number(body.price) || 0,
      priceLabel: body.priceLabel,
      image: body.image ?? '',
      available: body.available !== false,
      featured: Boolean(body.featured),
    }
    db.items.push(item)
    writeDb(db)
    return HttpResponse.json(item, { status: 201 })
  }),

  http.patch('/api/items/:id', async ({ params, request }) => {
    const db = readDb()
    const index = db.items.findIndex((item) => item.id === params.id)
    if (index < 0) return new HttpResponse(null, { status: 404 })
    const patch = (await request.json()) as Partial<MenuItem>
    const current = db.items[index]
    db.items[index] = {
      ...current,
      ...patch,
      id: current.id,
      price: patch.price === undefined ? current.price : Number(patch.price) || 0,
      name: patch.name ? { ...current.name, ...patch.name } : current.name,
      description: patch.description
        ? { ...current.description, ...patch.description }
        : current.description,
    }
    writeDb(db)
    return HttpResponse.json(db.items[index])
  }),

  http.delete('/api/items/:id', ({ params }) => {
    const db = readDb()
    const next = db.items.filter((item) => item.id !== params.id)
    if (next.length === db.items.length) return new HttpResponse(null, { status: 404 })
    db.items = next
    writeDb(db)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/reservations', async ({ request }) => {
    const body = (await request.json()) as Omit<Reservation, 'id' | 'status' | 'createdAt'>
    const db = readDb()
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      phone: body.phone.trim(),
      date: body.date,
      time: body.time,
      guests: Number(body.guests) || 2,
      note: body.note?.trim() ?? '',
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    db.reservations.unshift(reservation)
    writeDb(db)
    return HttpResponse.json(reservation, { status: 201 })
  }),

  http.patch('/api/reservations/:id', async ({ params, request }) => {
    const db = readDb()
    const index = db.reservations.findIndex((row) => row.id === params.id)
    if (index < 0) return new HttpResponse(null, { status: 404 })
    const patch = (await request.json()) as { status?: ReservationStatus }
    if (patch.status) db.reservations[index].status = patch.status
    writeDb(db)
    return HttpResponse.json(db.reservations[index])
  }),

  http.post('/api/reset', () => HttpResponse.json(copy(resetDb()))),
]
