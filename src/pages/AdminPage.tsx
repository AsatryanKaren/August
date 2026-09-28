import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { api, money, useDatabase } from '../api'
import { GALLERY } from '../data/seed'
import { useI18n } from '../i18n'
import type { BreakfastCard, BreakfastSummary, CategoryId, Lang, MenuItem, Offer, ReservationStatus } from '../types'

const emptyItem = (): Omit<MenuItem, 'id'> => ({
  categoryId: 'breakfast',
  name: { hy: '', en: '', ru: '' },
  description: { hy: '', en: '', ru: '' },
  price: 0,
  image: '',
  available: true,
  featured: false,
})

export function AdminPage() {
  const { data, error, reload } = useDatabase()
  const { t, text, lang } = useI18n()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState<'items' | 'requests' | 'cards' | 'offer'>('items')
  const [offer, setOffer] = useState<Offer | null>(null)
  const [offerError, setOfferError] = useState('')
  const [cardList, setCardList] = useState<BreakfastSummary[]>([])
  const [openCard, setOpenCard] = useState<BreakfastCard | null>(null)
  const [draft, setDraft] = useState<Omit<MenuItem, 'id'> | MenuItem | null>(null)
  const [fieldLang, setFieldLang] = useState<Lang>(lang)
  const [saving, setSaving] = useState(false)
  const [uploads, setUploads] = useState<string[]>([])
  const [uploadError, setUploadError] = useState('')
  const [query, setQuery] = useState('')
  const [dishCategory, setDishCategory] = useState<CategoryId | 'all'>('all')
  const savingRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFieldLang(lang)
  }, [lang])

  useEffect(() => {
    api
      .me()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (data?.offer) setOffer((current) => current ?? data.offer)
  }, [data])

  useEffect(() => {
    if (!authed || tab !== 'cards') return
    api
      .breakfastCards()
      .then((rows) => {
        setCardList(rows)
        setOpenCard((current) => (current ? rows.find((row) => row.phone === current.phone) ? current : null : null))
      })
      .catch(() => setCardList([]))
  }, [authed, tab])

  useEffect(() => {
    if (!authed) return
    api
      .uploads()
      .then((result) => setUploads(result.urls))
      .catch(() => setUploads([]))
  }, [authed])

  const dishGroups = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.categories
      .filter((group) => dishCategory === 'all' || group.id === dishCategory)
      .map((group) => ({
        group,
        rows: data.items.filter((item) => {
          if (item.categoryId !== group.id) return false
          if (!q) return true
          const blob = `${item.name.hy} ${item.name.en} ${item.name.ru} ${item.description.hy} ${item.description.en} ${item.description.ru} ${item.price}`
          return blob.toLowerCase().includes(q)
        }),
      }))
      .filter((group) => group.rows.length > 0)
  }, [data, dishCategory, query])

  function showList() {
    setDraft(null)
    window.setTimeout(() => document.querySelector('.desk-menu')?.scrollIntoView({ block: 'start' }), 40)
  }

  function showEditor() {
    window.setTimeout(() => document.querySelector('.editor')?.scrollIntoView({ block: 'start' }), 40)
  }

  function openItem(item: MenuItem) {
    setDraft(structuredClone(item))
    setTab('items')
    showEditor()
  }

  function openNew() {
    setDraft(emptyItem())
    setTab('items')
    showEditor()
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!draft || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      if ('id' in draft) await api.updateItem(draft.id, draft)
      else await api.createItem(draft)
      setDraft(null)
      await reload()
      window.setTimeout(() => document.querySelector('.desk-menu')?.scrollIntoView({ block: 'start' }), 40)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!draft || !('id' in draft) || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      await api.deleteItem(draft.id)
      await reload()
      showList()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function onReset() {
    if (!window.confirm(t.resetConfirm) || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      await api.reset()
      await reload()
      showList()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function onOfferSave(event: FormEvent) {
    event.preventDefault()
    if (!offer || savingRef.current) return
    setOfferError('')
    savingRef.current = true
    setSaving(true)
    try {
      const saved = await api.saveOffer(offer)
      setOffer(saved)
      await reload()
    } catch {
      setOfferError(t.offerDates)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function onOfferUpload(file: File | undefined) {
    if (!file || !offer) return
    setUploadError('')
    try {
      const saved = await api.uploadPhoto(file)
      setUploads((current) => [saved.url, ...current.filter((url) => url !== saved.url)])
      setOffer({ ...offer, image: saved.url })
    } catch {
      setUploadError(t.uploadFailed)
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file || !draft) return
    setUploadError('')
    try {
      const saved = await api.uploadPhoto(file)
      setUploads((current) => [saved.url, ...current.filter((url) => url !== saved.url)])
      setDraft({ ...draft, image: saved.url })
    } catch {
      setUploadError(t.uploadFailed)
    }
  }

  async function setStatus(id: string, status: ReservationStatus) {
    await api.setReservationStatus(id, status)
    await reload()
  }

  if (authed === null) return <p className="loading">August</p>

  if (!authed) {
    return (
      <form
        className="gate"
        onSubmit={async (event) => {
          event.preventDefault()
          setLoginError('')
          const form = new FormData(event.currentTarget)
          try {
            await api.login(String(form.get('login') ?? ''), String(form.get('password') ?? ''))
            setAuthed(true)
            await reload()
          } catch {
            setLoginError(t.loginFailed)
          }
        }}
      >
        <p className="kicker dark">August</p>
        <h1>{t.adminTitle}</h1>
        <p>{t.loginLead}</p>
        <label>
          {t.login}
          <input name="login" type="text" autoComplete="username" required autoFocus />
        </label>
        <label>
          {t.password}
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {loginError && <p className="warn">{loginError}</p>}
        <button className="btn solid" type="submit">
          {t.enter}
        </button>
      </form>
    )
  }

  if (!data) return <p className="loading">{error ?? 'August'}</p>

  return (
    <div className="desk">
      <header className="desk-head">
        <div>
          <p className="kicker dark">August Cafeteria</p>
          <h1>{t.adminTitle}</h1>
          <p>{t.adminLead}</p>
        </div>
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            void api.logout().finally(() => setAuthed(false))
          }}
        >
          {t.logout}
        </button>
      </header>
      <div className="desk-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'items'}
          className={tab === 'items' ? 'on' : ''}
          onClick={() => setTab('items')}
        >
          {t.items}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'requests'}
          className={tab === 'requests' ? 'on' : ''}
          onClick={() => setTab('requests')}
        >
          {t.requests}
          {data.reservations.some((row) => row.status === 'new') && <i />}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cards'}
          className={tab === 'cards' ? 'on' : ''}
          onClick={() => setTab('cards')}
        >
          {t.cards}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'offer'}
          className={tab === 'offer' ? 'on' : ''}
          onClick={() => setTab('offer')}
        >
          {t.offer}
        </button>
      </div>

      {tab === 'offer' && offer ? (
        <form className="editor offer-form" onSubmit={(event) => void onOfferSave(event)}>
          <p className="card-only">{t.offerLead}</p>
          <label className="check">
            <input
              type="checkbox"
              checked={offer.visible}
              onChange={(event) => setOffer({ ...offer, visible: event.target.checked })}
            />
            {t.offerShow}
          </label>
          <div className="split">
            <label>
              {t.offerFrom}
              <input type="date" value={offer.from} onChange={(event) => setOffer({ ...offer, from: event.target.value })} />
            </label>
            <label>
              {t.offerTo}
              <input type="date" value={offer.to} onChange={(event) => setOffer({ ...offer, to: event.target.value })} />
            </label>
          </div>
          <div className="langs tiny">
            {(['hy', 'en', 'ru'] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                className={fieldLang === code ? 'on' : ''}
                onClick={() => setFieldLang(code)}
              >
                {code}
              </button>
            ))}
          </div>
          <label>
            {t.offerTitle}
            <input
              value={offer.title[fieldLang]}
              onChange={(event) => setOffer({ ...offer, title: { ...offer.title, [fieldLang]: event.target.value } })}
            />
          </label>
          <label>
            {t.details}
            <textarea
              rows={3}
              value={offer.description[fieldLang]}
              onChange={(event) =>
                setOffer({ ...offer, description: { ...offer.description, [fieldLang]: event.target.value } })
              }
            />
          </label>
          <fieldset>
            <legend>{t.photo}</legend>
            <div className="photo-tools">
              <button type="button" className="btn line" onClick={() => fileRef.current?.click()}>
                {t.upload}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  void onOfferUpload(file)
                }}
              />
              {uploadError && <span className="warn">{uploadError}</span>}
            </div>
            <div className="thumbs">
              <button type="button" className={offer.image === '' ? 'on' : ''} onClick={() => setOffer({ ...offer, image: '' })}>
                {t.noPhoto}
              </button>
              {uploads.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={offer.image === src ? 'on' : ''}
                  onClick={() => setOffer({ ...offer, image: src })}
                >
                  <img src={src} alt="" />
                </button>
              ))}
              {GALLERY.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={offer.image === src ? 'on' : ''}
                  onClick={() => setOffer({ ...offer, image: src })}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          </fieldset>
          {offerError && <p className="warn">{offerError}</p>}
          <button className="btn solid" type="submit" disabled={saving}>
            {t.save}
          </button>
        </form>
      ) : tab === 'cards' ? (
        <div className="card-desk">
          {openCard ? (
            <>
              <button type="button" className="editor-back" onClick={() => setOpenCard(null)}>
                ← {t.cards}
              </button>
              <h2>{openCard.label}</h2>
              <p className="stamp-count">
                <strong>
                  {openCard.stamps} {t.cardOf}
                </strong>
                <span>
                  {t.freeLine} {openCard.rewards}
                </span>
                <span>
                  {openCard.count}
                </span>
              </p>
              <ul className="check-list">
                {openCard.checks.map((check) => (
                  <li key={check.id}>
                    <img src={check.image} alt="" />
                    <button
                      type="button"
                      onClick={() => {
                        void api.deleteBreakfast(check.id).then(async () => {
                          const [next, rows] = await Promise.all([
                            api.breakfastCard(openCard.phone),
                            api.breakfastCards(),
                          ])
                          setOpenCard(next.checks.length ? next : null)
                          setCardList(rows)
                        })
                      }}
                    >
                      {t.removeCheck}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              {cardList.length === 0 && <p className="empty">{t.noCards}</p>}
              {cardList.map((row) => (
                <button
                  key={row.phone}
                  type="button"
                  className="phone-card"
                  onClick={() => {
                    void api.breakfastCard(row.phone).then(setOpenCard)
                  }}
                >
                  <strong>{row.label}</strong>
                  <span>
                    {row.stamps} {t.cardOf}
                  </span>
                  <span>
                    {t.freeLine} {row.rewards}
                  </span>
                  <b>{row.count}</b>
                </button>
              ))}
            </>
          )}
        </div>
      ) : tab === 'requests' ? (
        <ul className="requests">
          {data.reservations.length === 0 && <li className="empty">{t.noRequests}</li>}
          {data.reservations.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <span>
                  {row.date} · {row.time} · {row.guests} · {row.phone}
                </span>
                {row.note && <em>{row.note}</em>}
              </div>
              <div className="req-actions">
                <span className={`pill ${row.status === 'confirmed' ? 'on' : ''}`}>
                  {row.status === 'new' ? t.fresh : row.status === 'confirmed' ? t.confirmed : t.declined}
                </span>
                <button type="button" onClick={() => setStatus(row.id, 'confirmed')}>
                  {t.confirm}
                </button>
                <button type="button" onClick={() => setStatus(row.id, 'declined')}>
                  {t.decline}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : draft ? (
          <div className="editor-page">
            <button type="button" className="editor-back" onClick={showList}>
              ← {t.backToDishes}
            </button>
            <form className="editor" onSubmit={onSave}>
              <div className="langs tiny">
                {(['hy', 'en', 'ru'] as Lang[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={fieldLang === code ? 'on' : ''}
                    onClick={() => setFieldLang(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <label>
                {t.name}
                <input
                  required
                  value={draft.name[fieldLang]}
                  onChange={(event) =>
                    setDraft({ ...draft, name: { ...draft.name, [fieldLang]: event.target.value } })
                  }
                />
              </label>
              <label>
                {t.details}
                <span className="hint">{t.detailsHint}</span>
                <textarea
                  rows={3}
                  value={draft.description[fieldLang]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      description: { ...draft.description, [fieldLang]: event.target.value },
                    })
                  }
                />
              </label>
              <div className="split">
                <label>
                  {t.price}
                  <input
                    inputMode="numeric"
                    placeholder="0"
                    value={draft.price ? String(draft.price) : ''}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/\D/g, '')
                      setDraft({ ...draft, price: raw ? Number(raw) : 0 })
                    }}
                  />
                </label>
                <label>
                  {t.category}
                  <select
                    value={draft.categoryId}
                    onChange={(event) =>
                      setDraft({ ...draft, categoryId: event.target.value as CategoryId })
                    }
                  >
                    {data.categories.map((group) => (
                      <option key={group.id} value={group.id}>
                        {text(group.name)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>{t.photo}</legend>
                <div className="photo-tools">
                  <button type="button" className="btn line" onClick={() => fileRef.current?.click()}>
                    {t.upload}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      void onUpload(file)
                    }}
                  />
                  {uploadError && <span className="warn">{uploadError}</span>}
                </div>
                <div className="thumbs">
                  <button
                    type="button"
                    className={draft.image === '' ? 'on' : ''}
                    onClick={() => setDraft({ ...draft, image: '' })}
                  >
                    {t.noPhoto}
                  </button>
                  {uploads.map((src) => (
                    <button
                      key={src}
                      type="button"
                      className={draft.image === src ? 'on' : ''}
                      onClick={() => setDraft({ ...draft, image: src })}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                  {GALLERY.map((src) => (
                    <button
                      key={src}
                      type="button"
                      className={draft.image === src ? 'on' : ''}
                      onClick={() => setDraft({ ...draft, image: src })}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.available}
                  onChange={(event) => setDraft({ ...draft, available: event.target.checked })}
                />
                {t.onMenu}
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
                />
                {t.featured}
              </label>
              <div className="editor-actions">
                <button className="btn solid" type="submit" disabled={saving}>
                  {t.save}
                </button>
                {'id' in draft && (
                  <button className="btn line" type="button" onClick={onDelete} disabled={saving}>
                    {t.remove}
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="desk-menu">
            <div className="desk-find">
              <div className="find-search">
                <SearchOutlined aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                />
              </div>
              <select
                value={dishCategory}
                aria-label={t.category}
                onChange={(event) => setDishCategory(event.target.value as CategoryId | 'all')}
              >
                <option value="all">{t.all}</option>
                {data.categories.map((group) => (
                  <option key={group.id} value={group.id}>
                    {text(group.name)}
                  </option>
                ))}
              </select>
              <p className="find-count">
                {dishCategory === 'all'
                  ? t.backToDishes
                  : text(data.categories.find((group) => group.id === dishCategory)?.name ?? { hy: t.all, en: t.all, ru: t.all })}
                <strong>{dishGroups.reduce((sum, group) => sum + group.rows.length, 0)}</strong>
              </p>
              <button type="button" className="btn solid" onClick={openNew}>
                <PlusOutlined aria-hidden />
                {t.add}
              </button>
            </div>
            <p className="note">{t.adminNote}</p>
            {dishGroups.length === 0 && <p className="empty">{t.empty}</p>}
            {dishGroups.map(({ group, rows }) => (
                <section key={group.id}>
                  <h2>{text(group.name)}</h2>
                  {rows.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`row${item.available ? '' : ' off'}`}
                      onClick={() => openItem(item)}
                    >
                      {item.image ? <img src={item.image} alt="" /> : <span className="mini-plate">A</span>}
                      <span className="row-copy">
                        <strong>{text(item.name)}</strong>
                        {text(item.description).trim() && <em>{text(item.description).trim()}</em>}
                      </span>
                      <span className="row-price">{money(item.price, lang, item.priceLabel)}</span>
                    </button>
                  ))}
                </section>
            ))}
            <button type="button" className="text-btn" onClick={onReset}>
              {t.reset}
            </button>
          </div>
      )}
    </div>
  )
}
