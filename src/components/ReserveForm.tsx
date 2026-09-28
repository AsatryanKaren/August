import { FormEvent, useState } from 'react'
import { api } from '../api'
import { useI18n } from '../i18n'

export function ReserveForm() {
  const { t } = useI18n()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function onReserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    setSending(true)
    try {
      await api.createReservation({
        name: String(fields.get('name') ?? ''),
        phone: String(fields.get('phone') ?? ''),
        date: String(fields.get('date') ?? ''),
        time: String(fields.get('time') ?? ''),
        guests: Number(String(fields.get('guests') ?? '').replace(/\D/g, '') || 2),
        note: String(fields.get('note') ?? ''),
      })
      form.reset()
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="book-sent">
        <h2>{t.sentTitle}</h2>
        <p>{t.sent}</p>
        <button type="button" className="btn line" onClick={() => setSent(false)}>
          {t.again}
        </button>
      </div>
    )
  }

  return (
    <>
      <p className="lede">{t.reserveLead}</p>
      <form onSubmit={onReserve}>
        <label>
          {t.name}
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          {t.phone}
          <input name="phone" required autoComplete="tel" />
        </label>
        <div className="split">
          <label>
            {t.date}
            <input name="date" type="date" required />
          </label>
          <label>
            {t.time}
            <input name="time" type="time" required />
          </label>
          <label>
            {t.guests}
            <input name="guests" inputMode="numeric" placeholder="2" />
          </label>
        </div>
        <label>
          {t.note}
          <textarea name="note" rows={3} />
        </label>
        <button className="btn solid" type="submit" disabled={sending}>
          {t.send}
        </button>
      </form>
    </>
  )
}
