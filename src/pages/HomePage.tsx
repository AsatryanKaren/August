import { Link } from 'react-router-dom'
import { BookBanner } from '../components/BookBanner'
import { ReserveForm } from '../components/ReserveForm'
import { motion } from 'framer-motion'
import { money, useDatabase } from '../api'
import { useI18n } from '../i18n'
import type { Lang } from '../types'

function offerWhen(from: string, to: string, lang: Lang) {
  const format = new Intl.DateTimeFormat(lang === 'hy' ? 'hy-AM' : lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  })
  const start = from ? format.format(new Date(`${from}T12:00:00`)) : ''
  const end = to ? format.format(new Date(`${to}T12:00:00`)) : ''
  if (start && end) return `${start} – ${end}`
  return start || end
}

export function HomePage() {
  const { data, error } = useDatabase()
  const { t, text, lang } = useI18n()

  if (!data) return <p className="loading">{error ?? 'August'}</p>

  const featured = data.items.filter((item) => item.featured && item.available).slice(0, 6)
  const { restaurant, offer } = data
  const offerDates = offerWhen(offer.from, offer.to, lang)

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">
            {t.cascade}
            <span />
            {t.since}
          </p>
          <h1>
            August
            <em>Cafeteria</em>
          </h1>
          <p className="lede">{text(restaurant.tagline)}</p>
          <div className="hero-actions">
            <Link className="btn solid" to="/menu">
              {t.openMenu}
            </Link>
            <a className="btn ghost" href="#visit">
              {t.visit}
            </a>
          </div>
        </div>
        <figure className="hero-photo">
          <img src="/photos/cover.jpg" alt="August Cafeteria lamps and wooden sign" />
        </figure>
      </section>

      {offer.visible && text(offer.title).trim() && (
        <section className={`offer${offer.image ? '' : ' text-only'}`}>
          {offer.image && (
            <figure>
              <img src={offer.image} alt="" />
            </figure>
          )}
          <div>
            {offerDates && <p className="kicker dark">{offerDates}</p>}
            <h2>{text(offer.title)}</h2>
            {text(offer.description).trim() && <p>{text(offer.description)}</p>}
          </div>
        </section>
      )}

      <section className="story">
        <div>
          <p className="kicker dark">{t.storyKicker}</p>
          <h2>{text(restaurant.tagline)}</h2>
          <p>{text(restaurant.about)}</p>
        </div>
        <motion.figure
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <img src="/photos/terrace.jpg" alt="" />
          <figcaption>{text(restaurant.address)}</figcaption>
        </motion.figure>
      </section>

      <section className="signatures">
        <div className="section-head">
          <h2>{t.signatures}</h2>
          <Link to="/menu">{t.menu}</Link>
        </div>
        <div className="sign-grid">
          {featured.map((item, index) => (
            <motion.article
              key={item.id}
              className="sign-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.06, duration: 0.5 }}
            >
              <Link to="/menu">
                {item.image ? (
                  <img src={item.image} alt="" />
                ) : (
                  <div className="plate">
                    <span>August</span>
                  </div>
                )}
                <div>
                  <h3>{text(item.name)}</h3>
                  <p>{money(item.price, lang, item.priceLabel)}</p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="visit" id="visit">
        <div className="visit-photo">
          <img src="/photos/extra4.jpg" alt="" />
        </div>
        <div className="visit-card">
          <p className="kicker dark">{t.visit}</p>
          <h2>{text(restaurant.address)}</h2>
          <dl>
            <div>
              <dt>{t.hours}</dt>
              <dd>
                {restaurant.hours.map((row) => (
                  <span key={row.open + row.days.en}>
                    {text(row.days)} · {row.open}–{row.close}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>{t.aperitivo}</dt>
              <dd>{text(restaurant.aperitivo)}</dd>
            </div>
            <div>
              <dt>{t.phone}</dt>
              <dd>
                {restaurant.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`}>
                    {phone}
                  </a>
                ))}
              </dd>
            </div>
            <div>
              <dt>{t.email}</dt>
              <dd>
                <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
              </dd>
            </div>
          </dl>
          <div className="hero-actions">
            <a className="btn solid" href={restaurant.maps} target="_blank" rel="noreferrer">
              {t.map}
            </a>
            <a className="btn line" href={restaurant.facebook} target="_blank" rel="noreferrer">
              {t.facebook}
            </a>
          </div>
          <BookBanner />
        </div>
      </section>

      <section className="home-book book-layout" id="book">
        <div>
          <p className="kicker dark">August Cafeteria</p>
          <h2>{t.book}</h2>
          <ReserveForm />
        </div>
        <figure className="book-photo">
          <img src="/photos/pour.jpg" alt="A table at August" />
        </figure>
      </section>
    </>
  )
}
