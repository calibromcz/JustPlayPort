import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { getFormattedOrderDate, getShopOrderReference } from './pdfExport.js'

/**
 * Helper per formattare importi in Euro stringa es. "49,90" o numero
 */
const formatPriceVal = (val) => {
  if (val === undefined || val === null || val === '') return '0,00'
  const num = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(num)) return '0,00'
  return num.toFixed(2).replace('.', ',')
}

/**
 * REQUISITO 2 & 3:
 * Esportazione File Excel (.xlsx) con XLSX.utils.json_to_sheet
 * Compatibilità al 100% con Apple Numbers (Mac/iPad/iPhone) e Microsoft Excel.
 * Tabella piatta con intestazioni chiare a partire dalla colonna A, nessuna riga vuota iniziale
 * e larghezze colonne esplicite impostate con ws['!cols'].
 */
export async function exportGateExcel(shop, items = [], orderRef = null, orderDate = null, shippingInfo = null) {
  if (!items || items.length === 0) {
    alert('Nessun gioco imbarcato per questo Gate.')
    return false
  }

  const isDragonstore = shop?.id === 'dragonstore' || shop?.name?.toLowerCase().includes('dragonstore')

  // DATA ODIERNA O FORMATTATA GG-MM-AAAA
  const now = new Date()
  const dayStr = String(now.getDate()).padStart(2, '0')
  const monthStr = String(now.getMonth() + 1).padStart(2, '0')
  const yearStr = String(now.getFullYear())
  const dateFormattedHyphen = `${dayStr}-${monthStr}-${yearStr}`

  // =========================================================================
  // REQUISITO 3: MODULO EXCEL / NUMBERS DEDICATO SOLO AL GATE "DRAGON STORE"
  // =========================================================================
  if (isDragonstore) {
    // Raggruppa i giochi identici per Titolo + Socio + Metodo di Pagamento + Link
    const dragonMap = new Map()

    items.forEach((it) => {
      const title = (it.nome_gioco || it.title || it.gioco || 'Gioco').trim()
      const passenger = (it.nome_utente || it.passenger || it.utente || it.nome || 'Socio').trim()
      const payment = (it.metodo_pagamento || it.paymentMethod || it.pagamento || 'Contanti').trim()
      const qty = Number(it.quantita || it.quantity || 1) || 1

      const rawFinalPrice =
        typeof it.prezzo === 'number'
          ? it.prezzo
          : typeof it.price === 'number'
            ? it.price
            : parseFloat(it.prezzo || it.price) || 0

      const isOffer = Boolean(it.is_offerta_sito || it.is_already_on_sale)

      // Il Prezzo di Listino è immutabile: legge i campi dedicati se presenti, altrimenti rawFinalPrice (MAI calcoli inversi)
      let listPriceUnit = rawFinalPrice
      if (it.prezzo_listino_unitario !== undefined && it.prezzo_listino_unitario !== null) {
        listPriceUnit = Number(it.prezzo_listino_unitario) || rawFinalPrice
      } else if (it.prezzo_listino !== undefined && it.prezzo_listino !== null) {
        listPriceUnit = Number(it.prezzo_listino) || rawFinalPrice
      } else if (it.prezzo_listino_totale !== undefined && it.prezzo_listino_totale !== null && qty > 0) {
        listPriceUnit = Number(it.prezzo_listino_totale) / qty
      }

      const totalListPrice = Number((listPriceUnit * qty).toFixed(2))
      const totalPrice = Number((rawFinalPrice * qty).toFixed(2))

      const key = `${passenger}:::${title}:::${payment}`
      if (dragonMap.has(key)) {
        const prev = dragonMap.get(key)
        prev.quantity += qty
        prev.totalListPrice = Number((prev.totalListPrice + totalListPrice).toFixed(2))
        prev.totalPrice = Number((prev.totalPrice + totalPrice).toFixed(2))
      } else {
        dragonMap.set(key, {
          passenger,
          title,
          quantity: qty,
          totalListPrice,
          totalPrice,
          payment,
          isOffer,
        })
      }
    })

    // Raggruppa e ordina per Acquirente (alfabetico)
    const sortedDragonItems = Array.from(dragonMap.values()).sort((a, b) =>
      a.passenger.localeCompare(b.passenger, 'it', { sensitivity: 'base' })
    )

    // Colonne esatte richieste:
    // 1. Acquirente
    // 2. Nome del Gioco (con quantità se > 1, es. x2)
    // 3. Prezzo di listino
    // 4. Sconto (es. 32% oppure 0% (Offerta))
    // 5. Prezzo da pagare
    // 6. Stato ("Disponibile" o "Prossimamente")
    // 7. Pagamento (es. Contanti / PayPal)
    const dragonRows = sortedDragonItems.map((item) => {
      const nameWithQty = item.quantity > 1 ? `${item.title} x${item.quantity}` : item.title
      const discountText = item.isOffer ? '0% (Offerta)' : (item.totalListPrice > item.totalPrice ? '32%' : '0%')

      return {
        'Acquirente': item.passenger,
        'Nome del Gioco': nameWithQty,
        'Prezzo di listino': Number(item.totalListPrice.toFixed(2)),
        'Sconto': discountText,
        'Prezzo da pagare': Number(item.totalPrice.toFixed(2)),
        'Stato': 'Disponibile',
        'Pagamento': item.payment,
      }
    })

    // Somma dei prezzi di listino e somma del Totale da Pagare
    const sumListino = dragonRows.reduce((acc, r) => acc + (Number(r['Prezzo di listino']) || 0), 0)
    const sumDaPagare = dragonRows.reduce((acc, r) => acc + (Number(r['Prezzo da pagare']) || 0), 0)

    // Aggiungi una riga vuota alla fine e poi la riga di riepilogo
    dragonRows.push({
      'Acquirente': '',
      'Nome del Gioco': '',
      'Prezzo di listino': '',
      'Sconto': '',
      'Prezzo da pagare': '',
      'Stato': '',
      'Pagamento': '',
    })

    // Riga TOTALE:
    // Colonna A: TOTALE
    // Colonna C: somma Prezzo di listino
    // Colonna E: somma Prezzo da pagare
    dragonRows.push({
      'Acquirente': 'TOTALE',
      'Nome del Gioco': '',
      'Prezzo di listino': Number(sumListino.toFixed(2)),
      'Sconto': '',
      'Prezzo da pagare': Number(sumDaPagare.toFixed(2)),
      'Stato': '',
      'Pagamento': '',
    })

    try {
      const ws = XLSX.utils.json_to_sheet(dragonRows)
      // Larghezze colonne richieste: [{ wch: 22 }, { wch: 38 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
      ws['!cols'] = [
        { wch: 22 }, // Acquirente
        { wch: 38 }, // Nome del Gioco
        { wch: 18 }, // Prezzo di listino
        { wch: 12 }, // Sconto
        { wch: 18 }, // Prezzo da pagare
        { wch: 16 }, // Stato
        { wch: 16 }, // Pagamento
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Dragon Store')

      const filename = `Ordine_DragonStore_${dateFormattedHyphen}.xlsx`
      XLSX.writeFile(wb, filename)
      return true
    } catch (err) {
      console.error('Errore esportazione Dragon Store Excel:', err)
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dragonRows)
      ws['!cols'] = [
        { wch: 22 },
        { wch: 38 },
        { wch: 18 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Dragon Store')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const filename = `Ordine_DragonStore_${dateFormattedHyphen}.xlsx`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return true
    }
  }

  // =========================================================================
  // GESTIONE ATTUALE OTTIMIZZATA PER TUTTI GLI ALTRI GATE (LS Giochi, Playbazar, ecc.)
  // =========================================================================
  const refStr = orderRef || getShopOrderReference(shop?.id)
  const isForced = Boolean(shippingInfo?.isForced || shop?.ordineForzato)
  const quotaPerPassenger = isForced ? Number(shippingInfo?.quotaPerPassenger || 0) : 0

  // Raggruppa i giochi identici per Titolo + Socio + Metodo di Pagamento + Link
  const groupedMap = new Map()

  items.forEach((it) => {
    const title = (it.nome_gioco || it.title || it.gioco || 'Gioco').trim()
    const passenger = (it.nome_utente || it.passenger || it.utente || it.nome || 'Socio').trim()
    const payment = (it.metodo_pagamento || it.paymentMethod || it.pagamento || 'Contanti').trim()
    const url = (it.url || it.link || '').trim()

    const rawFinalPrice =
      typeof it.prezzo === 'number'
        ? it.prezzo
        : typeof it.price === 'number'
          ? it.price
          : parseFloat(it.prezzo || it.price) || 0

    const qty = Number(it.quantita || it.quantity || 1) || 1
    const isOffer = Boolean(it.is_offerta_sito || it.is_already_on_sale)

    // Il Prezzo di Listino è immutabile: legge i campi dedicati se presenti, altrimenti rawFinalPrice (MAI calcoli inversi)
    let listPriceUnit = rawFinalPrice
    if (it.prezzo_listino_unitario !== undefined && it.prezzo_listino_unitario !== null) {
      listPriceUnit = Number(it.prezzo_listino_unitario) || rawFinalPrice
    } else if (it.prezzo_listino !== undefined && it.prezzo_listino !== null) {
      listPriceUnit = Number(it.prezzo_listino) || rawFinalPrice
    } else if (it.prezzo_listino_totale !== undefined && it.prezzo_listino_totale !== null && qty > 0) {
      listPriceUnit = Number(it.prezzo_listino_totale) / qty
    }

    const listPriceTot = Number((listPriceUnit * qty).toFixed(2))
    const finalPriceTot = Number((rawFinalPrice * qty).toFixed(2))

    // Calcolo sconto percentuale o etichetta
    let discountLabel = '0%'
    if (it.discount_badge) {
      discountLabel = it.discount_badge
    } else if (listPriceTot > finalPriceTot && listPriceTot > 0) {
      const discountPct = Math.round(((listPriceTot - finalPriceTot) / listPriceTot) * 100)
      discountLabel = `-${discountPct}%`
    } else if (it.is_offerta_sito) {
      discountLabel = 'Offerta'
    } else if (shop?.discount && typeof shop.discount === 'string' && !isDragonstore) {
      discountLabel = shop.discount
    }

    const key = `${title}:::${passenger}:::${payment}:::${url}`
    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key)
      existing.quantity += qty
      existing.totalPrice += finalPriceTot
      existing.totalListPrice += listPriceTot
    } else {
      groupedMap.set(key, {
        passenger,
        title,
        quantity: qty,
        unitListPrice: listPriceUnit,
        totalListPrice: listPriceTot,
        discountLabel,
        unitPrice: rawFinalPrice,
        totalPrice: finalPriceTot,
        payment,
        url,
      })
    }
  })

  // Genera righe di dati conformi alle chiavi esatte richieste:
  // "Quantità" | "Socio" | "Negozio" | "Gioco" | "Link Gioco" | "Prezzo di Listino (€)" | "Prezzo Scontato (€)" | "Metodo Pagamento" | "Prezzo Finale (€)"
  const rows = []

  groupedMap.forEach((item) => {
    const rawTargetUrl = (item.url || shop?.websiteUrl || '').trim()
    const targetUrl = rawTargetUrl && !rawTargetUrl.startsWith('http') ? `https://${rawTargetUrl}` : rawTargetUrl

    rows.push({
      'Quantità': item.quantity || 1,
      'Socio': item.passenger || 'Socio',
      'Negozio': shop?.name || 'Negozio',
      'Gioco': item.title || 'Gioco',
      'Link Gioco': targetUrl || '-',
      'Prezzo di Listino (€)': Number(item.totalListPrice.toFixed(2)),
      'Sconto Applicato': item.discountLabel || '0%',
      'Prezzo Scontato (€)': Number(item.totalPrice.toFixed(2)),
      'Metodo Pagamento': item.payment || 'Contanti',
      'Prezzo Finale (€)': Number(item.totalPrice.toFixed(2)),
    })
  })

  // RIGA DI TOTALE COMPLESSIVO A FONDO TABELLA
  const totalListAll = rows.reduce((acc, r) => acc + (Number(r['Prezzo di Listino (€)']) || 0), 0)
  const totalFinalAll = rows.reduce((acc, r) => acc + (Number(r['Prezzo Finale (€)']) || 0), 0)
  const totalQtyAll = rows.reduce((acc, r) => acc + (Number(r['Quantità']) || 0), 0)

  rows.push({
    'Quantità': totalQtyAll,
    'Socio': 'TOTALE COMPLESSIVO',
    'Negozio': shop?.name || '',
    'Gioco': `${rows.length} articoli`,
    'Link Gioco': '',
    'Prezzo di Listino (€)': Number(totalListAll.toFixed(2)),
    'Sconto Applicato': '',
    'Prezzo Scontato (€)': Number(totalFinalAll.toFixed(2)),
    'Metodo Pagamento': isForced ? `+ Sped. € ${Number(shippingInfo?.shippingCost || 0).toFixed(2)}` : 'Spedizione Gratuita',
    'Prezzo Finale (€)': Number(totalFinalAll.toFixed(2)),
  })

  try {
    // Crea Foglio con XLSX nativo json_to_sheet senza celle unite
    const ws = XLSX.utils.json_to_sheet(rows)

    // Aggiungi link ipertestuali espliciti nativi alle celle della colonna "Link Gioco" (colonna indice 4 -> 'E')
    let rowIndex = 2
    groupedMap.forEach((item) => {
      const rawTargetUrl = (item.url || shop?.websiteUrl || '').trim()
      const targetUrl = rawTargetUrl && !rawTargetUrl.startsWith('http') ? `https://${rawTargetUrl}` : rawTargetUrl
      const cellRef = `E${rowIndex}`
      if (targetUrl && ws[cellRef]) {
        ws[cellRef].l = { Target: targetUrl, Tooltip: 'Apri link store' }
      }
      rowIndex++
    })

    // Larghezza esplicita delle colonne
    ws['!cols'] = [
      { wch: 10 }, // Quantità
      { wch: 22 }, // Socio
      { wch: 18 }, // Negozio
      { wch: 32 }, // Gioco
      { wch: 32 }, // Link Gioco
      { wch: 20 }, // Prezzo di Listino (€)
      { wch: 16 }, // Sconto Applicato
      { wch: 20 }, // Prezzo Scontato (€)
      { wch: 18 }, // Metodo Pagamento
      { wch: 18 }, // Prezzo Finale (€)
    ]

    const wb = XLSX.utils.book_new()
    const safeSheetName = (shop?.name || 'Ordine').substring(0, 30).replace(/[:\\\/\?\*\[\]]/g, ' ')
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName)

    const safeShopNameFile = (shop?.name || 'Negozio').replace(/[^a-zA-Z0-9]/g, '_')
    const safeRef = String(refStr || '').replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Ordine_${safeShopNameFile}_${safeRef}_Tracker.xlsx`

    XLSX.writeFile(wb, filename)
    return true
  } catch (err) {
    console.error('Errore XLSX.writeFile, provo scrittura blob:', err)
    try {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 24 }, // Socio
        { wch: 35 }, // Gioco
        { wch: 10 }, // Quantità
        { wch: 20 }, // Prezzo di Listino (€)
        { wch: 14 }, // Sconto
        { wch: 20 }, // Prezzo Finale (€)
        { wch: 18 }, // Pagamento
      ]
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName)
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const safeShopNameFile = (shop?.name || 'Negozio').replace(/[^a-zA-Z0-9]/g, '_')
      const safeRef = String(refStr || '').replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `Ordine_${safeShopNameFile}_${safeRef}_Tracker.xlsx`

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return true
    } catch (fallbackErr) {
      console.error('Errore fallback XLSX blob:', fallbackErr)
      alert('Si è verificato un errore durante la generazione del file Excel.')
      return false
    }
  }
}

/**
 * PARTE 3: Esporta il Resoconto Personale Mensile in formato Excel (.xlsx)
 */
export async function exportPassengerMonthlyStatementExcel(
  passengerName = 'Passeggero',
  monthName = 'Mese Corrente',
  budget = 0,
  totalSpent = 0,
  totalSavings = 0,
  items = []
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Just Play Port'
  workbook.created = new Date()

  const safeSheetName = `Estratto_${(monthName || 'Mese').substring(0, 20)}`.replace(/[:\\\/\?\*\[\]]/g, ' ')
  const worksheet = workbook.addWorksheet(safeSheetName, {
    views: [{ showGridLines: true }],
  })

  // 1. Intestazione Globale
  worksheet.mergeCells('A1:F1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = 'JUST PLAY PORT • LOUNGE PASSEGGERO'
  titleCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(1).height = 20

  worksheet.mergeCells('A2:F2')
  const subtitleCell = worksheet.getCell('A2')
  subtitleCell.value = `Estratto Acquisti Personale - ${monthName}`
  subtitleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(2).height = 30

  // 2. Info Socio e Budget
  worksheet.getCell('A4').value = 'Passeggero:'
  worksheet.getCell('A4').font = { bold: true }
  worksheet.getCell('B4').value = passengerName

  worksheet.getCell('D4').value = 'Mese di Riferimento:'
  worksheet.getCell('D4').font = { bold: true }
  worksheet.getCell('E4').value = monthName

  worksheet.getCell('A5').value = 'Budget di Volo:'
  worksheet.getCell('A5').font = { bold: true }
  worksheet.getCell('B5').value = budget > 0 ? `€ ${budget.toFixed(2)}` : 'Non Impostato'

  worksheet.getCell('D5').value = 'Spesa Totale Effettiva:'
  worksheet.getCell('D5').font = { bold: true }
  worksheet.getCell('E5').value = `€ ${totalSpent.toFixed(2)}`
  worksheet.getCell('E5').font = { bold: true, color: { argb: (budget > 0 && totalSpent > budget) ? 'FFE11D48' : 'FF0F172A' } }

  worksheet.getCell('A6').value = 'Risparmio Gruppo:'
  worksheet.getCell('A6').font = { bold: true }
  worksheet.getCell('B6').value = `+€ ${totalSavings.toFixed(2)}`
  worksheet.getCell('B6').font = { bold: true, color: { argb: 'FF059669' } }

  // 3. Header Tabella
  const headerRow = worksheet.getRow(8)
  headerRow.values = ['#', 'Nome Gioco', 'Gate / Negozio', 'Quantità', 'Metodo di Pagamento', 'Quota Pagata (€)']
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // 4. Righe Dati
  let currentRow = 9
  if (items && items.length > 0) {
    items.forEach((it, idx) => {
      const row = worksheet.getRow(currentRow)
      const title = (it.nome_gioco || it.title || 'Gioco').trim()
      const shop = (it.negozio || it.shopName || 'Gate Imbarco').trim()
      const qty = it.quantita || it.quantity || 1
      const payment = (it.metodo_pagamento || it.paymentMethod || 'Contanti').trim()
      const price = typeof it.prezzo === 'number' ? it.prezzo : parseFloat(it.prezzo) || 0

      row.values = [idx + 1, title, shop, qty, payment, `€ ${price.toFixed(2)}`]
      row.alignment = { vertical: 'middle' }
      row.getCell(1).alignment = { horizontal: 'center' }
      row.getCell(4).alignment = { horizontal: 'center' }
      row.getCell(6).alignment = { horizontal: 'right' }
      row.getCell(2).font = { bold: true }
      row.getCell(6).font = { bold: true }

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        })
      }
      currentRow++
    })
  } else {
    const row = worksheet.getRow(currentRow)
    row.values = ['-', 'Nessun gioco registrato per questo mese', '-', 0, '-', '€ 0.00']
    currentRow++
  }

  // 5. Riga Totale
  const totalRow = worksheet.getRow(currentRow + 1)
  totalRow.getCell('E').value = 'TOTALE EFFETTIVO:'
  totalRow.getCell('E').font = { bold: true }
  totalRow.getCell('E').alignment = { horizontal: 'right' }
  totalRow.getCell('F').value = `€ ${totalSpent.toFixed(2)}`
  totalRow.getCell('F').font = { bold: true, size: 12, color: { argb: 'FF0F172A' } }
  totalRow.getCell('F').alignment = { horizontal: 'right' }

  // Larghezze colonne
  worksheet.columns = [
    { width: 6 },
    { width: 34 },
    { width: 22 },
    { width: 12 },
    { width: 22 },
    { width: 20 },
  ]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const safeName = passengerName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeMonth = monthName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `Estratto_Volo_${safeMonth}_${safeName}.xlsx`

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  return true
}

