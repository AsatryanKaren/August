import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Logo } from './Logo'
import { useDatabase } from '../api'
import { useI18n } from '../i18n'
import type { Lang } from '../types'

const langs: Lang[] = ['hy', 'en', 'ru']

function SocialIcon({ label }: { label: string }) {
  const name = label.toLowerCase()
  if (name.includes('instagram')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    )
  }
  if (name.includes('facebook')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    )
  }
  return <span>{label.slice(0, 1)}</span>
}

export function Shell() {
  const { lang, setLang, t } = useI18n()
  const { data } = useDatabase()
  const location = useLocation()
  const onHero = location.pathname === '/'
  const headerRef = useRef<HTMLElement>(null)
  const socials = data?.restaurant.socials?.length
    ? data.restaurant.socials
    : data?.restaurant.facebook
      ? [{ label: 'Facebook', href: data.restaurant.facebook }]
      : []

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const apply = () => {
      document.documentElement.style.setProperty('--nav-h', `${header.offsetHeight}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="app">
      <header ref={headerRef} className={onHero ? 'nav nav-over' : 'nav'}>
        <NavLink to="/" className="brand" aria-label="August Cafeteria">
          <Logo light={onHero} />
          <span>
            <strong>August</strong>
            <em>Cafeteria</em>
          </span>
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>
            {t.welcome}
          </NavLink>
          <NavLink to="/menu">{t.menu}</NavLink>
          <NavLink to="/book">{t.book}</NavLink>
          <NavLink to="/breakfast">{t.cardNav}</NavLink>
        </nav>
        <div className="langs" role="group" aria-label="Language">
          {langs.map((code) => (
            <button
              key={code}
              type="button"
              className={code === lang ? 'on' : ''}
              onClick={() => setLang(code)}
            >
              {code}
            </button>
          ))}
        </div>
      </header>
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <footer className="foot">
        <div className="foot-brand">
          <strong>August</strong>
          <span>{t.footer}</span>
        </div>
        {socials.length > 0 && (
          <nav className="foot-links" aria-label="Social">
            {socials.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}>
                <SocialIcon label={link.label} />
              </a>
            ))}
          </nav>
        )}
      </footer>
    </div>
  )
}
