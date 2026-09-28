import type { Category, CategoryId, Database, Localized, MenuItem } from '../types'

const L = (en: string, hy: string, ru: string): Localized => ({ en, hy, ru })

export const GALLERY = [
  '/photos/cover.jpg',
  '/photos/terrace.jpg',
  '/photos/bowl.jpg',
  '/photos/extra3.jpg',
  '/photos/extra1.jpg',
  '/photos/bake.jpg',
  '/photos/extra2.jpg',
  '/photos/pour.jpg',
  '/photos/extra9.jpg',
  '/photos/chocolate.jpg',
  '/photos/extra8.jpg',
  '/photos/extra5.jpg',
  '/photos/extra7.jpg',
  '/photos/drink.jpg',
  '/photos/green.jpg',
  '/photos/extra6.jpg',
  '/photos/extra4.jpg',
]

const categories: Category[] = [
  { id: 'aperitive', name: L('Aperitive', 'Ապերիտիվ', 'Aperitive') },
  { id: 'breakfast', name: L('Breakfast', 'Նախաճաշ', 'Breakfast') },
  { id: 'yogurt', name: L('Yogurt bowl', 'Յոգուրտ բոուլ', 'Yogurt bowl') },
  { id: 'sweet', name: L('Sweet breakfast', 'Քաղցր նախաճաշ', 'Sweet breakfast') },
  { id: 'soup', name: L('Soup', 'Ապուր', 'Soup') },
  { id: 'starter', name: L('Starter', 'Նախուտեստ', 'Starter') },
  { id: 'salad', name: L('Salad', 'Աղցան', 'Salad') },
  { id: 'share', name: L('To share', 'Միասին', 'To share') },
  { id: 'bao', name: L('Baked bao buns', 'Բաո ջեռոցում', 'Baked bao buns') },
  { id: 'pasta', name: L('Pasta', 'Պաստա', 'Pasta') },
  { id: 'risotto', name: L('Risotto', 'Ռիզոտտո', 'Risotto') },
  { id: 'pizza', name: L('Pizza', 'Պիցցա', 'Pizza') },
  { id: 'pizzetta', name: L('Pizzetta', 'Պիցետտա', 'Pizzetta') },
  { id: 'sandwich', name: L('Sandwich', 'Սենդվիչ', 'Sandwich') },
  { id: 'burger', name: L('Burger', 'Բուրգեր', 'Burger') },
  { id: 'main', name: L('Main', 'Հիմնական', 'Main') },
  { id: 'dessert', name: L('Dessert', 'Դեսերտ', 'Dessert') },
  { id: 'tea', name: L('Tea', 'Թեյ', 'Tea') },
  { id: 'coffee', name: L('Coffee', 'Սուրճ', 'Coffee') },
  { id: 'house', name: L('Made by us', 'Մեր պատրաստած', 'Made by us') },
  { id: 'cocktails', name: L('Cocktails', 'Կոկտեյլներ', 'Cocktails') },
  { id: 'alcohol', name: L('Alcoholic drinks', 'Ալկոհոլային խմիչքներ', 'Alcoholic drinks') },
]

type Extra = {
  hy?: string
  en?: string
  priceLabel?: string
  featured?: boolean
}

function dish(
  id: string,
  categoryId: CategoryId,
  hy: string,
  en: string,
  price: number,
  extra: Extra = {},
): MenuItem {
  const noteHy = extra.hy ?? ''
  const noteEn = extra.en ?? ''
  return {
    id,
    categoryId,
    name: L(en, hy, en),
    description: L(noteEn, noteHy, noteEn),
    price,
    priceLabel: extra.priceLabel,
    image: '',
    available: true,
    featured: extra.featured ?? false,
  }
}

const items: MenuItem[] = [
  dish('aperol', 'aperitive', 'Ապերոլ', 'Aperol', 1500),
  dish('martini', 'aperitive', 'Մարտինի', 'Martini', 1400),
  dish('campari-orange', 'aperitive', 'Կամպարի Նարինջ', 'Campari Orange', 2000),

  dish('shakshouka', 'breakfast', 'Շակշուկա', 'Shakshouka', 2300, { featured: true }),
  dish('omelette-tomatoes', 'breakfast', 'Լոլիկով Ձվածեղ', 'Omelette with Tomatoes', 2200),
  dish('sunny-breakfast', 'breakfast', 'Արևոտ Նախաճաշ', 'Sunny Breakfast', 3400, {
    hy: 'պեպերոնի/մոցարելլա',
    en: 'pepperoni/mozzarella',
  }),
  dish('mix-omelette', 'breakfast', 'Միքս Ձվածեղ', 'Mix Omelette', 2300),
  dish('eggs-benedict', 'breakfast', 'Ձվածեղ Բենեդիկտ', 'Eggs Benedict', 3200, {
    priceLabel: '3200 / 3400',
    hy: 'բեկոն / ծխեցրած իշխան',
    en: 'bacon / smoked trout',
  }),
  dish('eggs-en-cocotte', 'breakfast', 'Ձվածեղ "Ան Կոկոտ"', 'Eggs "En Cocotte"', 2700),
  dish('english-breakfast', 'breakfast', 'Անգլիական Նախաճաշ', 'English Breakfast', 3700),
  dish('american-breakfast', 'breakfast', 'Ամերիկյան Նախաճաշ', 'American Breakfast', 3600),
  dish('august-breakfast', 'breakfast', 'Օգոստոս Նախաճաշ', 'August Breakfast', 3600),

  dish('yogurt-strawberry', 'yogurt', 'Ելակ, Հապալաս', 'Strawberry, Blueberry', 1300),
  dish('yogurt-pineapple', 'yogurt', 'Արքայախնձոր', 'Pineapple', 1500),
  dish('yogurt-spinach', 'yogurt', 'Սպանախ, Կիվի', 'Spinach, Kiwi', 1500),

  dish('pancakes', 'sweet', 'Բլիթներ', 'Pancakes', 1800),
  dish('pancakes-cottage', 'sweet', 'Բլիթ Կաթնաշոռով', 'Pancakes with Cottage Cheese', 1800),

  dish('soup-mushroom', 'soup', 'Սնկով Կրեմ', 'Mushroom Cream', 2000),
  dish('soup-pumpkin', 'soup', 'Դդումով Կրեմ', 'Pumpkin Cream', 2000),
  dish('soup-gazpacho', 'soup', 'Գասպաչո', 'Gazpacho', 2000),
  dish('soup-pesto', 'soup', 'Պեստո', 'Pesto', 2200),

  dish('burrata', 'starter', 'Բուրրատա', 'Burrata', 4400, { featured: true }),
  dish('camembert', 'starter', 'Ջեռոցում Պատրաստված Կամեմբեր Պանիր', 'Oven Baked Camembert', 4000),
  dish(
    'mozzarella-pesto',
    'starter',
    'Մոցարելլա Չերի Լոլիկով և Պեստո Սոուսով',
    'Mozzarella with Cherry Tomatoes & Pesto Sauce',
    2900,
  ),
  dish('vegetable-plate', 'starter', 'Թարմ Բանջարեղեն 3 Սոուսով', 'Fresh Vegetable Plate with 3 sauces', 2800),
  dish('pear-blue-cheese', 'starter', 'Տանձ Բլու Չիզ Սոուսով', 'Pear with Blue Cheese Sauce', 2800),
  dish('spring-rolls', 'starter', 'Սփրինգ Ռոլ', 'Spring Rolls', 2800),
  dish('taco', 'starter', 'Տակո', 'Taco', 2400),

  dish('salad-beet', 'salad', 'Ճակնդեղ և Քինոա', 'Beetroot & Quinoa', 3200),
  dish('salad-beef', 'salad', 'Տավարի Միս', 'Beef', 4200),
  dish('salad-pork', 'salad', 'Խոզի Միս և Քաղցր սոուսով', 'Pork Meat & Sweet sauce', 3500),
  dish('salad-caesar', 'salad', 'Կեսար', 'Caesar', 3300),
  dish('salad-greek', 'salad', 'Հունական', 'Greek', 3500),
  dish('salad-chicken', 'salad', 'Հավով և Գազարով', 'Chicken & Carrot', 3000),
  dish('salad-turkey', 'salad', 'Կծու Հնդկահավ', 'Spiced Turkey', 3800),
  dish('salad-prawns', 'salad', 'Արքայական ծովախեցգետին և լապշա', 'King Prawns & Noodles', 3600),
  dish('salad-avocado', 'salad', 'Ավոկադո և Քինոա', 'Avocado & Quinoa', 3200),

  dish('cheese-platter', 'share', 'Պանրի Ափսե', 'Cheese Platter', 3200),
  dish('grilled-shrimp', 'share', 'Տապակած Ծովախեցգետին', 'Grilled Shrimp', 9000),

  dish('bao-pork', 'bao', 'Խոզի Մսով', 'Pork', 2000),
  dish('bao-beef', 'bao', 'Տավարի Մսով', 'Beef', 3200),
  dish('bao-chicken', 'bao', 'Հավի Մսով', 'Chicken', 2000),

  dish('pasta-arabiata', 'pasta', 'Արաբիատա', 'Arabiata', 2600),
  dish('pasta-bolognese', 'pasta', 'Բոլոնեզ', 'Bolognese', 3200),
  dish('pasta-boscaiola', 'pasta', 'Բոսկայոլա', 'Boscaiola', 2800),
  dish('pasta-cheese', 'pasta', 'Պանրային Սոուսով', 'Cheese', 2900),
  dish('pasta-seafood', 'pasta', 'Ծովամթերքով', 'Seafood', 3400),
  dish('pasta-carbonara', 'pasta', 'Կարբոնարա', 'Carbonara', 3000),
  dish('pasta-spinach', 'pasta', 'Սպանախով', 'Spinach', 2900),

  dish('risotto-seafood', 'risotto', 'Ծովամթերքով', 'Seafood', 4000, { featured: true }),
  dish('risotto-mushroom', 'risotto', 'Սնկով', 'Mushroom', 2500),

  dish('pizza-margherita', 'pizza', 'Մարգարիտա', 'Margherita', 3200, { featured: true }),
  dish('pizza-pepperoni', 'pizza', 'Պեպերոնի', 'Pepperoni', 3600),
  dish('pizza-quattro', 'pizza', 'Չորս Պանիր', 'Quattro Formaggi', 3400),
  dish('pizza-prosciutto', 'pizza', 'Պրոշուտո և Ռուկոլա', 'Al Prosciutto e Rucola', 4000),
  dish('pizza-mortadella', 'pizza', 'Մորտադելլա և Ստրաչատելլա', 'Mortadella e Stracciatella', 4000),
  dish('pizza-carnevale', 'pizza', 'Կառնավալե', 'Carnevale', 4200),

  dish('pizzetta-margherita', 'pizzetta', 'Մարգարիտա', 'Margherita', 1800),
  dish('pizzetta-pepperoni', 'pizzetta', 'Պեպերոնի', 'Pepperoni', 2100),
  dish('pizzetta-mortadella', 'pizzetta', 'Մորտադելլա և Ստրաչատելլա', 'Mortadella e Stracciatella', 2200),

  dish('sandwich-ham', 'sandwich', 'Խոզապուխտով և Պանրով', 'Ham & Cheese', 2300),
  dish('sandwich-blt', 'sandwich', 'ԲԻ ԷԼ ԹԻ', 'BLT', 2200),
  dish('sandwich-club', 'sandwich', 'Քլաբ', 'Club', 3400),
  dish('sandwich-chicken', 'sandwich', 'Հավով և Ավոկադոյով', 'Chicken & Avocado', 3000),
  dish('sandwich-trout', 'sandwich', 'Ծխեցված Իշխանով', 'Smoked Trout', 3300),
  dish('sandwich-mortadella', 'sandwich', 'Մորտադելլա՝ Պիստակի Հացով', 'Mortadella with Pistachio Bread', 3600),
  dish('sandwich-pulled', 'sandwich', 'Բզկտած Տավարի Մսով և Գինով', 'With Pulled Beef & Wine', 3400),
  dish('sandwich-prosciutto', 'sandwich', 'Պրոշուտո և Մոցարելլա', 'Al Prosciutto e Mozzarella', 3300),
  dish('sandwich-turkey', 'sandwich', 'Հնդկահավի Ֆիլե', 'Turkey Fillet', 3400),

  dish('burger-steak', 'burger', 'Սթեյք Բուրգեր', 'Steak Burger', 4200, { featured: true }),
  dish('burger-classic', 'burger', 'Կլասիկ Բուրգեր', 'Classic Burger', 3200),
  dish('burger-pulled', 'burger', 'Փուլդ Փորք Բուրգեր', 'Pulled Pork Burger', 3700),
  dish('burger-cheese', 'burger', 'Բուրգեր Պանրային Սոուսով', 'Burger with cheese sauce', 3700),

  dish('main-chicken', 'main', 'Հավի Ֆիլե Գրիլի վրա', 'Grilled chicken Fillet', 3800),
  dish('main-pork', 'main', 'Խոզի Գրիլ', 'Grilled Pork Chops', 5500),
  dish('main-osso', 'main', 'Օսո Բուկո', 'Osso Buco', 5500),
  dish('main-salmon', 'main', 'Սաղմոն Գրիլ', 'Grilled Salmon', 8000),
  dish('main-strip', 'main', 'Նյու Յորք Սթրիփ Սթեյք', 'New York Strip Steak', 7200),
  dish('main-tenderloin', 'main', 'Տավարի Սթեյք Թենդեռլոյն', 'Beef Steak Tenderloin', 7500),

  dish('cookies', 'dessert', 'Թխվածքներ', 'Cookies', 700),
  dish('brownie', 'dessert', 'Բրաունի', 'Brownie', 1800),
  dish('cheesecake', 'dessert', 'Չիզքեյք', 'Cheesecake', 1800),
  dish('carrot-cake', 'dessert', 'Գազարի Քեյք', 'Carrot Cake', 1700),
  dish('lemon-cake', 'dessert', 'Կիտրոնի Քեյք', 'Lemon Cake', 1900),
  dish('chocolate-cake', 'dessert', 'Շոկոլադե Քեյք', 'Chocolate Cake', 1900),
  dish('red-velvet', 'dessert', 'Ռեդ Վելվետ Քեյք', 'Red Velvet Cake', 1900),
  dish('poppy-cake', 'dessert', 'Նարնջով և կակաչի սերմով Քեյք', 'Orange Poppy Seed Cake', 1500),
  dish('mikado', 'dessert', 'Միկադո', 'Mikado', 1800),
  dish('apple-pie', 'dessert', 'Խնձորի Փայ', 'Apple Pie', 1800),
  dish('cherry-pie', 'dessert', 'Բալի Փայ', 'Cherry Pie', 1800),
  dish('cinnamon-swirls', 'dessert', 'Նարնջով և Դարչինով Խատուտիկ', 'Orange Cinnamon Swirls', 1000),
  dish('chefs-special', 'dessert', 'Շեֆ Խոհարարի Կողմից', "Chef's Special", 2400, { featured: true }),

  dish('tea', 'tea', 'Թեյ', 'Tea', 1000),
  dish('tea-herbal', 'tea', 'Հայկական Խոտաբույսերով Թեյ', 'Armenian Herbal Tea', 1100),
  dish('tea-grog', 'tea', 'Մեղրային Գրոգ', 'Honey Grog', 1700),
  dish('tea-apple', 'tea', 'Խնձորի Հյութով և Դարչինով Կանաչ Թեյ', 'Apple Cinnamon Green Tea', 1300),
  dish('tea-rooibos', 'tea', 'Կոճապղպեղով Ռոյբոս Թեյ', 'Ginger Rooibos Tea', 1300),
  dish('tea-rum', 'tea', 'Ռոմով և Նարնջով Սև Թեյ', 'Rum & Orange Black Tea', 1500),
  dish('tea-winter', 'tea', 'Ձմեռային Նարինջ', 'Winter Orange', 1500),
  dish('tea-cherry', 'tea', 'Չերի - Չերի', 'Cherry - Cherry', 1400),
  dish('tea-fruit', 'tea', 'Թարմ Մրգերով Սառը Թեյ', 'Fresh Fruit Ice Tea', 1500),
  dish('tea-matcha', 'tea', 'Մաչա Լաթե', "Iced Matcha Latte'", 1800),

  dish('coffee-august', 'coffee', 'Օգոստոս', 'August', 1200),
  dish('coffee-filtered', 'coffee', 'Ֆիլտրացված', 'Filtered', 1000),
  dish('coffee-espresso', 'coffee', 'Էսպրեսո', 'Espresso', 1100),
  dish('coffee-americano', 'coffee', 'Ամերիկանո', 'Americano', 1100),
  dish('coffee-cappuccino', 'coffee', 'Կապուչինո', 'Cappuccino', 1400),
  dish('coffee-latte', 'coffee', 'Լաթե', 'Latté', 1400),
  dish('coffee-macchiato', 'coffee', 'Կարամել Մակիատո', 'Caramel Macchiato', 2200),
  dish('coffee-pistachio', 'coffee', 'Պիստակով Կապուչինո', 'Pistachio Cappuccino', 2200),
  dish('coffee-chococino', 'coffee', 'Շոկոչինո', 'Chococino', 1700),
  dish('coffee-cinnamon', 'coffee', 'Դարչինով Կակաո Սուրճ', 'Cinnamon Cocoa Coffee', 1300),
  dish('coffee-creme', 'coffee', 'Կաֆե Կրեմ', 'Cafe Creme', 1400),
  dish('coffee-glasse', 'coffee', 'Կաֆե Գլասսե', "Cafe Glasse'", 1500),
  dish('coffee-affogato', 'coffee', 'Աֆոգատո', 'Affogato', 1400),
  dish('coffee-frappuccino', 'coffee', 'Ֆրապուչինո', 'Frappuccino', 2500, {
    hy: 'շոկոլադ, կարամել, օրեո',
    en: 'chocolate, caramel, oreo',
  }),

  dish('sangria', 'house', 'Սանգրիա', 'Sangria', 2100, { priceLabel: '2100 / 7500' }),
  dish('glintwine', 'house', 'Գլինտվայն', 'Glintwine', 1500),

  dish('bloody-mary', 'cocktails', 'Բլադի Մերի', 'Bloody Mary', 2400),
  dish('espresso-martini', 'cocktails', 'Էսպրեսո Մարտինի', 'Espresso Martini', 2200),
  dish('el-diablo', 'cocktails', 'Էլ Դիաբլո', 'El Diablo', 2800),
  dish('moscow-mule', 'cocktails', 'Մոսքոու Մյուլ', 'Moscow Mule', 2800),
  dish('mojito', 'cocktails', 'Մոհիտո', 'Mojito', 2900, {
    hy: 'դասական, ելակ',
    en: 'classic, strawberry',
  }),
  dish('margarita', 'cocktails', 'Մարգարիտա', 'Margarita', 2800, {
    hy: 'դասական, ելակ',
    en: 'classic, strawberry',
  }),
  dish('summertime', 'cocktails', 'Սամրթայմ', 'Summertime', 2900),
  dish('long-island', 'cocktails', 'Լոնգ Այլենդ Սառը Թեյ', 'Long Island Ice Tea', 3000),
  dish('gin-fizz', 'cocktails', 'Ջին Ֆիզ', 'Gin Fizz', 2400),
  dish('aperol-spritz', 'cocktails', 'Ապերոլ Շպրից', 'Aperol Spritz', 2500),
  dish('hugo', 'cocktails', 'Հյուգո', 'Hugo', 2400),

  dish('jack-daniels', 'alcohol', "Ջեք Դենիելս", "Jack Daniel's", 2600),
  dish('jameson', 'alcohol', 'Ջեյմսոն', 'Jameson', 2300),
  dish('chivas', 'alcohol', 'Չիվաս Ռեգալ (12տ.)', 'Chivas Regal (12y.)', 3100),
  dish('black-label', 'alcohol', 'Բլեք Լեյբլ', 'Black Label', 3100),
  dish('bacardi', 'alcohol', 'Բակարդի', 'Bacardi', 1800),
  dish('havana', 'alcohol', 'Հավանա Քլաբ', 'Havana Club', 2100),
  dish('beefeater', 'alcohol', 'Բիֆիթեր', 'Beefeater', 1400),
  dish('bombay', 'alcohol', 'Բոմբեյ Սափֆիր', 'Bombay Sapphire', 2100),
  dish('hendricks', 'alcohol', "Հենդրիքս", "Hendrik's", 3600),
  dish('olmeca', 'alcohol', 'Օլմեկա', 'Olmeca', 2000),
  dish('patron', 'alcohol', 'Պատրոն', 'Patron', 4800),
  dish('akhtamar', 'alcohol', 'Ախթամար', 'Akhtamar', 2900),
  dish('nairi', 'alcohol', 'Նաիրի', 'Nairi', 5700),
]

export function createSeed(): Database {
  return {
    restaurant: {
      name: 'August Cafeteria',
      since: 2015,
      tagline: L(
        'A retro room. A kitchen that is not retro at all.',
        'Ռետրո սրահ։ Խոհանոց, որ բոլորովին ռետրո չէ։',
        'Ретро-зал. Кухня, которая совсем не ретро.',
      ),
      about: L(
        'August has stood at the foot of the Cascade since 2015, on Tamanyan Street. Edison lamps, a round wooden sign, cream plates with a green rim, and a terrace under the trees. Breakfast runs long, the burgers are large, and the evening is for wine, cake and a second coffee.',
        'August-ը Կասկադի ստորոտում է 2015-ից, Թամանյան փողոցում։ Էդիսոնի լամպեր, կլոր փայտե ցուցանակ, կանաչ եզրով սերուցքագույն ափսեներ և պատշգամբ ծառերի տակ։ Նախաճաշը երկար է, բուրգերները մեծ են, իսկ երեկոն գինու, տորթի և երկրորդ սուրճի համար է։',
        'August стоит у подножия Каскада с 2015 года, на улице Таманяна. Лампы Эдисона, круглая деревянная вывеска, кремовые тарелки с зелёным ободком и терраса под деревьями. Завтрак долгий, бургеры большие, а вечер — для вина, торта и второй чашки кофе.',
      ),
      address: L(
        '2/29–30 Tamanyan Street, Kentron, Yerevan',
        'Թամանյան փող. 2/29–30, Կենտրոն, Երևան',
        'ул. Таманяна 2/29–30, Кентрон, Ереван',
      ),
      phones: ['+374 10 588505', '+374 94 568505'],
      email: 'augustcafeteria@gmail.com',
      facebook: 'https://www.facebook.com/augustcafeyerevan',
      maps: 'https://www.google.com/maps/search/?api=1&query=August+Cafeteria+Tamanyan+2+Yerevan',
      socials: [
        { label: 'Facebook', href: 'https://www.facebook.com/augustcafeyerevan' },
        { label: 'Instagram', href: 'https://www.instagram.com/augustcafeteria/' },
      ],
      hours: [
        { days: L('Monday', 'Երկուշաբթի', 'Понедельник'), open: '11:00', close: '00:00' },
        {
          days: L('Tuesday – Sunday', 'Երեքշաբթի – կիրակի', 'Вторник – воскресенье'),
          open: '09:00',
          close: '00:00',
        },
      ],
      aperitivo: L(
        'Every day, 14:00–18:00',
        'Ամեն օր, 14:00–18:00',
        'Каждый день, 14:00–18:00',
      ),
    },
    categories,
    items,
    reservations: [],
    offer: {
      image: '',
      from: '',
      to: '',
      title: L('', '', ''),
      description: L('', '', ''),
      visible: false,
    },
  }
}
