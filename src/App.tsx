import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { I18nProvider } from './i18n'
import { AdminPage } from './pages/AdminPage'
import { BookPage } from './pages/BookPage'
import { BreakfastPage } from './pages/BreakfastPage'
import { HomePage } from './pages/HomePage'
import { MenuPage } from './pages/MenuPage'

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="breakfast" element={<BreakfastPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}
