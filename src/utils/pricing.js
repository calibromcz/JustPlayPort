/**
 * Utility per il parsing dello sconto, il calcolo dei prezzi con quantità
 * e la formattazione dei messaggi WhatsApp per singolo negozio.
 */

/**
 * REQUISITO: Parsing Intelligente del Prezzo e Prezzo di Listino.
 * Se l'utente scrive o incolla diciture con doppio prezzo, es:
 * - "€ 80 barrato - € 60 vendita"
 * - "80 barrato 60"
 * - "80 - 60"
 * - "80 / 60"
 * - "listino 80 sconto 60"
 * - "80€ (ora 60€)"
 * Il sistema estrae automaticamente:
 * - listPrice: 80.00 (prezzo di listino / barrato)
 * - salePrice: 60.00 (prezzo di vendita effettivo da pagare)
 * - hasExplicitList: true
 * Se invece è presente un solo numero (es. "49.90"), listPrice = salePrice = 49.90.
 */
/**
 * REQUISITO: Parsing del Prezzo e Prezzo di Listino.
 * Legge esclusivamente la stringa del prezzo inserita (raw input).
 * Se l'utente scrive o incolla diciture con doppio prezzo, es:
 * - "€ 80 barrato - € 60 vendita"
 * - "80 barrato 60"
 * - "80 - 60"
 * - "80 / 60"
 * - "listino 80 sconto 60"
 * - "80€ (ora 60€)"
 * Il sistema estrae:
 * - listPrice: 80.00 (prezzo di listino / barrato)
 * - salePrice: 60.00 (prezzo di vendita effettivo da pagare)
 * - hasExplicitList: true
 * Se invece è presente un solo numero (es. "25,99" o "49.90"), listPrice = salePrice = 25.99.
 * Gestisce correttamente la virgola italiana convertendola in punto.
 * Non cerca MAI numeri all'infuori del campo prezzo stesso.
 */
export function parsePriceInputWithList(input) {
  const cleanInput = typeof input === 'string' ? input.trim() : (input !== undefined && input !== null ? String(input).trim() : '')
  if (!cleanInput) {
    return { listPrice: 0, salePrice: 0, hasExplicitList: false }
  }

  // Cerca pattern espliciti nel solo campo input: "80 barrato ... 60" o "listino 80 ... 60"
  const regexKeyword = /(?:€\s*)?(\d+(?:[.,]\d+)?)\s*(?:€\s*)?(?:barrato|listino|originale|partenza|prima)\b[^\d]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i
  const matchKeyword = cleanInput.match(regexKeyword)
  if (matchKeyword) {
    const p1 = parseFloat(matchKeyword[1].replace(',', '.'))
    const p2 = parseFloat(matchKeyword[2].replace(',', '.'))
    if (!isNaN(p1) && !isNaN(p2) && p1 > 0 && p2 > 0) {
      return {
        listPrice: Number(p1.toFixed(2)),
        salePrice: Number(p2.toFixed(2)),
        hasExplicitList: true,
      }
    }
  }

  // Cerca separatori classici tra 2 numeri nel solo campo input: "80 - 60", "80 / 60", "80 -> 60", "80 | 60", "80 vendita 60"
  const regexSeparated = /(?:€\s*)?(\d+(?:[.,]\d+)?)\s*(?:€\s*)?[-\/—>|e\s]+(?:vendita|scontato|sconto|ora|netto)?\s*(?:€\s*)?(\d+(?:[.,]\d+)?)/i
  const matchSep = cleanInput.match(regexSeparated)
  if (matchSep) {
    const p1 = parseFloat(matchSep[1].replace(',', '.'))
    const p2 = parseFloat(matchSep[2].replace(',', '.'))
    if (!isNaN(p1) && !isNaN(p2) && p1 > 0 && p2 > 0) {
      const listP = Math.max(p1, p2)
      const saleP = Math.min(p1, p2)
      return {
        listPrice: Number(listP.toFixed(2)),
        salePrice: Number(saleP.toFixed(2)),
        hasExplicitList: listP > saleP,
      }
    }
  }

  // Estrazione generica di tutti i numeri nel solo campo input
  const allNums = cleanInput.replace(/,/g, '.').match(/\d+(?:\.\d+)?/g)
  if (allNums && allNums.length >= 2) {
    const n1 = parseFloat(allNums[0])
    const n2 = parseFloat(allNums[1])
    if (!isNaN(n1) && !isNaN(n2) && n1 > 0 && n2 > 0 && n1 !== n2) {
      const listP = Math.max(n1, n2)
      const saleP = Math.min(n1, n2)
      return {
        listPrice: Number(listP.toFixed(2)),
        salePrice: Number(saleP.toFixed(2)),
        hasExplicitList: true,
      }
    }
  }

  // Singolo numero standard (gestione virgola italiana)
  const single = parseFloat(cleanInput.replace(',', '.'))
  const validSingle = (!isNaN(single) && single > 0) ? Number(single.toFixed(2)) : 0
  return {
    listPrice: validSingle,
    salePrice: validSingle,
    hasExplicitList: false,
  }
}

export function parseDiscount(discountStr) {
  if (!discountStr || typeof discountStr !== 'string') {
    return {
      hasDiscount: false,
      percent: 0,
      multiplier: 1,
      badge: null,
      isConditional: false,
    }
  }

  const match = discountStr.match(/(\d+)\s*%/)
  const percent = match ? parseInt(match[1], 10) : 0
  const isConditional = discountStr.toLowerCase().includes('sopra')

  return {
    hasDiscount: percent > 0,
    percent,
    multiplier: 1 - percent / 100,
    badge: `-${percent}%`,
    isConditional,
  }
}

/**
 * REQUISITO 4: Calcolo Automatico con Flag Offerta:
 * - Se "Già in offerta sul sito" è SPUNTATO: non applicare sconti. Il prezzo è (Prezzo Inserito * Quantità).
 * - Se NON È SPUNTATO: applica lo sconto del negozio: [(Prezzo Inserito - (Prezzo Inserito * Sconto / 100)) * Quantità].
 */
export function calculateItemPriceWithQuantity(rawPriceInput, discountStr, quantity = 1, isAlreadyOnSale = false) {
  const numericPrice = typeof rawPriceInput === 'number'
    ? rawPriceInput
    : parseFloat(String(rawPriceInput).replace(',', '.')) || 0

  const cleanRawPrice = Number(numericPrice.toFixed(2))
  const cleanQuantity = Math.max(1, parseInt(quantity, 10) || 1)
  const discountInfo = parseDiscount(discountStr)

  // Caso 1: Già in offerta sul sito (sconto gruppo bloccato)
  if (isAlreadyOnSale) {
    const finalPrice = Number((cleanRawPrice * cleanQuantity).toFixed(2))
    return {
      rawUnitPrice: cleanRawPrice,
      rawTotalPrice: finalPrice,
      unitDiscountedPrice: cleanRawPrice,
      finalPrice,
      quantity: cleanQuantity,
      hasDiscount: false,
      isAlreadyOnSale: true,
      discountPercent: 0,
      discountBadge: 'Offerta Sito',
      savings: 0,
    }
  }

  // Caso 2: Applica normalmente lo sconto del negozio
  const unitDiscountedPrice = discountInfo.hasDiscount
    ? Number((cleanRawPrice - (cleanRawPrice * discountInfo.percent / 100)).toFixed(2))
    : cleanRawPrice

  const finalPrice = Number((unitDiscountedPrice * cleanQuantity).toFixed(2))
  const rawTotalPrice = Number((cleanRawPrice * cleanQuantity).toFixed(2))
  const savings = Number((rawTotalPrice - finalPrice).toFixed(2))

  return {
    rawUnitPrice: cleanRawPrice,
    rawTotalPrice,
    unitDiscountedPrice,
    finalPrice,
    quantity: cleanQuantity,
    hasDiscount: discountInfo.hasDiscount,
    isAlreadyOnSale: false,
    discountPercent: discountInfo.percent,
    discountBadge: discountInfo.badge,
    savings,
  }
}

/**
 * REQUISITO 6: Condivisione Intelligente raggruppata per Utente:
 * 🛒 [Nome Negozio] - Totale: [Totale]€ (Spedizione Gratuita Raggiunta! 🦥)
 * 👤 [Nome Utente]:
 * - [Quantità]x [Nome Gioco] ([Prezzo Finale Calcolato]€)
 * 💰 Quota [Nome Utente]: [Totale Utente]€
 */
export function formatSingleStoreShare(shop, items = []) {
  const storeTotal = items.reduce((sum, it) => sum + (it.prezzo || 0), 0)
  const threshold = shop.freeShipping || 49
  const isReached = storeTotal >= threshold && threshold > 0
  const remaining = Math.max(0, threshold - storeTotal)

  const flightHeader = shop.flightCode ? `[${shop.flightCode} • ${shop.gate}]` : `[${shop.name}]`
  const statusText = isReached
    ? 'Decollo autorizzato! Spedizione Gratuita Raggiunta! ✈️'
    : `Mancano ${remaining.toFixed(2)}€ al decollo gratuito`

  let text = `✈️ Just Play Port - Volo ${shop.name} ${flightHeader}\n`
  text += `📦 Totale Imbarcato: ${storeTotal.toFixed(2)}€ (${statusText})\n`

  if (items.length === 0) {
    text += `\nNessun gioco imbarcato al gate.`
    return text
  }

  // Raggruppamento per passeggero con somma quote
  const userGroups = {}
  items.forEach((it) => {
    const user = it.nome_utente || 'Passeggero'
    if (!userGroups[user]) {
      userGroups[user] = {
        items: [],
        total: 0,
      }
    }
    userGroups[user].items.push(it)
    userGroups[user].total += (it.prezzo || 0)
  })

  Object.entries(userGroups).forEach(([userName, group]) => {
    text += `\n👤 Passeggero: ${userName}\n`
    group.items.forEach((it) => {
      const q = it.quantita || 1
      const payLabel = it.metodo_pagamento
        ? ` [${it.metodo_pagamento === 'Satispay' ? '🔴 Satispay' : it.metodo_pagamento === 'PayPal' ? '🅿️ PayPal' : '💵 Contanti'}]`
        : ''
      text += `- 🎲 ${q}x ${it.nome_gioco} (${it.prezzo.toFixed(2)}€)${payLabel}\n`
    })
    text += `💰 Quota Imbarco ${userName}: ${group.total.toFixed(2)}€\n`
  })

  return text
}

/**
 * REQUISITO 2: Generazione Distinta di Volo per chi effettua fisicamente l'acquisto:
 * 📦 ORDINE [Nome Negozio]
 * ---
 * [Quantità]x [Nome Gioco]
 * 👤 [Nome Utente] | 💰 €[Prezzo] | 💳 Pagamento: [Metodo scelto (es. 🔴 Satispay)]
 * ---
 * [Ripetere per ogni riga...]
 * Totale Gate: €[Totale]
 */
export function generateDistintaDiVolo(shopName, items = []) {
  const groupedMap = new Map()

  items.forEach((it) => {
    const normGame = (it.nome_gioco || '').trim()
    const normUser = (it.nome_utente || 'Passeggero').trim()
    const normPay = it.metodo_pagamento || 'Non specificato'
    const key = `${normGame.toLowerCase()}:::${normUser.toLowerCase()}:::${normPay.toLowerCase()}`

    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key)
      existing.quantita += (it.quantita || 1)
      existing.prezzo += (it.prezzo || 0)
    } else {
      groupedMap.set(key, {
        nome_gioco: normGame,
        nome_utente: normUser,
        quantita: it.quantita || 1,
        prezzo: it.prezzo || 0,
        metodo_pagamento: normPay,
      })
    }
  })

  const formatPay = (method) => {
    if (!method || method === 'Non specificato') return 'Non specificato'
    if (method === 'Satispay') return '🔴 Satispay'
    if (method === 'PayPal') return '🅿️ PayPal'
    if (method === 'Contanti') return '💵 Contanti'
    return method
  }

  const lines = [`📦 ORDINE ${shopName}`, '---']
  let gateTotal = 0

  groupedMap.forEach((entry) => {
    gateTotal += entry.prezzo
    lines.push(`${entry.quantita}x ${entry.nome_gioco}`)
    lines.push(`👤 ${entry.nome_utente} | 💰 €${entry.prezzo.toFixed(2)} | 💳 Pagamento: ${formatPay(entry.metodo_pagamento)}`)
    lines.push('---')
  })

  lines.push(`Totale Gate: €${gateTotal.toFixed(2)}`)
  return lines.join('\n')
}

/**
 * REQUISITO 3: Genera il Manifesto d'Imbarco per gli appunti con metadati d'ordine:
 * ✈️ MANIFESTO D'IMBARCO
 * 📍 Negozio: [Nome Negozio]
 * 📅 Data: 17 Ottobre 2026
 * 🔖 Riferimento: Ordine #01
 * -----------------------------------
 * [Elenco giochi per socio, quantità e pagamenti]
 * -----------------------------------
 * 💰 TOTALE GATE: € [Totale]
 */
export function generateManifestoImbarco(shopName, items = [], orderRef = 'Ordine #01', orderDate = null, shippingInfo = null) {
  const groupedMap = new Map()
  const userTotalsMap = new Map()

  items.forEach((it) => {
    const normGame = (it.nome_gioco || it.title || 'Gioco').trim()
    const normUser = (it.nome_utente || it.passenger || 'Socio').trim()
    const normPay = (it.metodo_pagamento || it.paymentMethod || 'Contanti').trim()
    const url = (it.url || it.link || '').trim()
    const rawPrice =
      typeof it.prezzo === 'number'
        ? it.prezzo
        : typeof it.price === 'number'
        ? it.price
        : parseFloat(it.prezzo || it.price) || 0
    const qty = it.quantita || it.quantity || 1
    const linePrice = rawPrice * qty

    const listPriceUnit =
      it.prezzo_listino_unitario !== undefined
        ? Number(it.prezzo_listino_unitario) || rawPrice
        : it.prezzo_listino_totale !== undefined && qty > 0
        ? Number(it.prezzo_listino_totale) / qty
        : rawPrice
    const lineListPrice = Number((listPriceUnit * qty).toFixed(2))

    const key = `${normGame.toLowerCase()}:::${normUser.toLowerCase()}:::${normPay.toLowerCase()}:::${url.toLowerCase()}`

    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key)
      existing.quantita += qty
      existing.prezzo += linePrice
      existing.prezzoListino += lineListPrice
    } else {
      groupedMap.set(key, {
        nome_gioco: normGame,
        nome_utente: normUser,
        quantita: qty,
        prezzo: linePrice,
        prezzoListino: lineListPrice,
        metodo_pagamento: normPay,
        url,
      })
    }

    if (userTotalsMap.has(normUser)) {
      userTotalsMap.set(normUser, userTotalsMap.get(normUser) + linePrice)
    } else {
      userTotalsMap.set(normUser, linePrice)
    }
  })

  const formatPay = (method) => {
    const m = (method || '').toLowerCase()
    if (m.includes('satispay')) return '🔴 Satispay'
    if (m.includes('paypal')) return '🅿️ PayPal'
    if (m.includes('contanti')) return '💵 Contanti'
    return method || '💵 Contanti'
  }

  // Se non specificata, calcola data corrente es. "17 Ottobre 2026"
  let dateFormatted = orderDate
  if (!dateFormatted) {
    const now = new Date()
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
    ]
    dateFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
  }

  const isForced = Boolean(shippingInfo?.isForced)
  const quotaPerPassenger = isForced ? (shippingInfo?.quotaPerPassenger || 0) : 0
  const shippingCost = isForced ? (shippingInfo?.shippingCost || 0) : 0

  const lines = [
    '✈️ DISTINTA DI PARTENZA',
    `📍 Negozio: ${shopName}`,
    `📅 Data: ${dateFormatted}`,
    `🔖 Riferimento: ${orderRef}`,
    isForced ? `🚚 STATO: VOLO FORZATO (Quota Sped.: € ${quotaPerPassenger.toFixed(2)} / socio)` : '',
    '-----------------------------------',
  ].filter(Boolean)

  let gateTotal = 0

  groupedMap.forEach((entry) => {
    gateTotal += entry.prezzo
    lines.push(`📦 ${entry.quantita}x ${entry.nome_gioco}`)
    lines.push(`👤 ${entry.nome_utente}`)
    if (entry.url) {
      lines.push(`🔗 Link: ${entry.url}`)
    }
    lines.push(`💳 ${formatPay(entry.metodo_pagamento)}`)
    if (entry.prezzoListino > entry.prezzo) {
      lines.push(`🏷️ Listino: € ${entry.prezzoListino.toFixed(2)} | Prezzo Scontato: € ${entry.prezzo.toFixed(2)}`)
    } else {
      lines.push(`💰 Prezzo: € ${entry.prezzo.toFixed(2)}`)
    }
    lines.push('-----------------------------------')
  })

  if (isForced && userTotalsMap.size > 0) {
    lines.push('📋 RIEPILOGO UTENTI (TOTALE DA PAGARE):')
    userTotalsMap.forEach((userItemsTotal, userName) => {
      const userFinalTotal = userItemsTotal + quotaPerPassenger
      lines.push(`👤 ${userName}: Giochi € ${userItemsTotal.toFixed(2)} + Quota Sped. (Forzato) € ${quotaPerPassenger.toFixed(2)} = Totale da pagare € ${userFinalTotal.toFixed(2)}`)
    })
    lines.push('-----------------------------------')
    lines.push(`🚚 Spedizione Forzata: € ${shippingCost.toFixed(2)}`)
    lines.push(`💰 TOTALE GATE: € ${(gateTotal + shippingCost).toFixed(2)}`)
  } else {
    lines.push(`💰 TOTALE GATE: € ${gateTotal.toFixed(2)}`)
  }

  return lines.join('\n')
}

/**
 * REQUISITO: SCONTO DINAMICO PER DRAGONSTORE (0% Base -> 32% se Totale Listino >= 300€ oppure se Ordine Forzato)
 * 1. Inserimento: L'utente inserisce il Prezzo di Listino intero (0% sconto iniziale).
 * 2. Somma Listini: La soglia somma ESCLUSIVAMENTE i prezzi di listino interi di tutti i giochi nel Gate.
 * 3. Sblocco Sconto 32%: Al raggiungimento di 300€ (o con Forza Ordine), applica automaticamente a cascata il 32% di sconto (prezzo * 0.68).
 * 4. Sotto soglia (< 300€): Sconto 0% (prezzo pieno).
 */
export function calculateDragonstoreDiscount(items = [], ordineForzato = false) {
  // Somma ESCLUSIVA dei prezzi di listino originali interi di tutti i giochi nel Gate
  const rawProductsTotal = items.reduce((sum, it) => {
    const listPrice = it.prezzo_listino_totale !== undefined
      ? it.prezzo_listino_totale
      : (it.prezzo_listino_unitario ? it.prezzo_listino_unitario * (it.quantita || 1) : it.prezzo || 0)
    return sum + (typeof listPrice === 'number' ? listPrice : parseFloat(listPrice) || 0)
  }, 0)

  const cleanRawTotal = Number(rawProductsTotal.toFixed(2))
  const isSuperDiscount = cleanRawTotal >= 300 || Boolean(ordineForzato)

  // Quando la somma totale a prezzo pieno del Gate "Dragon Store" è >= 300€ (o ordine forzato), sconto 32%, altrimenti 0%
  const percent = isSuperDiscount ? 32 : 0
  const multiplier = isSuperDiscount ? 0.68 : 1.0
  const remainingToDiscount = Math.max(0, Number((300 - cleanRawTotal).toFixed(2)))
  const discountedTotal = Number((cleanRawTotal * multiplier).toFixed(2))

  return {
    rawProductsTotal: cleanRawTotal, // Somma ESCLUSIVA listini interi
    percent,
    multiplier,
    isSuperDiscount,
    remainingToDiscount,
    discountedTotal,
    isForcedBaseDiscount: false,
  }
}

/**
 * Restituisce gli articoli ricalcolati con sconto 0% o sconto 32% (se listini >= 300€ o forzato) per Dragonstore.
 */
export function getShopEffectiveItems(shop, items = []) {
  const isDragonstore = shop?.id === 'dragonstore' || shop?.name?.toLowerCase().includes('dragonstore')
  if (!isDragonstore) return items

  const { percent, multiplier } = calculateDragonstoreDiscount(items, shop?.ordineForzato)

  return items.map((it) => {
    const listPrice = it.prezzo_listino_totale !== undefined
      ? it.prezzo_listino_totale
      : (it.prezzo_listino_unitario ? it.prezzo_listino_unitario * (it.quantita || 1) : it.prezzo || 0)

    const cleanListPrice = typeof listPrice === 'number' ? listPrice : parseFloat(listPrice) || 0
    const qty = it.quantita || 1

    // Ricalcolo: 32% se listini >= 300€ o forzato, altrimenti 0%
    const discounted = Number((cleanListPrice * multiplier).toFixed(2))
    const savings = Number((cleanListPrice - discounted).toFixed(2))

    return {
      ...it,
      prezzo: discounted,
      prezzo_listino_totale: cleanListPrice,
      prezzo_listino_unitario: Number((cleanListPrice / qty).toFixed(2)),
      risparmio: savings,
      discount_badge: percent > 0 ? `-${percent}%` : null,
    }
  })
}


