export type Lang = 'hy' | 'en' | 'ru'

export type Localized = Record<Lang, string>

export type CategoryId =
  | 'aperitive'
  | 'breakfast'
  | 'yogurt'
  | 'sweet'
  | 'soup'
  | 'starter'
  | 'salad'
  | 'share'
  | 'bao'
  | 'pasta'
  | 'risotto'
  | 'pizza'
  | 'pizzetta'
  | 'sandwich'
  | 'burger'
  | 'main'
  | 'dessert'
  | 'tea'
  | 'coffee'
  | 'house'
  | 'cocktails'
  | 'alcohol'

export interface Category {
  id: CategoryId
  name: Localized
}

export interface MenuItem {
  id: string
  categoryId: CategoryId
  name: Localized
  description: Localized
  price: number
  /** Printed price when the board shows more than one number, e.g. "3200 / 3400". */
  priceLabel?: string
  image: string
  available: boolean
  featured: boolean
}

export interface HourRow {
  days: Localized
  open: string
  close: string
}

export interface SocialLink {
  label: string
  href: string
}

export interface Restaurant {
  name: string
  since: number
  tagline: Localized
  about: Localized
  address: Localized
  phones: string[]
  email: string
  facebook: string
  maps: string
  socials: SocialLink[]
  hours: HourRow[]
  aperitivo: Localized
}

export type ReservationStatus = 'new' | 'confirmed' | 'declined'

export interface Reservation {
  id: string
  name: string
  phone: string
  date: string
  time: string
  guests: number
  note: string
  status: ReservationStatus
  createdAt: string
}

export interface BreakfastCheck {
  id: string
  image: string
  createdAt: string
}

export interface BreakfastCard {
  phone: string
  label: string
  count: number
  stamps: number
  rewards: number
  approved: number
  pending: number
  checks: BreakfastCheck[]
}

export interface BreakfastSummary {
  phone: string
  label: string
  count: number
  stamps: number
  rewards: number
  approved: number
  pending: number
  latest: string
}

export interface Offer {
  image: string
  from: string
  to: string
  title: Localized
  description: Localized
  visible: boolean
}

export interface Database {
  restaurant: Restaurant
  categories: Category[]
  items: MenuItem[]
  reservations: Reservation[]
  offer: Offer
}
