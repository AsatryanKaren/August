import { ReserveForm } from '../components/ReserveForm'
import { useI18n } from '../i18n'

export function BookPage() {
  const { t } = useI18n()

  return (
    <div className="book-page book-layout">
      <div>
        <p className="kicker dark">August Cafeteria</p>
        <h1>{t.book}</h1>
        <ReserveForm />
      </div>
      <figure className="book-photo">
        <img src="/photos/terrace.jpg" alt="Tables on the terrace" />
      </figure>
    </div>
  )
}
