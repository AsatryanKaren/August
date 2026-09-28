import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { money, useDatabase } from '../api'
import { useI18n } from '../i18n'
import type { CategoryId, MenuItem } from '../types'

export function MenuPage() {
  const { data, error } = useDatabase()
  const { t, text, lang } = useI18n()
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<MenuItem | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const items = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.items.filter((item) => {
      if (category !== 'all' && item.categoryId !== category) return false
      if (!q) return true
      const blob = `${item.name.en} ${item.name.hy} ${item.name.ru} ${item.description.en} ${item.description.hy} ${item.description.ru}`
      return blob.toLowerCase().includes(q)
    })
  }, [data, category, query])

  if (!data) return <p className="loading">{error ?? 'August'}</p>

  const groups =
    category === 'all'
      ? data.categories
          .map((group) => ({
            group,
            rows: items.filter((item) => item.categoryId === group.id),
          }))
          .filter((group) => group.rows.length > 0)
      : [
          {
            group: data.categories.find((group) => group.id === category) ?? data.categories[0],
            rows: items,
          },
        ]

  return (
    <div className="menu-page">
      <header className="menu-head">
        <p className="kicker dark">August Cafeteria</p>
        <h1>{t.menu}</h1>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.search}
          aria-label={t.search}
        />
      </header>
      <div className={filtersOpen ? 'cats open' : 'cats'} role="tablist">
        <button
          type="button"
          className="cats-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
        >
          {category === 'all' ? t.all : text(data.categories.find((group) => group.id === category)?.name ?? { hy: t.all, en: t.all, ru: t.all })}
          <span aria-hidden="true">{filtersOpen ? '–' : '+'}</span>
        </button>
        <div className="cats-rest">
          <button
            type="button"
            className={category === 'all' ? 'on' : ''}
            onClick={() => {
              setCategory('all')
              setFiltersOpen(false)
            }}
          >
            {t.all}
          </button>
          {data.categories.map((group) => (
            <button
              key={group.id}
              type="button"
              className={category === group.id ? 'on' : ''}
              onClick={() => {
                setCategory(group.id)
                setFiltersOpen(false)
              }}
            >
              {text(group.name)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && <p className="empty">{t.empty}</p>}

      {groups.map(({ group, rows }) => (
        <section key={group.id} className="menu-section">
          <h2>{text(group.name)}</h2>
          <ul>
            {rows.map((item) => (
              <li key={item.id}>
                <button type="button" className={item.available ? '' : 'off'} onClick={() => setOpen(item)}>
                  {item.image ? <img src={item.image} alt="" /> : <span className="mini-plate">A</span>}
                  <span className="dish">
                    <strong>{text(item.name)}</strong>
                    {text(item.description).trim() && <em>{text(item.description).trim()}</em>}
                    {!item.available && <small>{t.soldOut}</small>}
                  </span>
                  <span className="price">{money(item.price, lang, item.priceLabel)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <AnimatePresence>
        {open && (
          <motion.div
            className="drawer-back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.aside
              className="drawer"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 30, opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={text(open.name)}
            >
              {open.image ? <img src={open.image} alt="" /> : <div className="plate tall"><span>August</span></div>}
              <div className="drawer-body">
                <p className="kicker dark">{text(data.categories.find((c) => c.id === open.categoryId)!.name)}</p>
                <h2>{text(open.name)}</h2>
                {text(open.description).trim() && <p>{text(open.description).trim()}</p>}
                <p className="price big">{money(open.price, lang, open.priceLabel)}</p>
                <p className={open.available ? 'pill on' : 'pill'}>{open.available ? t.available : t.soldOut}</p>
                <button type="button" className="btn line" onClick={() => setOpen(null)}>
                  {t.close}
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
