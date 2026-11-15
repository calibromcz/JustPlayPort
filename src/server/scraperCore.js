import axios from 'axios'
import * as cheerio from 'cheerio'

// Mappa selettori specifici per store
const STORE_SCRAPER_CONFIG = {
  'playbazar': {
    name: 'Playbazar',
    domain: 'https://www.playbazar.it',
    searchBase: 'https://www.playbazar.it/ricerca?s=',
    selectors: [
      '.product-price-and-shipping .price',
      '.product-miniature .price',
      '.current-price',
      'span[itemprop="price"]',
      '.price',
    ],
    imageSelectors: [
      '.product-miniature img',
      '.product-cover img',
      'article.product-miniature picture img',
      'meta[property="og:image"]',
    ],
    itemContainer: '.product-miniature, article',
    outOfStockSelectors: [
      '.product-unavailable',
      '.out_of_stock',
      '.esaurito',
    ],
  },
  'weega': {
    name: 'Weega',
    domain: 'https://weega.it',
    searchBase: 'https://weega.it/search?q=',
    selectors: [
      '.price-item--regular',
      '.price-item--sale',
      '.product-price',
      '.price .money',
      '.woocommerce-Price-amount',
      '.price',
    ],
    imageSelectors: [
      '.product-item img',
      '.grid-view-item__image',
      '.card__image',
      'meta[property="og:image"]',
    ],
    itemContainer: '.product-item, .grid-view-item, .card',
    outOfStockSelectors: [
      '.badge--sold-out',
      '.price--sold-out',
    ],
  },
  'ls-giochi': {
    name: 'LS Giochi',
    domain: 'https://www.lsgiochi.it',
    searchBase: 'https://www.lsgiochi.it/search?q=',
    selectors: [
      '.price__regular .price-item--regular',
      '.price-item--sale',
      '.product-item__price',
      '.price-item',
      '.price',
    ],
    imageSelectors: [
      '.product-item img',
      '.card__image img',
      'meta[property="og:image"]',
    ],
    itemContainer: '.product-item, .card',
    outOfStockSelectors: [
      '.price--sold-out',
      '.badge--sold-out',
    ],
  },
  'dragonstore': {
    name: 'Dragonstore',
    domain: 'https://www.dragonstore.it',
    searchBase: 'https://www.dragonstore.it/risultati-ricerca.html?q=',
    selectors: [
      '.prezzo',
      '.box_prezzo',
      '.product-price',
      '.scheda_prezzo',
      '.price',
    ],
    imageSelectors: [
      '.box_prodotto img',
      '.img_prodotto img',
      'meta[property="og:image"]',
    ],
    itemContainer: '.box_prodotto, .item',
    outOfStockSelectors: [
      '.non_disponibile',
      '.esaurito',
    ],
  },
  'dungeon-dice': {
    name: 'Dungeon Dice',
    domain: 'https://www.dungeondice.it',
    searchBase: 'https://www.dungeondice.it/ricerca?s=',
    selectors: [
      '.product-price-and-shipping .price',
      '.product-miniature .price',
      'span.price',
      '.current-price',
      '.price',
    ],
    imageSelectors: [
      '.product-miniature img',
      'meta[property="og:image"]',
    ],
    itemContainer: '.product-miniature, article',
    outOfStockSelectors: [
      '.product-unavailable',
      '.esaurito',
    ],
  },
  'magic-merchant': {
    name: 'Magic Merchant',
    domain: 'https://magicmerchant.it',
    searchBase: 'https://magicmerchant.it/search?q=',
    selectors: [
      '.product-price',
      '.price',
      '.current-price',
      '.regular-price',
    ],
    imageSelectors: [
      '.product-image-photo',
      '.product-item-info img',
      'meta[property="og:image"]',
    ],
    itemContainer: '.product-item',
    outOfStockSelectors: [
      '.unavailable',
    ],
  },
  'frogames': {
    name: 'Frogames',
    domain: 'https://www.frogames.it',
    searchBase: 'https://www.frogames.it/search?q=',
    selectors: ['.price', '.product-price', '.price-item'],
    imageSelectors: ['.product-item img', 'meta[property="og:image"]'],
    itemContainer: '.product-item',
    outOfStockSelectors: ['.out_of_stock'],
  },
  'philibert': {
    name: 'Philibert',
    domain: 'https://www.philibertnet.com',
    searchBase: 'https://www.philibertnet.com/en/search?search_query=',
    selectors: ['.product-price', '.price_display', '.price'],
    imageSelectors: ['.product-image img', 'meta[property="og:image"]'],
    itemContainer: '.product-item',
    outOfStockSelectors: ['.out_of_stock'],
  },
  'boardhouse': {
    name: 'Boardhouse',
    domain: 'https://boardhousestore.com',
    searchBase: 'https://boardhousestore.com/search?q=',
    selectors: ['.price-item', '.product-price', '.price'],
    imageSelectors: ['.product-card img', 'meta[property="og:image"]'],
    itemContainer: '.product-card',
    outOfStockSelectors: ['.sold-out'],
  },
  'bottega-ludica': {
    name: 'Bottega Ludica',
    domain: 'https://bottegaludica.it',
    searchBase: 'https://bottegaludica.it/search?q=',
    selectors: ['.price', '.product-price'],
    imageSelectors: ['.product-card img', 'meta[property="og:image"]'],
    itemContainer: '.product-card',
    outOfStockSelectors: ['.esaurito'],
  },
  'dadi-e-mattoncini': {
    name: 'Dadi e Mattoncini',
    domain: 'https://www.dadiemattoncini.it',
    searchBase: 'https://www.dadiemattoncini.it/catalogsearch/result/?q=',
    selectors: ['.price-wrapper .price', '.price', '.product-price'],
    imageSelectors: ['.product-image-photo', 'meta[property="og:image"]'],
    itemContainer: '.product-item',
    outOfStockSelectors: ['.stock.unavailable'],
  },
}

// Selettori generici di fallback
const GENERIC_SELECTORS = [
  'meta[property="product:price:amount"]',
  'meta[itemprop="price"]',
  'span[itemprop="price"]',
  '.special-price',
  '.product-price',
  '.current-price',
  '.regular-price',
  '.price',
  '.money',
  '.amount',
]

const GENERIC_IMAGE_SELECTORS = [
  'meta[property="og:image"]',
  'meta[name="twitter:image"]',
  'meta[itemprop="image"]',
  '.product-cover img',
  '.product-miniature img',
  '.product-item img',
  '.product-card img',
  'article img',
]

function cleanAndExtractPrice(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  const match = rawText.replace(/\s+/g, ' ').match(/(\d{1,4}[.,]\d{2})/)
  if (!match) return null

  const normalized = match[1].replace(',', '.')
  const num = parseFloat(normalized)

  if (isNaN(num) || num <= 0 || num > 500) return null
  return Number(num.toFixed(2))
}

function normalizeImageUrl(rawUrl, baseDomain) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  let trimmed = rawUrl.trim()
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }
  if (trimmed.startsWith('/')) {
    return `${baseDomain}${trimmed}`
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return null
}

/**
 * Funzione di Web Scraping: estrae Prezzo, Disponibilità (inStock) e Immagine di Copertina
 */
export async function scrapeStorePrice(gameName, storeKey) {
  if (!gameName || !storeKey) {
    return { success: false, error: 'Parametri gameName e storeName obbligatori' }
  }

  const normalizedKey = storeKey
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const storeConfig = STORE_SCRAPER_CONFIG[normalizedKey] || {
    name: storeKey,
    domain: 'https://www.google.it',
    searchBase: `https://www.google.it/search?q=${encodeURIComponent(storeKey)}+`,
    selectors: GENERIC_SELECTORS,
    imageSelectors: GENERIC_IMAGE_SELECTORS,
    outOfStockSelectors: [],
  }

  const searchUrl = `${storeConfig.searchBase}${encodeURIComponent(gameName.trim())}`

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      timeout: 7000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
    })

    const html = response.data
    if (!html || typeof html !== 'string') {
      return { success: false, error: 'Non trovato' }
    }

    const $ = cheerio.load(html)

    // 1. Estrazione Prezzo
    let extractedPrice = null
    const selectorsToTry = [...(storeConfig.selectors || []), ...GENERIC_SELECTORS]

    for (const selector of selectorsToTry) {
      if (selector.startsWith('meta')) {
        const metaVal = $(selector).attr('content')
        extractedPrice = cleanAndExtractPrice(metaVal)
        if (extractedPrice) break
      } else {
        const el = $(selector).first()
        if (el.length > 0) {
          extractedPrice = cleanAndExtractPrice(el.text())
          if (extractedPrice) break
        }
      }
    }

    if (!extractedPrice || extractedPrice < 5) {
      return {
        success: false,
        error: 'Non trovato',
        storeName: storeConfig.name,
        searchUrl,
      }
    }

    // 2. Verifica Disponibilità del Prodotto (In Stock vs Esaurito)
    let inStock = true
    const itemContainerSelector = storeConfig.itemContainer || '.product-miniature, .product-item, .product-card'
    const targetItem = $(itemContainerSelector).first()

    if (targetItem && targetItem.length > 0) {
      const itemText = targetItem.text().toLowerCase()
      if (
        itemText.includes('esaurito') ||
        itemText.includes('non disponibile') ||
        itemText.includes('out of stock') ||
        itemText.includes('sold out')
      ) {
        inStock = false
      }

      const outSelectors = storeConfig.outOfStockSelectors || []
      for (const sel of outSelectors) {
        if (targetItem.find(sel).length > 0) {
          inStock = false
          break
        }
      }
    }

    // 3. Estrazione Immagine di Copertina del Gioco
    let coverImageUrl = null
    const imageSelectorsToTry = [...(storeConfig.imageSelectors || []), ...GENERIC_IMAGE_SELECTORS]

    for (const selector of imageSelectorsToTry) {
      if (selector.startsWith('meta')) {
        const contentUrl = $(selector).attr('content')
        if (contentUrl && !contentUrl.includes('logo') && !contentUrl.includes('placeholder')) {
          coverImageUrl = normalizeImageUrl(contentUrl, storeConfig.domain)
          if (coverImageUrl) break
        }
      } else {
        const imgEl = $(selector).first()
        if (imgEl.length > 0) {
          const src = imgEl.attr('data-src') || imgEl.attr('src') || imgEl.attr('srcset')
          if (src && !src.includes('logo') && !src.includes('placeholder') && !src.includes('icon') && !src.includes('blank')) {
            const cleanSrc = src.split(',')[0].trim().split(' ')[0]
            coverImageUrl = normalizeImageUrl(cleanSrc, storeConfig.domain)
            if (coverImageUrl) break
          }
        }
      }
    }

    return {
      success: true,
      price: extractedPrice,
      inStock,
      imageUrl: coverImageUrl,
      storeName: storeConfig.name,
      searchUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: 'Non trovato',
      details: error.message,
      storeName: storeConfig.name,
      searchUrl,
    }
  }
}
