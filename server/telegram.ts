import { randomBytes } from 'node:crypto'
import type { Context } from 'hono'
import type { Reservation } from '../src/types'
import { query } from './db'
import { setReservationStatus } from './store'

type TelegramResult<T> = { ok: boolean; description?: string; result?: T }

type TelegramUpdate = {
  message?: { chat: { id: number }; text?: string }
  callback_query?: {
    id: string
    data?: string
    message?: { message_id: number; chat: { id: number } }
  }
}

const webhookSecret = randomBytes(24).toString('hex')

function token() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? ''
}

function publicOrigin() {
  const explicit = process.env.APP_ORIGIN?.replace(/\/$/, '')
  if (explicit) return explicit
  const staticUrl = process.env.RAILWAY_STATIC_URL?.replace(/\/$/, '')
  if (staticUrl?.startsWith('https://')) return staticUrl
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
  if (domain) return `https://${domain}`
  return ''
}

async function call<T>(method: string, body: Record<string, unknown>) {
  const key = token()
  if (!key) return null
  const response = await fetch(`https://api.telegram.org/bot${key}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as TelegramResult<T>
  if (!data.ok) console.error(`Telegram ${method}: ${data.description ?? 'failed'}`)
  return data
}

type Desk = { chatId?: number; chatIds?: number[] }

async function deskChats() {
  const rows = await query<{ data: Desk | string }>('SELECT data FROM settings WHERE id = $1', ['telegram'])
  const raw = rows[0]?.data
  if (!raw) return []
  const data = typeof raw === 'string' ? (JSON.parse(raw) as Desk) : raw
  const ids = Array.isArray(data.chatIds) ? data.chatIds : data.chatId ? [data.chatId] : []
  return [...new Set(ids.map(Number).filter((id) => Number.isFinite(id)))]
}

async function saveChats(chatIds: number[]) {
  await query(
    `INSERT INTO settings (id, data) VALUES ('telegram', $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify({ chatIds })],
  )
}

function commandOf(text: string) {
  return (text.split(/\s+/)[0] ?? '').split('@')[0]
}

function reservationText(reservation: Reservation, statusLine = '') {
  const lines = [
    'Նոր սեղան',
    '',
    reservation.name,
    reservation.phone,
    `${reservation.date} · ${reservation.time}`,
    `${reservation.guests} հոգի`,
  ]
  if (reservation.note) lines.push(reservation.note)
  if (statusLine) lines.push('', statusLine)
  return lines.join('\n')
}

function statusLine(status: string) {
  if (status === 'confirmed') return 'Հաստատված է'
  if (status === 'declined') return 'Մերժված է'
  return ''
}

const buttons = (id: string) => ({
  inline_keyboard: [
    [
      { text: 'Հաստատել', callback_data: `ok:${id}` },
      { text: 'Մերժել', callback_data: `no:${id}` },
    ],
  ],
})

export async function notifyReservation(reservation: Reservation) {
  if (!token()) return
  const chats = await deskChats()
  if (chats.length === 0) {
    console.error('Telegram desk is not connected. Open the bot and press Start.')
    return
  }
  await Promise.all(
    chats.map((chatId) =>
      call('sendMessage', {
        chat_id: chatId,
        text: reservationText(reservation),
        reply_markup: buttons(reservation.id),
      }),
    ),
  )
}

async function linkChat(chatId: number, text: string) {
  const chats = await deskChats()
  const command = commandOf(text)
  const linked = chats.includes(chatId)
  if (command === '/stop') {
    if (!linked) {
      await call('sendMessage', { chat_id: chatId, text: 'Այս հեռախոսը կապված չէր։' })
      return
    }
    await saveChats(chats.filter((id) => id !== chatId))
    await call('sendMessage', { chat_id: chatId, text: 'Այս հեռախոսն այլևս հայտեր չի ստանա։' })
    return
  }
  if (command === '/connect') {
    const code = text.replace(/^\/connect(?:@\S+)?\s*/, '').trim()
    const password = process.env.ADMIN_PASSWORD ?? ''
    if (!password || code !== password) {
      await call('sendMessage', { chat_id: chatId, text: 'Սխալ կոդ։' })
      return
    }
    if (!linked) await saveChats([...chats, chatId])
    await call('sendMessage', {
      chat_id: chatId,
      text: 'August Cafeteria\nԱյս հեռախոսը կստանա սեղանի հայտերը։ Մյուս հեռախոսները մնում են։',
    })
    return
  }
  if (linked) {
    await call('sendMessage', {
      chat_id: chatId,
      text: 'Այս հեռախոսն արդեն կապված է։\nՈւրիշ հեռախոս ավելացնելու համար այնտեղ գրեք /connect և ադմինի գաղտնաբառը։',
    })
    return
  }
  if (chats.length > 0) {
    await call('sendMessage', {
      chat_id: chatId,
      text: 'Այս բոտն արդեն միացված է։\nԱյս հեռախոսն ավելացնելու համար գրեք /connect և ադմինի գաղտնաբառը։',
    })
    return
  }
  await saveChats([chatId])
  await call('sendMessage', {
    chat_id: chatId,
    text: 'August Cafeteria\nՍեղանի հայտերը կգան այստեղ։\nՈւրիշ հեռախոս ավելացնելու համար այնտեղ գրեք /connect և ադմինի գաղտնաբառը։',
  })
}

async function pressButton(query: NonNullable<TelegramUpdate['callback_query']>) {
  const chatId = query.message?.chat.id
  const chats = await deskChats()
  if (!chatId || !chats.includes(chatId)) {
    await call('answerCallbackQuery', { callback_query_id: query.id })
    return
  }
  const [action, id] = (query.data ?? '').split(':')
  const status = action === 'ok' ? 'confirmed' : action === 'no' ? 'declined' : ''
  const line = statusLine(status)
  if (!id || !line) {
    await call('answerCallbackQuery', { callback_query_id: query.id })
    return
  }
  const reservation = await setReservationStatus(id, status)
  await call('answerCallbackQuery', { callback_query_id: query.id, text: line })
  if (!reservation || !query.message) return
  await call('editMessageText', {
    chat_id: chatId,
    message_id: query.message.message_id,
    text: reservationText(reservation, line),
  })
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  try {
    const text = update.message?.text?.trim() ?? ''
    if (update.message && ['/start', '/connect', '/stop'].includes(commandOf(text))) {
      await linkChat(update.message.chat.id, text)
    }
    if (update.callback_query) await pressButton(update.callback_query)
  } catch (error) {
    console.error(error)
  }
}

export async function telegramWebhook(c: Context) {
  if (!token()) return c.json({ ok: true })
  if (c.req.header('x-telegram-bot-api-secret-token') !== webhookSecret) return c.json({ ok: false }, 401)
  const update = (await c.req.json().catch(() => null)) as TelegramUpdate | null
  if (update) await handleTelegramUpdate(update)
  return c.json({ ok: true })
}

export async function connectTelegram() {
  if (!token()) return
  const origin = publicOrigin()
  if (!origin) {
    console.error('Telegram is configured, but this server has no public address for the bot.')
    return
  }
  const result = await call('setWebhook', {
    url: `${origin}/api/telegram`,
    secret_token: webhookSecret,
    allowed_updates: ['message', 'callback_query'],
  })
  if (result?.ok) console.log('Telegram desk is listening')
}
