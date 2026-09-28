import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

export function BookBanner() {
  const { t } = useI18n()
  return (
    <Link className="book-banner" to="/#book">
      <strong>{t.book}</strong>
      <span>{t.reserveLead}</span>
    </Link>
  )
}
