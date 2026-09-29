import { FormEvent, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useI18n } from '../i18n'
import { normalizePhone } from '../phone'
import type { BreakfastCard, Lang } from '../types'

function when(iso: string, lang: Lang) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'hy' ? 'hy-AM' : lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function BreakfastPage() {
  const { t, lang } = useI18n()
  const [lookupPhone, setLookupPhone] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [card, setCard] = useState<BreakfastCard | null>(null)
  const [notice, setNotice] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [looking, setLooking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedPhone, setSavedPhone] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const saved = savedPhone !== null && normalizePhone(addPhone) === savedPhone

  useEffect(() => {
    return () => {
      if (draftRef.current) URL.revokeObjectURL(draftRef.current.url)
    }
  }, [])

  function onLookupPhone(value: string) {
    setLookupPhone(value)
    setLookupError('')
    if (card && normalizePhone(value) !== card.phone) setCard(null)
  }

  function onAddPhone(value: string) {
    setAddPhone(value)
    setSaveError('')
    if (savedPhone && normalizePhone(value) !== savedPhone) {
      setSavedPhone(null)
      setNotice('')
    }
  }

  function pick(file: File | undefined) {
    if (!file || saved) return
    setSaveError('')
    setNotice('')
    setDraft((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return { file, url: URL.createObjectURL(file) }
    })
  }

  async function lookup(event?: FormEvent) {
    event?.preventDefault()
    setLookupError('')
    setLooking(true)
    try {
      const next = await api.breakfastCard(lookupPhone)
      setCard(next)
      setLookupPhone(next.label)
    } catch {
      setCard(null)
      setLookupError(t.cardInvalid)
    } finally {
      setLooking(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft || saved) return
    if (!normalizePhone(addPhone)) {
      setSaveError(t.cardInvalid)
      return
    }
    setSaveError('')
    setNotice('')
    setSaving(true)
    try {
      const next = await api.addBreakfast(addPhone, draft.file)
      setAddPhone(next.label)
      setSavedPhone(next.phone)
      setNotice(t.checkAdded)
      setDraft((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return null
      })
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setSaveError(t.checkInvalid)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="book-page breakfast-page">
      <p className="kicker dark">August Cafeteria</p>
      <h1>{t.cardTitle}</h1>
      <p className="lede">{t.cardLead}</p>
      <div className={card || draft ? 'card-split' : 'card-split even'}>
        <section className="card-box">
          <h2>{t.addSide}</h2>
          <p className="card-only">{t.cardOnly}</p>
          <form onSubmit={(event) => void save(event)}>
            <label>
              {t.phone}
              <input
                value={addPhone}
                onChange={(event) => onAddPhone(event.target.value)}
                name="add-phone"
                inputMode="tel"
                autoComplete="off"
                placeholder="+374"
              />
            </label>
            <div className="photo-tools">
              <button type="button" className="btn line" disabled={saving || saved} onClick={() => fileRef.current?.click()}>
                {t.choosePhoto}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saved}
                onChange={(event) => pick(event.target.files?.[0])}
              />
            </div>
            {draft && (
              <figure className="check-preview">
                <img src={draft.url} alt="" />
              </figure>
            )}
            <button className="btn solid" type="submit" disabled={saving || saved || !draft || !addPhone.trim()}>
              {t.saveCheck}
            </button>
          </form>
          {notice && <p className="sent">{notice}</p>}
          {saveError && <p className="warn">{saveError}</p>}
        </section>

        <section className="card-box">
          <h2>{t.checkSide}</h2>
          <form onSubmit={(event) => void lookup(event)}>
            <label>
              {t.phone}
              <input
                value={lookupPhone}
                onChange={(event) => onLookupPhone(event.target.value)}
                name="lookup-phone"
                inputMode="tel"
                autoComplete="off"
                required
                placeholder="+374"
              />
            </label>
            <button className="btn solid" type="submit" disabled={looking}>
              {t.seeCard}
            </button>
          </form>
          {lookupError && <p className="warn">{lookupError}</p>}
          {card && (
            <div className="stamp-card">
              <div className="stamps" aria-label={`${card.stamps} ${t.cardOf}`}>
                {Array.from({ length: 10 }, (_, index) => (
                  <i key={index} className={index < card.stamps ? 'on' : ''}>
                    {index + 1}
                  </i>
                ))}
              </div>
              <p className="stamp-count">
                <strong>
                  {card.stamps} {t.cardOf}
                </strong>
                <span>
                  {t.freeLine} {card.approved}
                </span>
              </p>
              {card.pending > 0 ? (
                <p className="card-full">{t.cardPending}</p>
              ) : (
                card.stamps === 10 && <p className="card-full">{t.cardFull}</p>
              )}
              {card.checks.length === 0 ? (
                <p className="empty">{t.cardEmpty}</p>
              ) : (
                <ul className="check-list">
                  {card.checks.map((check) => (
                    <li key={check.id}>
                      <img src={check.image} alt="" />
                      <span>{when(check.createdAt, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
