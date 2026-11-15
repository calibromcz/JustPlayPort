import ExcelJS from 'exceljs'
import { getFormattedOrderDate, getShopOrderReference } from './pdfExport.js'

/**
 * Helper per compattare i prezzi numerici rimuovendo decimali superflui
 */
const formatCompactNum = (val) => {
  if (val === undefined || val === null) return '0'
  const num = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(num)) return '0'
  return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString()
}

/**
 * Genera ed esporta un Tracker XLSX professionale e interattivo per Google Sheets / Excel
 * 
 * Requisiti:
 * 1. Intestazione globale (Titolo negozio ingrandito, Data 17 Ottobre 2026, Numero Ordine, Totale Ordine)
 * 2. Tabella partecipanti con griglia elegante, header blu scuro con testo bianco centrato
 * 3. Colonne esatte: "Socio", "Gioco", "Quantità", "Prezzo", "Metodo di Pagamento", "Pagato"
 * 4. Colonna "Pagato" interattiva con DataValidation (Dropdown '☐ Da Pagare' / '✅ Pagato') e Formattazione Condizionale
 */
/**
 * Fallback per esportare un foglio CSV compatibile con Excel (UTF-8 con BOM)
 */
function exportGateCsvFallback(shop, rowsData, grandTotal, grandTotalWithShipping, refStr, dateStr, isForced, shippingCost) {
  let csv = '\uFEFF' // UTF-8 BOM
  csv += `"Ordine ${shop?.name || 'Negozio'} - Just Play Port";;;;;;;;\n`
  csv += `"Data: ${dateStr}";"Numero Ordine: ${refStr}";"Totale: € ${formatCompactNum(grandTotalWithShipping)}";;;;;;\n`
  csv += `\n`
  csv += `"Socio";"Gioco";"Link Store";"Quantità";"Prezzo (€)";"Quota Spedizione (€)";"Totale da Saldare (€)";"Metodo di Pagamento";"Pagato"\n`

  rowsData.forEach((item) => {
    const quota = isForced ? Number(item.quota || 0) : 0
    const rowTot = item.totalPrice + quota
    csv += `"${(item.passenger || '').replace(/"/g, '""')}";`
    csv += `"${(item.title || '').replace(/"/g, '""')}";`
    csv += `"${(item.url || '').replace(/"/g, '""')}";`
    csv += `${item.quantity || 1};`
    csv += `${Number(item.totalPrice || 0).toFixed(2).replace('.', ',')};`
    csv += `${Number(quota).toFixed(2).replace('.', ',')};`
    csv += `${Number(rowTot).toFixed(2).replace('.', ',')};`
    csv += `"${(item.payment || '').replace(/"/g, '""')}";`
    csv += `"☐ Da Pagare"\n`
  })

  csv += `"TOTALE COMPLESSIVO";"";"";"${rowsData.reduce((acc, it) => acc + (it.quantity || 1), 0)}";"${grandTotal.toFixed(2).replace('.', ',')}";"${(isForced ? shippingCost : 0).toFixed(2).replace('.', ',')}";"${grandTotalWithShipping.toFixed(2).replace('.', ',')}";"";""\n`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const safeShopNameFile = (shop?.name || 'Negozio').replace(/[^a-zA-Z0-9]/g, '_')
  const safeRef = (refStr || '').replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `Ordine_${safeShopNameFile}_${safeRef}_Tracker.csv`

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

export async function exportGateExcel(shop, items = [], orderRef = null, orderDate = null, shippingInfo = null) {
  if (!items || items.length === 0) {
    alert('Nessun gioco imbarcato per questo Gate.')
    return false
  }

  const dateStr = orderDate || getFormattedOrderDate()
  const refStr = orderRef || getShopOrderReference(shop?.id)

  // Calcola il totale del listino grezzo per Dragonstore (sconto 32% se >= 300€ o forzato)
  const isDragonstore = shop?.id === 'dragonstore' || shop?.name?.toLowerCase().includes('dragonstore')
  const isForced = Boolean(shippingInfo?.isForced || shop?.ordineForzato)

  const rawProductsTotal = items.reduce((sum, it) => {
    const listPrice = it.prezzo_listino_totale !== undefined
      ? it.prezzo_listino_totale
      : (it.prezzo_listino_unitario ? it.prezzo_listino_unitario * (it.quantita || 1) : it.prezzo || it.price || 0)
    return sum + (Number(listPrice) || 0)
  }, 0)

  // Raggruppa i giochi identici per Titolo + Socio + Metodo di Pagamento
  const groupedMap = new Map()

  items.forEach((it) => {
    const title = (it.nome_gioco || it.title || 'Gioco').trim()
    const passenger = (it.nome_utente || it.passenger || 'Socio').trim()
    const payment = (it.metodo_pagamento || it.paymentMethod || 'Contanti').trim()
    const url = (it.url || it.link || '').trim()
    const rawPrice =
      typeof it.prezzo === 'number'
        ? it.prezzo
        : typeof it.price === 'number'
        ? it.price
        : parseFloat(it.prezzo || it.price) || 0
    const qty = Number(it.quantita || it.quantity || 1) || 1

    const key = `${title}:::${passenger}:::${payment}:::${url}`
    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key)
      existing.quantity += qty
      existing.totalPrice += rawPrice * qty
    } else {
      groupedMap.set(key, {
        passenger,
        title,
        url,
        unitPrice: rawPrice,
        quantity: qty,
        totalPrice: rawPrice * qty,
        payment,
      })
    }
  })

  // Calcola totale complessivo
  let grandTotal = 0
  const rowsData = []
  groupedMap.forEach((entry) => {
    grandTotal += entry.totalPrice
    rowsData.push(entry)
  })

  // Crea la cartella di lavoro e il foglio
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Just Play Port'
  workbook.created = new Date()

  const safeSheetName = (shop.name || 'Ordine').substring(0, 30).replace(/[:\\\/\?\*\[\]]/g, ' ')
  const worksheet = workbook.addWorksheet(safeSheetName, {
    views: [{ showGridLines: true }],
  })

  // 1. INTESTAZIONE GLOBALE DEL DOCUMENTO
  const quotaPerPassenger = isForced ? (shippingInfo?.quotaPerPassenger || 0) : 0
  const shippingCost = isForced ? (shippingInfo?.shippingCost || 0) : 0
  const grandTotalWithShipping = isForced ? grandTotal + shippingCost : grandTotal

  // Riga 1: Nome Negozio in grande e in grassetto
  const titleRow = worksheet.getRow(1)
  titleRow.height = 34
  worksheet.mergeCells('A1:H1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `Ordine ${shop.name} - Just Play Port`
  titleCell.font = {
    name: 'Segoe UI',
    size: 16,
    bold: true,
    color: { argb: 'FF0F172A' }, // Slate-900
  }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // Riga 2: Metadati (Data, Numero Ordine, Totale)
  const metaRow = worksheet.getRow(2)
  metaRow.height = 24
  worksheet.mergeCells('A2:B2')
  worksheet.mergeCells('C2:E2')
  worksheet.mergeCells('F2:H2')

  const metaDateCell = worksheet.getCell('A2')
  metaDateCell.value = `📅 Data: ${dateStr}`
  metaDateCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF334155' } }
  metaDateCell.alignment = { vertical: 'middle', horizontal: 'left' }

  const metaRefCell = worksheet.getCell('C2')
  metaRefCell.value = `🔖 Numero Ordine: ${refStr}`
  metaRefCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF334155' } }
  metaRefCell.alignment = { vertical: 'middle', horizontal: 'left' }

  const discountTier = isDragonstore ? (isForced || rawProductsTotal >= 300 ? ' (-32% sconto)' : ' (0% sconto base)') : ''

  const metaTotalCell = worksheet.getCell('F2')
  metaTotalCell.value = `💰 Totale: € ${formatCompactNum(grandTotalWithShipping)}${isForced ? ` (incl. sped. € ${formatCompactNum(shippingCost)})` : ''}${discountTier}`
  metaTotalCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0369A1' } }
  metaTotalCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // Riga 3: Vuota di separazione
  worksheet.getRow(3).height = 14

  // 2. TABELLA PARTECIPANTI: INTESTAZIONE
  // Colonne: "Socio", "Gioco", "Link Store", "Quantità", "Prezzo", "Quota Spedizione", "Totale da Saldare", "Metodo di Pagamento", "Pagato"
  const headerRow = worksheet.getRow(4)
  headerRow.height = 28
  headerRow.values = [
    'Socio',
    'Gioco',
    'Link Store',
    'Quantità',
    'Prezzo',
    'Quota Spedizione',
    'Totale da Saldare',
    'Metodo di Pagamento',
    'Pagato',
  ]

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate-800 scuro ed elegante
  }

  const headerFont = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }, // Bianco
  }

  const headerBorder = {
    top: { style: 'medium', color: { argb: 'FF0F172A' } },
    left: { style: 'thin', color: { argb: 'FF475569' } },
    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    right: { style: 'thin', color: { argb: 'FF475569' } },
  }

  for (let c = 1; c <= 9; c++) {
    const cell = headerRow.getCell(c)
    cell.fill = headerFill
    cell.font = headerFont
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = headerBorder
  }

  // Griglia per le celle dei dati
  const dataBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, // Slate-300
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }

  // Inserimento righe dati
  const seenPassengers = new Set()
  let currentRowIndex = 5
  rowsData.forEach((item, idx) => {
    const row = worksheet.getRow(currentRowIndex)
    row.height = 24

    // Alternanza di sfondo leggera per facilitare la lettura (zebra striping)
    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'
    const cellFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: rowBg },
    }

    const passengerKey = item.passenger.toLowerCase().trim()
    let quotaValue = 0
    if (isForced) {
      if (!seenPassengers.has(passengerKey)) {
        quotaValue = Number(quotaPerPassenger.toFixed(2))
        seenPassengers.add(passengerKey)
      }
    }

    // 1. Socio
    const c1 = row.getCell(1)
    c1.value = item.passenger
    c1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    c1.border = dataBorder
    c1.fill = cellFill

    // 2. Gioco
    const c2 = row.getCell(2)
    c2.value = item.title
    c2.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } }
    c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    c2.border = dataBorder
    c2.fill = cellFill

    // 3. Link Store (Hyperlink cliccabile in Excel)
    const c3 = row.getCell(3)
    if (item.url) {
      c3.value = {
        text: 'Apri Link 🔗',
        hyperlink: item.url,
      }
      c3.font = {
        name: 'Segoe UI',
        size: 9.5,
        color: { argb: 'FF0284C7' }, // Sky-600
        underline: true,
      }
    } else {
      c3.value = '-'
      c3.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF94A3B8' } }
    }
    c3.alignment = { vertical: 'middle', horizontal: 'center' }
    c3.border = dataBorder
    c3.fill = cellFill

    // 4. Quantità
    const c4 = row.getCell(4)
    c4.value = item.quantity
    c4.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    c4.alignment = { vertical: 'middle', horizontal: 'center' }
    c4.border = dataBorder
    c4.fill = cellFill

    // 5. Prezzo (Prezzo giochi)
    const c5 = row.getCell(5)
    c5.value = Number(item.totalPrice.toFixed(2))
    c5.numFmt = '€ #,##0.00'
    c5.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } }
    c5.alignment = { vertical: 'middle', horizontal: 'right' }
    c5.border = dataBorder
    c5.fill = cellFill

    // 6. Quota Spedizione (dedicata, popolata solo se forzato pro-capite, altrimenti 0)
    const c6 = row.getCell(6)
    c6.value = quotaValue > 0 ? quotaValue : 0
    c6.numFmt = '€ #,##0.00'
    c6.font = {
      name: 'Segoe UI',
      size: 10,
      bold: isForced && quotaValue > 0,
      color: { argb: quotaValue > 0 ? 'FFC2410C' : 'FF64748B' },
    }
    c6.alignment = { vertical: 'middle', horizontal: 'right' }
    c6.border = dataBorder
    c6.fill = cellFill

    // 7. Totale da Saldare (Formula = E + F)
    const c7 = row.getCell(7)
    c7.value = {
      formula: `E${currentRowIndex}+F${currentRowIndex}`,
      result: Number((item.totalPrice + quotaValue).toFixed(2)),
    }
    c7.numFmt = '€ #,##0.00'
    c7.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } }
    c7.alignment = { vertical: 'middle', horizontal: 'right' }
    c7.border = dataBorder
    c7.fill = cellFill

    // 8. Metodo di Pagamento
    const c8 = row.getCell(8)
    c8.value = item.payment
    c8.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } }
    c8.alignment = { vertical: 'middle', horizontal: 'center' }
    c8.border = dataBorder
    c8.fill = cellFill

    // 9. Pagato (INTERATTIVO: Convalida a tendina "☐ Da Pagare" / "✅ Pagato")
    const c9 = row.getCell(9)
    c9.value = '☐ Da Pagare'
    c9.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } } // Rosso di default
    c9.alignment = { vertical: 'middle', horizontal: 'center' }
    c9.border = dataBorder
    c9.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEE2E2' }, // Sfondo rosso chiaro
    }

    // Regola di Data Validation nativa per Excel / Google Sheets
    c9.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"☐ Da Pagare,✅ Pagato"'],
      showErrorMessage: true,
      errorTitle: 'Stato pagamento non valido',
      error: 'Seleziona "☐ Da Pagare" oppure "✅ Pagato" dal menu.',
    }

    currentRowIndex++
  })

  // 4. RIGA DI TOTALE FINALE
  const totalRowIndex = currentRowIndex
  const totalRow = worksheet.getRow(totalRowIndex)
  totalRow.height = 26

  worksheet.mergeCells(`A${totalRowIndex}:C${totalRowIndex}`)
  const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`)
  totalLabelCell.value = 'TOTALE COMPLESSIVO'
  totalLabelCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } }
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }

  const totalBorder = {
    top: { style: 'thin', color: { argb: 'FF0F172A' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }

  const totalFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Slate-100
  }

  // Applica stile cella etichetta A-B-C
  totalLabelCell.border = totalBorder
  totalLabelCell.fill = totalFill
  worksheet.getCell(`B${totalRowIndex}`).border = totalBorder
  worksheet.getCell(`B${totalRowIndex}`).fill = totalFill
  worksheet.getCell(`C${totalRowIndex}`).border = totalBorder
  worksheet.getCell(`C${totalRowIndex}`).fill = totalFill

  // Cella Somma Quantità (Colonna D)
  const totalQtyCell = totalRow.getCell(4)
  totalQtyCell.value = {
    formula: `SUM(D5:D${totalRowIndex - 1})`,
    result: rowsData.reduce((acc, it) => acc + it.quantity, 0),
  }
  totalQtyCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } }
  totalQtyCell.alignment = { vertical: 'middle', horizontal: 'center' }
  totalQtyCell.border = totalBorder
  totalQtyCell.fill = totalFill

  // Cella Somma Prezzo Giochi (Colonna E)
  const totalPriceCell = totalRow.getCell(5)
  totalPriceCell.value = {
    formula: `SUM(E5:E${totalRowIndex - 1})`,
    result: Number(grandTotal.toFixed(2)),
  }
  totalPriceCell.numFmt = '€ #,##0.00'
  totalPriceCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } }
  totalPriceCell.alignment = { vertical: 'middle', horizontal: 'right' }
  totalPriceCell.border = totalBorder
  totalPriceCell.fill = totalFill

  // Cella Somma Quota Spedizione (Colonna F)
  const totalShippingCell = totalRow.getCell(6)
  totalShippingCell.value = {
    formula: `SUM(F5:F${totalRowIndex - 1})`,
    result: Number((isForced ? shippingCost : 0).toFixed(2)),
  }
  totalShippingCell.numFmt = '€ #,##0.00'
  totalShippingCell.font = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: isForced ? 'FFC2410C' : 'FF0F172A' },
  }
  totalShippingCell.alignment = { vertical: 'middle', horizontal: 'right' }
  totalShippingCell.border = totalBorder
  totalShippingCell.fill = totalFill

  // Cella Somma Totale da Saldare (Colonna G)
  const grandTotalCell = totalRow.getCell(7)
  grandTotalCell.value = {
    formula: `SUM(G5:G${totalRowIndex - 1})`,
    result: Number(grandTotalWithShipping.toFixed(2)),
  }
  grandTotalCell.numFmt = '€ #,##0.00'
  grandTotalCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F172A' } }
  grandTotalCell.alignment = { vertical: 'middle', horizontal: 'right' }
  grandTotalCell.border = totalBorder
  grandTotalCell.fill = totalFill

  // Celle 8 e 9 della riga totale vuote ma con bordo e sfondo coordinato
  const emptyC8 = totalRow.getCell(8)
  emptyC8.border = totalBorder
  emptyC8.fill = totalFill

  const emptyC9 = totalRow.getCell(9)
  emptyC9.border = totalBorder
  emptyC9.fill = totalFill

  // 5. REGOLA DI FORMATTAZIONE CONDIZIONALE PER LA COLONNA "PAGATO" (Colonna I)
  worksheet.addConditionalFormatting({
    ref: `I5:I${totalRowIndex - 1}`,
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"✅ Pagato"'],
        priority: 1,
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFDCFCE7' }, // Verde chiaro
          },
          font: {
            color: { argb: 'FF166534' }, // Verde scuro
            bold: true,
          },
        },
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"☐ Da Pagare"'],
        priority: 2,
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFFEE2E2' }, // Rosso chiaro
          },
          font: {
            color: { argb: 'FFDC2626' }, // Rosso scuro
            bold: true,
          },
        },
      },
    ],
  })

  // 6. AUTO-FIT LARGHEZZA COLONNE (Perfettamente proporzionate e spaziose)
  worksheet.columns = [
    { key: 'socio', width: 20 },
    { key: 'gioco', width: 32 },
    { key: 'link', width: 18 },
    { key: 'quantita', width: 12 },
    { key: 'prezzo', width: 16 },
    { key: 'quotaSpedizione', width: 18 },
    { key: 'totale', width: 20 },
    { key: 'metodo', width: 22 },
    { key: 'pagato', width: 16 },
  ]

  // Genera il file buffer e avvia il download nel browser
  try {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const safeShopNameFile = (shop.name || 'Negozio').replace(/[^a-zA-Z0-9]/g, '_')
    const safeRef = refStr.replace(/[^a-zA-Z0-9]/g, '_')
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
  } catch (bufferErr) {
    console.warn('ExcelJS writeBuffer fallito, uso fallback CSV:', bufferErr)
    return exportGateCsvFallback(shop, rowsData, grandTotal, grandTotalWithShipping, refStr, dateStr, isForced, shippingCost)
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

