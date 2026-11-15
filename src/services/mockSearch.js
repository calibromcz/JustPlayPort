import { SHOPS_DATA } from '../data/stores.js'
import { calculateEffectiveStorePrice } from '../utils/pricing.js'

// Immagini di alta qualità ed eleganti di giochi da tavolo su Unsplash
const BOARD_GAME_COVERS = [
  'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=600&h=600&q=80', // Catan / scatola e plancia
  'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=600&h=600&q=80', // Dadi e carte
  'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=600&h=600&q=80', // Meeples e token colorati
  'https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?auto=format&fit=crop&w=600&h=600&q=80', // Gioco strategico da tavolo
  'https://images.unsplash.com/photo-1585504198199-20277593b94f?auto=format&fit=crop&w=600&h=600&q=80', // Pezzi e scatola gioco
]

/**
 * Funzione mock che simula la ricerca di un gioco con ritardo di rete (1.5 secondi)
 * Implementa la NUOVA REGOLA DI BUSINESS per la cumulabilità degli sconti:
 * - Se prezzoSito < prezzoListino (già in offerta sul sito): lo sconto gruppo NON si applica. Prezzo finale = prezzoSito.
 * - Se prezzoSito === prezzoListino: applica normalmente lo sconto gruppo.
 */
export function simulateSearch(query) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleanTitle = (query || 'Gioco da Tavolo').trim()

      // Determina l'immagine di copertina in base al titolo (hash coerente) o fallback
      const hash = cleanTitle.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      const imageUrl = BOARD_GAME_COVERS[hash % BOARD_GAME_COVERS.length]

      // Seleziona casualmente 3 o 4 negozi della nostra lista specializzata
      const count = Math.random() > 0.5 ? 4 : 3
      const shuffled = [...SHOPS_DATA].sort(() => 0.5 - Math.random())
      const selectedShops = shuffled.slice(0, count)

      // 1. Prezzo di Listino ufficiale del gioco (es. 48.00€ - 58.00€ con centesimi realistici)
      const basePrices = [45.00, 48.00, 49.90, 52.00, 54.90, 59.90]
      const prezzoListino = basePrices[hash % basePrices.length]

      // 2. Per ogni negozio, genera prezzoListino e prezzoSito (a volte uguale, a volte in offerta)
      const availableStores = selectedShops.map((shop, idx) => {
        // Garantisce che tra i negozi selezionati ci sia un mix chiaro tra offerta del sito e sconto gruppo
        const shouldHaveSitePromo = idx % 2 === 1

        let prezzoSito = prezzoListino
        if (shouldHaveSitePromo) {
          // Offerta sul sito: sconto dal 10% al 22% sul listino
          const siteDiscounts = [0.12, 0.15, 0.18, 0.20]
          const disc = siteDiscounts[idx % siteDiscounts.length]
          prezzoSito = Number((prezzoListino * (1 - disc)).toFixed(2))
        }

        // Calcola l'effettivo prezzo finale applicando la regola di cumulabilità
        const pricing = calculateEffectiveStorePrice(prezzoListino, prezzoSito, shop.discount)

        return {
          shop,
          priceData: {
            prezzoListino,
            prezzoSito,
            originalPrice: prezzoListino, // retrocompatibilità
            finalPrice: pricing.finalPrice,
            savings: pricing.savings,
            isSitePromo: pricing.isSitePromo,
            groupDiscountApplied: pricing.groupDiscountApplied,
            badgeText: pricing.badgeText,
            shortBadge: pricing.shortBadge,
            note: pricing.note,
            discountInfo: pricing.discountInfo,
            inStock: true,
            success: true,
            imageUrl,
            sourceUrl: `${shop.searchUrl}${encodeURIComponent(cleanTitle)}`,
          },
        }
      })

      // Identifica il negozio con il prezzo più basso (Miglior Prezzo)
      let lowestPrice = Infinity
      availableStores.forEach((entry) => {
        if (entry.priceData.finalPrice < lowestPrice) {
          lowestPrice = entry.priceData.finalPrice
        }
      })

      const storesWithBest = availableStores.map((entry) => ({
        ...entry,
        isBestPrice: entry.priceData.finalPrice === lowestPrice,
      }))

      resolve({
        gameName: cleanTitle,
        imageUrl,
        availableStores: storesWithBest,
      })
    }, 1500)
  })
}
