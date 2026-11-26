import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Restituisce la data formattata in italiano (es. "17 Ottobre 2026")
 */
export function getFormattedOrderDate(d = new Date()) {
  const day = d.getDate()
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ]
  const monthName = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${monthName} ${year}`
}

/**
 * Restituisce il numero d'ordine progressivo memorizzato per negozio (es. "Ordine #01")
 */
export function getShopOrderReference(shopId) {
  try {
    const key = `justplay_order_seq_${shopId || 'default'}`
    const saved = localStorage.getItem(key)
    let current = saved ? parseInt(saved, 10) : 1
    if (isNaN(current) || current < 1) current = 1
    return `Ordine #${String(current).padStart(2, '0')}`
  } catch {
    return 'Ordine #01'
  }
}

/**
 * Incrementa il contatore d'ordine per il negozio al momento dell'acquisto/esportazione
 */
export function incrementShopOrderReference(shopId) {
  try {
    const key = `justplay_order_seq_${shopId || 'default'}`
    const saved = localStorage.getItem(key)
    let current = saved ? parseInt(saved, 10) : 1
    if (isNaN(current) || current < 1) current = 1
    localStorage.setItem(key, String(current + 1))
    return `Ordine #${String(current + 1).padStart(2, '0')}`
  } catch {
    return 'Ordine #02'
  }
}

/**
 * Raggruppa i giochi identici per Titolo + Passeggero + Metodo di Pagamento,
 * sommando le quantità e i prezzi. Supporta sia le proprietà italiane che inglesi.
 */
export function groupGateItems(items = [], shop = null) {
  const groups = new Map()
  const isDragonstore = shop?.id === 'dragonstore' || shop?.name?.toLowerCase().includes('dragonstore')

  items.forEach((item) => {
    const title = (item.nome_gioco || item.title || 'Gioco').trim()
    const passenger = (item.nome_utente || item.passenger || 'Socio').trim()
    const payment = (item.metodo_pagamento || item.paymentMethod || 'Contanti').trim()
    const url = (item.url || item.link || '').trim()
    const rawPrice =
      typeof item.prezzo === 'number'
        ? item.prezzo
        : typeof item.price === 'number'
        ? item.price
        : parseFloat(item.prezzo || item.price) || 0
    const qty = Number(item.quantita || item.quantity || 1) || 1

    const isAlreadyOffer = Boolean(item.is_offerta_sito || item.is_already_on_sale)

    // Il Prezzo di Listino è immutabile: legge i campi dedicati se presenti, altrimenti usa rawPrice (MAI calcoli inversi)
    let listPriceUnit = rawPrice
    if (item.prezzo_listino_unitario !== undefined && item.prezzo_listino_unitario !== null) {
      listPriceUnit = Number(item.prezzo_listino_unitario) || rawPrice
    } else if (item.prezzo_listino !== undefined && item.prezzo_listino !== null) {
      listPriceUnit = Number(item.prezzo_listino) || rawPrice
    } else if (item.prezzo_listino_totale !== undefined && item.prezzo_listino_totale !== null && qty > 0) {
      listPriceUnit = Number(item.prezzo_listino_totale) / qty
    }

    const listPriceTot = Number((listPriceUnit * qty).toFixed(2))
    const finalPriceTot = Number((rawPrice * qty).toFixed(2))

    // Calcolo sconto applicato
    let discountLabel = '0%'
    if (item.discount_badge) {
      discountLabel = item.discount_badge
    } else if (listPriceTot > finalPriceTot && listPriceTot > 0) {
      const discountPct = Math.round(((listPriceTot - finalPriceTot) / listPriceTot) * 100)
      discountLabel = `-${discountPct}%`
    } else if (isAlreadyOffer) {
      discountLabel = 'Offerta'
    } else if (shop?.discount && typeof shop.discount === 'string' && !isDragonstore) {
      discountLabel = shop.discount
    }

    const key = `${title.toLowerCase()}___${passenger.toLowerCase()}___${payment.toLowerCase()}___${url.toLowerCase()}`

    if (groups.has(key)) {
      const existing = groups.get(key)
      existing.quantity += qty
      existing.totalPrice += finalPriceTot
      existing.totalListPrice += listPriceTot
    } else {
      groups.set(key, {
        title,
        passenger,
        payment,
        url,
        unitListPrice: listPriceUnit,
        totalListPrice: listPriceTot,
        discountLabel,
        unitPrice: rawPrice,
        quantity: qty,
        totalPrice: finalPriceTot,
      })
    }
  })

  return Array.from(groups.values())
}

/**
 * Formatta valuta in Euro con 2 decimali
 */
export const formatEuro = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0
  return `€ ${num.toFixed(2)}`
}

/**
 * REQUISITO 3: Genera e scarica il file PDF "JUST PLAY PORT - Manifesto d'Imbarco"
 * con intestazione dettagliata:
 * - Titolo: JUST PLAY PORT - Manifesto d'Imbarco
 * - Negozio: [Nome Negozio]
 * - Data: 17 Ottobre 2026
 * - Riferimento Ordine: Ordine #01
 */
export function exportGatePdf(shop, items = [], customOrderRef = null, customDate = null, shippingInfo = null) {
  if (!items || items.length === 0) {
    alert('Nessun gioco presente nel Gate da esportare.')
    return
  }

  const shopName = shop?.name || 'Negozio'
  const freeShippingThreshold = shop?.freeShipping || shop?.freeShippingThreshold || 49

  // Inizializza documento A4 verticale (210mm x 297mm) con sfondo bianco
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14

  // Calcolo totale Gate
  const totalGatePrice = items.reduce((sum, item) => {
    const p =
      typeof item.prezzo === 'number'
        ? item.prezzo
        : typeof item.price === 'number'
        ? item.price
        : parseFloat(item.prezzo || item.price) || 0
    const q = item.quantita || item.quantity || 1
    return sum + p * q
  }, 0)

  // Data e Riferimento Ordine
  const dateFormatted = customDate || getFormattedOrderDate()
  const orderRef = customOrderRef || getShopOrderReference(shop.id)

  // 2. INTESTAZIONE (Header)
  // Bordo decorativo superiore cyan/navy aeronautico
  doc.setFillColor(14, 116, 144)
  doc.rect(marginX, 12, pageWidth - marginX * 2, 1.2, 'F')

  // In alto a sinistra: "JUST PLAY PORT - Distinta di Partenza"
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text('JUST PLAY PORT - Distinta di Partenza', marginX, 21)

  // In alto a destra: Data e Riferimento Ordine
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(71, 85, 105) // slate-600
  doc.text(`Data: ${dateFormatted}`, pageWidth - marginX, 20, { align: 'right' })

  const orderRefLabel = orderRef.startsWith('Ordine') ? orderRef : `Numero Ordine: ${orderRef}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(14, 116, 144) // cyan-700
  doc.text(orderRefLabel, pageWidth - marginX, 25.5, { align: 'right' })

  // Sotto: Negozio: [Nome Negozio]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text(`Negozio: ${shopName}`, marginX, 33)

  // Box riassunto stato volo e soglia
  const isForced = Boolean(shippingInfo?.isForced || shop?.ordineForzato)
  const quotaPerPassenger = shippingInfo?.quotaPerPassenger || 0
  const shippingCost = shippingInfo?.shippingCost || 0
  const isReached = totalGatePrice >= freeShippingThreshold || isForced
  const statusLabel = isForced
    ? `VOLO FORZATO (Quota Sped.: ${formatEuro(quotaPerPassenger)} / passeggero)`
    : isReached
    ? 'DECOLLO AUTORIZZATO (Soglia Raggiunta)'
    : 'IN ATTESA DI IMBARCO'

  doc.setFillColor(248, 250, 252) // slate-50
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.roundedRect(marginX, 38, pageWidth - marginX * 2, 11, 1.5, 1.5, 'FD')

  const groupedItems = groupGateItems(items, shop)
  const totalListGatePrice = groupedItems.reduce((sum, item) => sum + (item.totalListPrice || 0), 0)

  const isDragonstore = shop?.id === 'dragonstore' || shop?.name?.toLowerCase().includes('dragonstore')
  const isDragonSuper = isDragonstore && (totalListGatePrice >= 300 || isForced)
  const discountInfo = isDragonstore
    ? (isDragonSuper ? '    |    Sconto: -32% (Attivo)' : '    |    Sconto: 0% (Listino)')
    : ''

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105) // slate-600
  doc.text(
    `Soglia Spedizione: ${formatEuro(freeShippingThreshold)}    |    Stato: ${statusLabel}${discountInfo}    |    Articoli: ${items.length}`,
    marginX + 4,
    45
  )

  // 3. TABELLA ORDINI

  const tableHead = isForced
    ? [
        [
          { content: 'Q.tà', styles: { halign: 'center' } },
          { content: 'Passeggero (Socio)', styles: { halign: 'left' } },
          { content: 'Titolo Gioco', styles: { halign: 'left' } },
          { content: 'Link Store', styles: { halign: 'center' } },
          { content: 'Prezzo Listino', styles: { halign: 'right' } },
          { content: 'Sconto %', styles: { halign: 'center' } },
          { content: 'Prezzo Scontato', styles: { halign: 'right' } },
          { content: 'Metodo', styles: { halign: 'left' } },
          { content: 'Quota Sped.', styles: { halign: 'right' } },
          { content: 'Totale Finale', styles: { halign: 'right' } },
        ],
      ]
    : [
        [
          { content: 'Q.tà', styles: { halign: 'center' } },
          { content: 'Passeggero (Socio)', styles: { halign: 'left' } },
          { content: 'Titolo Gioco', styles: { halign: 'left' } },
          { content: 'Link Store', styles: { halign: 'center' } },
          { content: 'Prezzo Listino', styles: { halign: 'right' } },
          { content: 'Sconto %', styles: { halign: 'center' } },
          { content: 'Prezzo Scontato', styles: { halign: 'right' } },
          { content: 'Metodo Pagamento', styles: { halign: 'left' } },
          { content: 'Prezzo Finale', styles: { halign: 'right' } },
        ],
      ]

  const seenPassengers = new Set()
  const tableBody = groupedItems.map((item) => {
    const rawTargetUrl = (item.url || shop?.websiteUrl || '').trim()
    const targetUrl = rawTargetUrl && !rawTargetUrl.startsWith('http') ? `https://${rawTargetUrl}` : rawTargetUrl
    const linkLabel = targetUrl ? 'Apri link ↗' : '-'

    if (isForced) {
      const passengerNorm = item.passenger.toLowerCase().trim()
      let quotaForRow = 0
      if (!seenPassengers.has(passengerNorm)) {
        quotaForRow = quotaPerPassenger
        seenPassengers.add(passengerNorm)
      }
      const rowTotal = item.totalPrice + quotaForRow

      return [
        `${item.quantity}`,
        item.passenger,
        item.title,
        linkLabel,
        formatEuro(item.totalListPrice),
        item.discountLabel || '0%',
        formatEuro(item.totalPrice),
        item.payment,
        quotaForRow > 0 ? formatEuro(quotaForRow) : '€ 0.00',
        formatEuro(rowTotal),
      ]
    }

    return [
      `${item.quantity}`,
      item.passenger,
      item.title,
      linkLabel,
      formatEuro(item.totalListPrice),
      item.discountLabel || '0%',
      formatEuro(item.totalPrice),
      item.payment,
      formatEuro(item.totalPrice),
    ]
  })

  // Color mapping per i metodi di pagamento (RGB per il bullet circolare)
  const paymentColorMap = {
    satispay: [239, 68, 68], // rosso
    paypal: [37, 99, 235], // blu
    contanti: [16, 185, 129], // verde
  }

  autoTable(doc, {
    startY: 53,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: [241, 245, 249], // grigio chiaro #f1f5f9
      textColor: [30, 41, 59], // testo scuro #1e293b
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
      lineWidth: { bottom: 0.6 },
      lineColor: [203, 213, 225], // border #cbd5e1
    },
    bodyStyles: {
      textColor: [15, 23, 42], // testo scuro
      fontSize: 7.5,
      cellPadding: 2.5,
      lineWidth: { bottom: 0.3 },
      lineColor: [226, 232, 240], // #e2e8f0 bordo inferiore sottile tra le righe
    },
    columnStyles: isForced
      ? {
          0: { cellWidth: 9, halign: 'center', fontStyle: 'bold' }, // Q.tà
          1: { cellWidth: 24 }, // Passeggero (Socio)
          2: { cellWidth: 'auto', fontStyle: 'bold' }, // Titolo Gioco
          3: { cellWidth: 20, halign: 'center', textColor: [2, 132, 199] }, // Link Store
          4: { cellWidth: 17, halign: 'right' }, // Listino
          5: { cellWidth: 15, halign: 'center' }, // Sconto
          6: { cellWidth: 17, halign: 'right' }, // Scontato
          7: { cellWidth: 18 }, // Metodo
          8: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }, // Quota Sped.
          9: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, // Totale
        }
      : {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, // Q.tà
          1: { cellWidth: 26 }, // Passeggero (Socio)
          2: { cellWidth: 'auto', fontStyle: 'bold' }, // Titolo Gioco
          3: { cellWidth: 22, halign: 'center', textColor: [2, 132, 199] }, // Link Store
          4: { cellWidth: 20, halign: 'right' }, // Prezzo Listino
          5: { cellWidth: 16, halign: 'center' }, // Sconto %
          6: { cellWidth: 20, halign: 'right' }, // Prezzo Scontato
          7: { cellWidth: 22 }, // Metodo Pagamento
          8: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, // Prezzo Finale
        },
    didDrawCell: (data) => {
      // Disegna il link ipertestuale cliccabile sia sulla colonna "Link Store" (indice 3) che sul "Titolo Gioco" (indice 2)
      if (data.section === 'body' && (data.column.index === 3 || data.column.index === 2)) {
        const rowItem = groupedItems[data.row.index]
        const rawTargetUrl = (rowItem?.url || shop?.websiteUrl || '').trim()
        const targetUrl = rawTargetUrl && !rawTargetUrl.startsWith('http') ? `https://${rawTargetUrl}` : rawTargetUrl
        if (targetUrl) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: targetUrl })
        }
      }

      // Disegna un bullet elegante colorato prima del testo del metodo di pagamento (colonna indice 7)
      if (data.section === 'body' && data.column.index === 7) {
        const rawText = (data.cell.raw || '').toString().toLowerCase()
        let rgb = [100, 116, 139] // default slate
        if (rawText.includes('satispay')) rgb = paymentColorMap.satispay
        else if (rawText.includes('paypal')) rgb = paymentColorMap.paypal
        else if (rawText.includes('contanti')) rgb = paymentColorMap.contanti

        const circleX = data.cell.x + 3
        const circleY = data.cell.y + data.cell.height / 2
        doc.setFillColor(rgb[0], rgb[1], rgb[2])
        doc.circle(circleX, circleY, 1.2, 'F')
      }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        data.cell.styles.cellPadding = { top: 2.5, right: 3, bottom: 2.5, left: 6 }
      }
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // 4. TOTALI (Footer)
  // A fondo tabella, allineato a destra, riga riassuntiva molto evidente
  const finalY = (doc.lastAutoTable?.finalY || 100) + 6
  const boxWidth = isForced ? 100 : 85
  const boxHeight = isForced ? 20 : 14
  const boxX = pageWidth - marginX - boxWidth

  doc.setFillColor(241, 245, 249) // sfondo grigio chiaro
  doc.setDrawColor(30, 41, 59) // bordo scuro
  doc.setLineWidth(0.5)
  doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 1.5, 1.5, 'FD')

  if (isForced) {
    const finalTotalWithShipping = totalGatePrice + shippingCost
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Totale Merci: ${formatEuro(totalGatePrice)}  |  Sped. Forzata: ${formatEuro(shippingCost)}`,
      boxX + boxWidth - 4,
      finalY + 6.5,
      { align: 'right' }
    )
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`TOTALE DA SALDARE: ${formatEuro(finalTotalWithShipping)}`, boxX + boxWidth - 4, finalY + 15, {
      align: 'right',
    })
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42) // font più grande e in grassetto
    doc.text(`TOTALE GATE: ${formatEuro(totalGatePrice)}`, boxX + boxWidth - 4, finalY + 9, {
      align: 'right',
    })
  }

  // Nota discreta di chiusura a fondo pagina A4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(
    `Just Play Port - Distinta di partenza generata per l'ordine cumulativo ${orderRef} (${dateFormatted}).`,
    marginX,
    pageHeight - 10
  )

  // 5. NOME FILE E DOWNLOAD AUTOMATICO
  const sanitizedShopName = shopName.replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_-]/g, '_')
  const fileName = `Ordine_${sanitizedShopName}.pdf`

  doc.save(fileName)
}

/**
 * PARTE 3: Genera e scarica il PDF "Estratto Conto Passeggero" per singolo socio e mese solare
 */
export function exportPassengerMonthlyStatementPdf(
  passengerName = 'Passeggero',
  monthName = 'Mese Corrente',
  budget = 0,
  totalSpent = 0,
  totalSavings = 0,
  items = []
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14

  // 1. INTESTAZIONE STILE AEROPORTUALE / HUD
  doc.setFillColor(15, 23, 42) // slate-900
  doc.rect(0, 0, pageWidth, 36, 'F')

  // Riga accento dorato / ambra passaporto
  doc.setFillColor(245, 158, 11) // amber-500
  doc.rect(0, 36, pageWidth, 2, 'F')

  // Testo Top Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(251, 191, 36) // amber-400
  doc.text('JUST PLAY PORT • LOUNGE PASSEGGERO • ESTRATTO CONTO MENSILE', marginX, 12)

  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('Estratto Acquisti Personale', marginX, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(186, 230, 253) // sky-200
  doc.text(`Passeggero: ${passengerName}   |   Mese di Volo: ${monthName}`, marginX, 30)

  // 2. BOX RIEPILOGO BUDGET & SPESA PERSONALE
  const summaryY = 44
  doc.setFillColor(248, 250, 252) // slate-50
  doc.setDrawColor(203, 213, 225) // slate-300
  doc.setLineWidth(0.4)
  doc.roundedRect(marginX, summaryY, pageWidth - marginX * 2, 28, 2, 2, 'FD')

  // Colonna 1: Budget Impostato
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text('BUDGET DI VOLO IMPOSTATO', marginX + 6, summaryY + 8)
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59)
  doc.text(budget > 0 ? formatEuro(budget) : 'Non Impostato', marginX + 6, summaryY + 17)

  // Colonna 2: Spesa Totale Personale
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('SPESA PERSONALE EFFETTIVA', marginX + 70, summaryY + 8)
  doc.setFontSize(14)
  if (budget > 0 && totalSpent > budget) {
    doc.setTextColor(225, 29, 72) // rose-600
  } else {
    doc.setTextColor(15, 23, 42)
  }
  doc.text(formatEuro(totalSpent), marginX + 70, summaryY + 17)

  // Colonna 3: Risparmio Gruppo
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('RISPARMIO GRUPPO OTTENUTO', marginX + 130, summaryY + 8)
  doc.setFontSize(13)
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text(`+${formatEuro(totalSavings)}`, marginX + 130, summaryY + 17)

  // Sotto-riga di stato stiva
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  if (budget > 0) {
    const diff = totalSpent - budget
    if (diff > 0) {
      doc.setTextColor(190, 18, 60)
      doc.text(`Attenzione: Sovraccarico stiva di +${formatEuro(diff)} rispetto al budget impostato.`, marginX + 6, summaryY + 24)
    } else {
      doc.setTextColor(4, 120, 87)
      doc.text(`Stato Stiva Regolare: rimanenti ${formatEuro(Math.abs(diff))} di capienza per nuovi imbarchi.`, marginX + 6, summaryY + 24)
    }
  } else {
    doc.setTextColor(100, 116, 139)
    doc.text(`Tutti gli acquisti del socio ${passengerName} per il periodo ${monthName}.`, marginX + 6, summaryY + 24)
  }

  // 3. TABELLA GIOCHI ACQUISTATI (ESCLUSIVAMENTE DI QUESTO PASSEGGERO)
  const tableData = (items && items.length > 0)
    ? items.map((it, idx) => {
        const title = (it.nome_gioco || it.title || 'Gioco').trim()
        const shop = (it.negozio || it.shopName || 'Gate Imbarco').trim()
        const qty = it.quantita || it.quantity || 1
        const payment = (it.metodo_pagamento || it.paymentMethod || 'Contanti').trim()
        const price = typeof it.prezzo === 'number' ? it.prezzo : parseFloat(it.prezzo) || 0
        return [
          String(idx + 1),
          title,
          shop,
          String(qty),
          payment,
          formatEuro(price),
        ]
      })
    : [['-', 'Nessun gioco registrato per questo mese', '-', '-', '-', '€ 0.00']]

  autoTable(doc, {
    startY: summaryY + 33,
    margin: { left: marginX, right: marginX },
    head: [['#', 'GIOCO ACQUISTATO', 'GATE / NEGOZIO', 'Q.TÀ', 'PAGAMENTO', 'QUOTA (€)']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 41, 59],
      cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59], // navy-slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 32 },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
  })

  // 4. FOOTER CON TOTALE
  const finalY = (doc.lastAutoTable?.finalY || 120) + 6
  const boxWidth = 90
  const boxHeight = 14
  const boxX = pageWidth - marginX - boxWidth

  doc.setFillColor(241, 245, 249)
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.5)
  doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(`TOTALE EFFETTIVO: ${formatEuro(totalSpent)}`, boxX + boxWidth - 4, finalY + 9, {
    align: 'right',
  })

  // Nota chiusura pagina
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    `Documento contabile riservato del socio ${passengerName} generato da Just Play Port (${monthName}).`,
    marginX,
    pageHeight - 10
  )

  // 5. SALVATAGGIO
  const safeName = passengerName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeMonth = monthName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `Estratto_Volo_${safeMonth}_${safeName}.pdf`
  doc.save(fileName)
}

