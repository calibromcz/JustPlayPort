import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Plane,
  Ticket,
  Luggage,
  Sparkles,
  Check,
  AlertCircle,
  MessageCircle,
  User,
  Lock,
  ExternalLink,
  ClipboardCheck,
  Copy,
  FileDown,
  Share2,
} from 'lucide-react'
import {
  calculateItemPriceWithQuantity,
  formatSingleStoreShare,
  generateDistintaDiVolo,
  generateManifestoImbarco,
  calculateDragonstoreDiscount,
  getShopEffectiveItems,
} from '../utils/pricing.js'
import { exportGatePdf, getFormattedOrderDate, getShopOrderReference } from '../utils/pdfExport.js'
import { exportGateExcel } from '../utils/excelExport.js'

// Helper per compattare i prezzi rimuovendo zeri decimali superflui (es. 15 invece di 15.00)
const formatCompactNum = (val) => {
  if (val === undefined || val === null) return '0'
  const num = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(num)) return '0'
  return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString()
}

// Opzioni Metodo di Pagamento (Esclusivamente PayPal e Contanti)
const PAYMENT_OPTIONS = [
  { id: 'PayPal', label: 'PayPal', emoji: '🅿️', activeColor: 'bg-blue-600 text-white border-blue-700 shadow-xs' },
  { id: 'Contanti', label: 'Contanti', emoji: '💵', activeColor: 'bg-emerald-600 text-white border-emerald-700 shadow-xs' },
]

export function GateAccordionItem({
  shop,
  items = [],
  savedPassengerName = '',
  onSavePassengerName,
  onAddItem,
  onRemoveItem,
  onClearCart,
  onShareStore,
  onToggleForceOrder,
  onSelectShippingOption,
  isOpen,
  onToggle,
  onGetNextOrderNumber,
  onArchiveFlight,
  isNightMode = false,
  isDetailView = false,
}) {
  // Form state: Nome Passeggero, Nome Gioco, Link Store, Prezzo Listino, Quantità, Checkbox Già in offerta, Metodo di Pagamento
  const [passengerName, setPassengerName] = useState(savedPassengerName || '')
  const [gameName, setGameName] = useState('')
  const [gameUrl, setGameUrl] = useState('')
  const [rawPriceInput, setRawPriceInput] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isAlreadyOnSale, setIsAlreadyOnSale] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Contanti')
  const [formError, setFormError] = useState('')
  const [justAdded, setJustAdded] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isDistintaDropdownOpen, setIsDistintaDropdownOpen] = useState(false)

  // Chiudi il menu a tendina se la scheda viene chiusa
  useEffect(() => {
    if (!isOpen) {
      setIsDistintaDropdownOpen(false)
    }
  }, [isOpen])

  // REQUISITO 2 & 3: Metadati d'ordine progressivo per negozio e data odierna in italiano
  const orderDate = getFormattedOrderDate()
  const orderRef = onGetNextOrderNumber ? onGetNextOrderNumber(shop.id) : getShopOrderReference(shop.id)

  // REQUISITO 1: STATO "FORZA ORDINE" (Bypass della soglia)
  const [localOrdineForzato, setLocalOrdineForzato] = useState(shop.ordineForzato || false)

  useEffect(() => {
    if (shop.ordineForzato !== undefined) {
      setLocalOrdineForzato(shop.ordineForzato)
    }
  }, [shop.ordineForzato])

  const ordineForzato = shop.ordineForzato !== undefined ? shop.ordineForzato : localOrdineForzato

  const effectiveItems = useMemo(() => getShopEffectiveItems(shop, items), [shop, items])
  const isGateEmpty = effectiveItems.length === 0

  const handleToggleForce = (e) => {
    e?.stopPropagation()
    // 1. CONDIZIONE DI BLOCCO: attivabile SOLO SE c'è almeno un ordine inserito (ordiniGate.length > 0)
    if (isGateEmpty && !ordineForzato) {
      return
    }
    if (onToggleForceOrder) {
      onToggleForceOrder()
    } else {
      setLocalOrdineForzato((prev) => !prev)
    }
  }

  // REQUISITO 1 & 3: Filtra gli ordini correnti per isolare SOLO quelli appartenenti a questo specifico Gate
  const gateOrders = useMemo(() => {
    return (items || []).filter(
      (it) => it.id_negozio === shop.id || it.shopId === shop.id || !it.id_negozio
    )
  }, [items, shop.id])

  // REQUISITO 3: Calcolo UTENTI UNICI reali tramite Set (evita categoricamente "0 soci")
  const uniquePassengers = useMemo(() => {
    const set = new Set()
    gateOrders.forEach((it) => {
      const name = (it.nome_utente || it.passenger || it.user || it.nome || '').trim()
      if (name) set.add(name.toLowerCase())
    })
    return Array.from(set)
  }, [gateOrders])

  // Conta il numero esatto di UTENTI UNICI reali:
  // Se ci sono utenti unici nella lista del Gate, usa quel numero esatto.
  // Se shop ha forcedParticipantsCount > 0, consideralo.
  // In ogni caso, assicura che sia almeno 1 per non mostrare MAI "0 soci".
  const rawCount = uniquePassengers.length > 0 
    ? uniquePassengers.length 
    : (shop.forcedParticipantsCount && shop.forcedParticipantsCount > 0 ? shop.forcedParticipantsCount : 0)
  
  const uniquePassengersCount = Math.max(1, rawCount)

  // OPZIONI DI SPEDIZIONE E TARIFFA SELEZIONATA
  const shippingOptions = useMemo(() => {
    if (shop.shippingOptions && shop.shippingOptions.length > 0) {
      return shop.shippingOptions
    }
    return [{ id: 'standard', name: 'Standard', price: 4.90, isDefault: true }]
  }, [shop.shippingOptions])

  const defaultOption = useMemo(() => {
    return shippingOptions.find((o) => o.isDefault) || shippingOptions[0]
  }, [shippingOptions])

  const [localShippingId, setLocalShippingId] = useState(shop.selectedShippingId || defaultOption.id)

  useEffect(() => {
    if (shop.selectedShippingId) {
      setLocalShippingId(shop.selectedShippingId)
    } else if (!shippingOptions.some((o) => o.id === localShippingId)) {
      setLocalShippingId(defaultOption.id)
    }
  }, [shop.selectedShippingId, shippingOptions, defaultOption.id, localShippingId])

  const selectedShippingId = shop.selectedShippingId || localShippingId
  const currentShippingOption = shippingOptions.find((o) => o.id === selectedShippingId) || defaultOption
  const shippingCost = currentShippingOption.price

  // Quota spedizione per passeggero (diviso il numero esatto di partecipanti unici, mai diviso per 0)
  const shippingPerPassenger = Number((shippingCost / uniquePassengersCount).toFixed(2))

  const handleSelectShipping = (optionId) => {
    setLocalShippingId(optionId)
    if (onSelectShippingOption) {
      onSelectShippingOption(optionId)
    }
  }

  // Sincronizza il nome passeggero memorizzato
  useEffect(() => {
    if (savedPassengerName && !passengerName) {
      setPassengerName(savedPassengerName)
    }
  }, [savedPassengerName])

  // REQUISITO: Sconto dinamico per Dragonstore (Sconto base 20% -> 32% se listini >= 300€)
  const isDragonstore = shop?.id === 'dragonstore' || shop?.name?.toLowerCase().includes('dragonstore')
  const dragonInfo = isDragonstore ? calculateDragonstoreDiscount(items, ordineForzato) : null

  // Calcolo Totale del Carrello (al netto dello sconto) e Soglia Decollo (Spedizione Gratuita)
  const subtotal = effectiveItems.reduce((sum, it) => sum + (it.prezzo || 0), 0)
  const threshold = shop.freeShipping || 49

  // Per Dragonstore: L'indicatore della soglia deve sommare ESCLUSIVAMENTE i Prezzi di Listino interi di tutti i giochi nel Gate, mostrando quanto manca per arrivare a 300,00 €.
  const isReached = isDragonstore
    ? (dragonInfo?.rawProductsTotal >= 300 && dragonInfo?.rawProductsTotal > 0)
    : (subtotal >= threshold && subtotal > 0 && threshold > 0)

  const isPronto = isReached || Boolean(ordineForzato)
  const isForcedActive = Boolean(ordineForzato && !isReached)

  const remaining = isDragonstore
    ? Math.max(0, 300 - (dragonInfo?.rawProductsTotal || 0))
    : Math.max(0, threshold - subtotal)

  const percentage = threshold > 0
    ? (isDragonstore
        ? Math.min(100, Math.round(((dragonInfo?.rawProductsTotal || 0) / 300) * 100))
        : Math.min(100, Math.round((subtotal / threshold) * 100)))
    : 100

  // REQUISITO 1: Semafori di Stato (Luci di Pista)
  // Quando isPronto è true, il Gate assume lo sfondo azzurro (bg-sky-200) e il semaforo verde
  const isGreen = isPronto
  const isOrange = !isPronto && subtotal >= threshold * 0.5 && subtotal > 0
  const isRed = !isPronto && (subtotal < threshold * 0.5 || subtotal === 0)

  // REQUISITO: Integrazione Quota Spedizione nella Distinta a Schermo per ogni partecipante
  const participantsSummary = useMemo(() => {
    const map = new Map()
    effectiveItems.forEach((it) => {
      const user = (it.nome_utente || 'Passeggero').trim()
      const qty = it.quantita || 1
      const rawPrice = typeof it.prezzo === 'number' ? it.prezzo : parseFloat(it.prezzo) || 0
      const lineTotal = rawPrice * qty
      const pay = it.metodo_pagamento || ''

      if (map.has(user)) {
        const prev = map.get(user)
        prev.totalItemsPrice += lineTotal
        prev.itemsCount += qty
        if (pay && !prev.payments.includes(pay)) {
          prev.payments.push(pay)
        }
      } else {
        map.set(user, {
          name: user,
          totalItemsPrice: lineTotal,
          itemsCount: qty,
          payments: pay ? [pay] : [],
        })
      }
    })

    const quota = isForcedActive ? shippingPerPassenger : 0

    return Array.from(map.values()).map((p) => ({
      ...p,
      quotaSpedizione: quota,
      totalToPay: Number((p.totalItemsPrice + quota).toFixed(2)),
    }))
  }, [effectiveItems, isForcedActive, shippingPerPassenger])

  // Invio del form di check-in gioco (Integrazione continua: sempre consentita)
  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedPassenger = passengerName.trim()
    const trimmedGame = gameName.trim()
    const parsedPrice = parseFloat(String(rawPriceInput).replace(',', '.'))

    if (!trimmedPassenger) {
      setFormError('Inserisci il Nome del Passeggero.')
      return
    }
    if (!trimmedGame) {
      setFormError('Inserisci il Nome del Gioco.')
      return
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Inserisci un prezzo valido (es. 45.00).')
      return
    }
    if (!paymentMethod) {
      setFormError('Seleziona come intendi pagare (PayPal 🅿️ o Contanti 💵).')
      return
    }

    setFormError('')

    // Memorizza il nome passeggero nel Local Storage per i successivi imbarchi
    if (onSavePassengerName && trimmedPassenger !== savedPassengerName) {
      onSavePassengerName(trimmedPassenger)
    }

    // Calcolo automatico prezzo scontato e risparmio: per Dragonstore inserimento Prezzo di Listino con sconto base 0% (il 32% si applica dinamicamente al raggiungimento dei 300€ o forzato)
    const discountToUse = isDragonstore ? null : shop.discount
    const pricing = calculateItemPriceWithQuantity(parsedPrice, discountToUse, quantity, isDragonstore ? false : isAlreadyOnSale)

    onAddItem({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      id_negozio: shop.id,
      nome_utente: trimmedPassenger,
      nome_gioco: trimmedGame,
      url: gameUrl.trim() || '',
      quantita: pricing.quantity,
      prezzo: pricing.finalPrice,
      prezzo_listino_unitario: parsedPrice,
      prezzo_listino_totale: Number((parsedPrice * quantity).toFixed(2)),
      risparmio: pricing.savings || 0,
      is_offerta_sito: isDragonstore ? false : pricing.isAlreadyOnSale,
      discount_badge: isDragonstore ? null : pricing.discountBadge,
      metodo_pagamento: paymentMethod,
      created_at: new Date().toISOString(),
    })

    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
    setGameName('')
    setGameUrl('')
    setRawPriceInput('')
    setQuantity(1)
    setIsAlreadyOnSale(false)
    setPaymentMethod('Contanti')
  }

  // REQUISITO 4: Condivisione WhatsApp, salvataggio profilo e reset carrello Gate
  const handleShareWhatsApp = async () => {
    if (!isPronto) return

    const message = formatSingleStoreShare(shop, items)
    const encoded = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encoded}`

    setShareFeedback(true)

    // Salva nel Local Storage (profilo_utente) gli acquisti del passeggero
    if (onShareStore) {
      onShareStore(shop.id, items)
    }

    // Avvio condivisione
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Just Play Port - Volo ${shop.name}`,
          text: message,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          window.open(whatsappUrl, '_blank')
        }
      }
    } else {
      window.open(whatsappUrl, '_blank')
    }

    // Svuota il carrello del gate: torna bianco e scende in graduatoria
    setTimeout(() => {
      onClearCart(shop.id)
      setShareFeedback(false)
    }, 600)
  }

  const [hasDownloadedDistinta, setHasDownloadedDistinta] = useState(false)

  // REQUISITO 4: "📄 Scarica come PDF" (Scarica il PDF SENZA chiudere/azzerare il Gate)
  const handleDownloadPdf = () => {
    if (effectiveItems.length === 0) {
      alert('Nessun gioco imbarcato in questo Gate da esportare.')
      return
    }

    // a) Calcola il Numero Ordine per questo specifico negozio
    const currentOrderRef = onGetNextOrderNumber
      ? onGetNextOrderNumber(shop.id)
      : orderRef

    try {
      // b) Genera e scarica il documento PDF con il numero d'ordine
      const shippingInfo = {
        isForced: isForcedActive,
        optionName: currentShippingOption.name,
        shippingCost: shippingCost,
        uniquePassengersCount: Math.max(1, uniquePassengersCount),
        quotaPerPassenger: shippingPerPassenger,
      }
      exportGatePdf(shop, effectiveItems, currentOrderRef, orderDate, shippingInfo)
      setHasDownloadedDistinta(true)
      setFeedbackMessage(`📄 ${currentOrderRef} scaricato con successo!`)
      setTimeout(() => setFeedbackMessage(''), 3500)
      setIsDistintaDropdownOpen(false)
    } catch (err) {
      console.error('Errore generazione PDF:', err)
      alert('Si è verificato un errore durante la generazione del PDF.')
    }
  }

  // REQUISITO 4: "📊 Crea Foglio Ordine (Google Sheets / Excel)" (Scarica il file SENZA chiudere/azzerare il Gate)
  const handleExportExcel = async () => {
    if (effectiveItems.length === 0) {
      alert('Nessun gioco imbarcato per questo Gate.')
      return
    }

    // a) Calcola il nuovo Numero Ordine progressivo per questo specifico negozio
    const currentOrderRef = onGetNextOrderNumber
      ? onGetNextOrderNumber(shop.id)
      : orderRef

    try {
      // b) Genera e scarica il Foglio Ordine
      const shippingInfo = {
        isForced: isForcedActive,
        optionName: currentShippingOption.name,
        shippingCost: shippingCost,
        uniquePassengersCount: Math.max(1, uniquePassengersCount),
        quotaPerPassenger: shippingPerPassenger,
      }
      const ok = await exportGateExcel(shop, effectiveItems, currentOrderRef, orderDate, shippingInfo)
      if (ok) {
        setHasDownloadedDistinta(true)
        setFeedbackMessage(`📊 Foglio Ordine (${currentOrderRef}) scaricato con successo!`)
        setTimeout(() => setFeedbackMessage(''), 3500)
        setIsDistintaDropdownOpen(false)
      }
    } catch (err) {
      console.error('Errore generazione Foglio Ordine:', err)
      alert('Si è verificato un errore durante la generazione del foglio di calcolo.')
    }
  }

  // REQUISITO 4: Tasto "✅ Chiudi Ordine" (Chiede conferma, archivia nel Registro e svuota il Gate)
  const handleCloseOrder = () => {
    if (effectiveItems.length === 0) {
      alert('Nessun gioco imbarcato in questo Gate.')
      return
    }

    const isConfirmed = window.confirm("Sei sicuro di voler chiudere l'ordine?")
    if (!isConfirmed) return

    const currentOrderRef = onGetNextOrderNumber
      ? onGetNextOrderNumber(shop.id)
      : orderRef

    setFeedbackMessage(`✅ Ordine ${currentOrderRef} chiuso e archiviato nel Registro di Volo!`)
    setTimeout(() => setFeedbackMessage(''), 4000)

    if (onArchiveFlight) {
      onArchiveFlight(shop, effectiveItems, currentOrderRef, orderDate)
    } else {
      if (isPronto && onShareStore) {
        onShareStore(shop.id, effectiveItems)
      }
      onClearCart(shop.id)
    }
    setHasDownloadedDistinta(false)
  }

  // REQUISITO 2 - AZIONE 3: "📋 Copia Testo del Riepilogo" (Copia con metadati e alert)
  const handleCopyManifestoText = () => {
    if (effectiveItems.length === 0) {
      alert('Nessun gioco imbarcato in questo Gate.')
      return
    }

    const currentOrderRef = onGetNextOrderNumber
      ? onGetNextOrderNumber(shop.id)
      : orderRef

    const shippingInfo = {
      isForced: isForcedActive,
      optionName: currentShippingOption.name,
      shippingCost: shippingCost,
      uniquePassengersCount: Math.max(1, uniquePassengersCount),
      quotaPerPassenger: shippingPerPassenger,
    }

    const testoRiepilogo = generateManifestoImbarco(shop.name, effectiveItems, currentOrderRef, orderDate, shippingInfo)

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(testoRiepilogo)
        .then(() => {
          alert('Distinta di partenza copiata negli appunti! 📋')
        })
        .catch((err) => {
          console.error('Errore durante la copia della distinta: ', err)
        })
    } else {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = testoRiepilogo
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Distinta di partenza copiata negli appunti! 📋')
      } catch (err) {
        console.error('Errore durante la copia: ', err)
      }
    }
  }

  // REQUISITO 2: BOTTONE "📢 ANNUNCIA AL VOLO" (Copia Rapida per Telegram a 3 stati)
  const handleAnnounceTelegram = () => {
    let messaggioTelegram = ''

    if (isPronto) {
      // CASO C: SOGLIA RAGGIUNTA O FORZATO (isPronto è true)
      if (isForcedActive) {
        messaggioTelegram = `👨‍✈️ *ATTENZIONE PASSEGGERI: VOLO FORZATO per ${shop.name}!* 🚀\nIl decollo è autorizzato senza raggiungere la soglia di spedizione gratuita!\n📦 Merci in stiva: € ${formatCompactNum(subtotal)} / € ${formatCompactNum(threshold)}\n🚚 Spedizione ${currentShippingOption.name}: € ${shippingCost.toFixed(2).replace('.', ',')}\n👥 Spedizione totale: ${shippingCost.toFixed(2).replace('.', ',')} €. Quota a testa (divisa per ${uniquePassengersCount} ${uniquePassengersCount === 1 ? 'socio' : 'soci'}): ${shippingPerPassenger.toFixed(2).replace('.', ',')} €.\nSigilliamo i portelloni: aggiungete gli ultimi giochi ORA! 🏃‍♂️💨`
      } else {
        const itemCount = effectiveItems.reduce((acc, it) => acc + (it.quantita || 1), 0)
        const giochiLabel = itemCount === 1 ? '1 gioco' : `${itemCount} giochi`
        messaggioTelegram = `👨‍✈️ *Bzzzt...* Signore e signori, vi parla il Capitano. Il volo per ${shop.name} ha raggiunto la quota per la spedizione gratuita e i motori sono caldi! 🚀 Stiamo per sigillare la stiva: se avete un ultimo giochino da lanciare a bordo, muovetevi ORA, o vi toccherà salutare l'aereo dal terminal! 🏃‍♂️💨\n📦 Totale a bordo: € ${formatCompactNum(subtotal)} • Soglia: € ${formatCompactNum(threshold)} • ${giochiLabel}.`
      }
    } else if (subtotal === 0) {
      // CASO A: CARRELLO VUOTO (totale === 0)
      messaggioTelegram = `✈️ **Gate Aperto per ${shop.name}!** Il nastro trasportatore è ancora vuoto (0€ a bordo). Iniziate ad aggiungere i vostri giochi in stiva per far partire il volo e raggiungere la spedizione gratuita di € ${formatCompactNum(threshold)}! 🧳`
    } else {
      // CASO B: SOTTO SOGLIA (totale > 0 E totale < soglia E ordineForzato è false)
      const currentTotal = formatCompactNum(subtotal)
      const missingAmount = formatCompactNum(remaining)
      messaggioTelegram = `✈️ **Gate Aperto per ${shop.name}!** Stiamo imbarcando! 🧳\nSiamo a quota € ${currentTotal}. Ci mancano solo € ${missingAmount} per sbloccare la spedizione gratuita! Chi ha giochi nella wishlist li aggiunga ora in stiva per farci decollare! 🚀`
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(messaggioTelegram)
        .then(() => {
          alert('Messaggio copiato negli appunti! Incollalo pure nel gruppo Telegram 📋')
        })
        .catch((err) => {
          console.error('Errore durante la copia: ', err)
        })
    } else {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = messaggioTelegram
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Messaggio copiato negli appunti! Incollalo pure nel gruppo Telegram 📋')
      } catch (err) {
        console.error('Errore durante la copia: ', err)
      }
    }
  }

  return (
    <article className="w-full relative box-border transition-all overflow-visible">
      {/* REQUISITO 1: Badge Ultima Chiamata (eliminato se Volo Forzato per togliere ridondanze) */}
      {isPronto && !ordineForzato && (
        <div className="absolute -top-2.5 right-4 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-bold shadow-xs animate-departure-pulse pointer-events-none select-none bg-yellow-200 border-yellow-300 text-gray-800">
          <span className="text-xs shrink-0">📢</span>
          <span>Ultima chiamata d'imbarco!</span>
        </div>
      )}

      {/* REQUISITO 1: Scheda Gate / Carta d'Imbarco
          - Sfondo azzurro marcato e visibile (bg-sky-200) SOLO quando isPronto è true (soglia raggiunta o ordineForzato)
          - Sfondo bianco (bg-white) quando non è pronto
          - Dimensioni e layout rigorosamente fisse
      */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full box-border min-h-[84px] sm:min-h-[90px] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3.5 flex items-center justify-between text-left btn-aviation relative overflow-hidden cursor-pointer border shadow-xs hover:shadow-md transition-all duration-300 ${
          isNightMode
            ? 'bg-[#1e293b] text-white border-2 border-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.4)] hover:border-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.6)]'
            : isPronto
            ? 'bg-sky-200 border-sky-300 hover:border-sky-400'
            : 'bg-white border-slate-200/90 hover:border-blue-300'
        }`}
      >
        {/* Sinistra: Badge Gate, Flight Code, Nome Negozio e Stato */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 pr-1 sm:pr-2">
          {/* Icona Aereo / Gate */}
          <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-base shadow-2xs shrink-0 border transition-colors ${
            isNightMode
              ? 'border-[#f59e0b]/70 bg-[#0f172a] text-[#f59e0b] shadow-[0_0_6px_rgba(245,158,11,0.3)]'
              : isPronto ? 'border-sky-300 bg-white text-blue-700' : 'border-slate-200 bg-slate-100 text-blue-700'
          }`}>
            <Plane className={`w-4 h-4 sm:w-5 sm:h-5 ${isNightMode ? 'text-[#f59e0b]' : 'text-blue-600'}`} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Codice Volo & Gate & Badge Decollo Pronto */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs font-mono-code mb-0.5">
              <span className={`px-1.5 py-0.5 rounded font-black text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 ${
                isNightMode
                  ? 'bg-[#0f172a] text-[#f59e0b] border border-[#f59e0b]/50 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                  : isPronto ? 'bg-white/85 text-slate-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {shop.flightCode || 'JP-00'}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-bold whitespace-nowrap shrink-0 ${
                isNightMode
                  ? 'text-slate-300'
                  : isPronto ? 'text-sky-950 font-black' : 'text-slate-500'
              }`}>
                {shop.gate || 'Gate'}
              </span>
              {isPronto && (
                <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border font-mono-code shadow-2xs shrink-0 whitespace-nowrap ${
                  ordineForzato
                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                    : isNightMode
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {ordineForzato ? 'Volo Forzato 🚀' : 'Decollo pronto ✈️'}
                </span>
              )}
            </div>

            {/* Proteggi il Nome Negozio: flex-1, tracking-tight, text-base sm:text-lg */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 flex-wrap">
              <span className={`text-base sm:text-lg font-black tracking-tight shrink-0 ${
                isNightMode ? 'text-white' : 'text-slate-900'
              }`}>
                {shop.name}
              </span>

              {isDragonstore ? (
                <span className={`text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                  dragonInfo?.isSuperDiscount
                    ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                    : isNightMode
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {dragonInfo?.isSuperDiscount ? '-32% Sbloccato!' : '0% Base (32% a 300€)'}
                </span>
              ) : shop.discount ? (
                <span className={`text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                  isNightMode ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80' : 'bg-blue-100 text-blue-800'
                }`}>
                  -{shop.discount}
                </span>
              ) : null}
            </div>

            {/* Informazioni Soglia Decollo / Spedizione - Senza truncate per piena leggibilità con wrap */}
            <div className={`w-full flex items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs font-semibold mt-1 flex-wrap leading-tight ${
              isNightMode
                ? 'text-slate-400'
                : isPronto ? 'text-sky-900' : 'text-slate-600'
            }`}>
              <span className="whitespace-normal break-words">Sped. Gratis da {shop.freeShipping}€</span>
              {items.length > 0 && (
                <>
                  <span className="opacity-60">•</span>
                  <span className={`whitespace-nowrap ${isNightMode ? 'text-cyan-400 font-bold' : 'text-blue-900 font-bold'}`}>
                    {items.length} {items.length === 1 ? 'gioco' : 'giochi'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Destra: Semaforo di Stato (Luci di Pista), Importo Parziale e Freccia Espansione */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 pl-0.5 sm:pl-1">
          {/* REQUISITO 2: RIMUOVI IL SEMAFORO IN ALTO A DESTRA (Dettaglio Gate) */}
          {!isDetailView && (
            <div
              className={`flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-full border shadow-2xs shrink-0 ${
                isPronto ? 'border-sky-300 bg-white/90' : 'border-slate-200 bg-slate-100/90'
              }`}
              title={
                isRed
                  ? 'Semaforo Pista: ROSSO (< 50% soglia di spedizione)'
                  : isOrange
                  ? 'Semaforo Pista: ARANCIONE (>= 50% soglia di spedizione)'
                  : 'Semaforo Pista: VERDE (Decollo pronto o volo forzato!)'
              }
            >
              {/* Cerchio 1: ROSSO */}
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 shrink-0 ${
                  isRed
                    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]'
                    : 'bg-gray-300 opacity-40'
                }`}
              />
              {/* Cerchio 2: ARANCIONE */}
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 shrink-0 ${
                  isOrange
                    ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.9)]'
                    : 'bg-gray-300 opacity-40'
                }`}
              />
              {/* Cerchio 3: VERDE */}
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 shrink-0 ${
                  isGreen
                    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.9)]'
                    : 'bg-gray-300 opacity-40'
                }`}
              />
            </div>
          )}

          {/* REQUISITO: Prezzi compatti (eliminato il badge ridondante FORZATO sotto i prezzi) */}
          {(items.length > 0 || ordineForzato) && (
            <div className="text-right shrink-0 flex flex-col items-end justify-center min-w-0 max-w-full">
              <div className="flex flex-col sm:flex-row items-end sm:items-baseline justify-end gap-0.5 sm:gap-1 leading-tight">
                <span className={`font-mono-code font-bold text-xs sm:text-sm tracking-tight whitespace-nowrap ${
                  isNightMode ? 'text-slate-300' : 'text-blue-900'
                }`}>
                  € {formatCompactNum(isDragonstore ? dragonInfo?.rawProductsTotal : subtotal)}/{formatCompactNum(threshold)}
                </span>
                {isDragonstore && (
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap lowercase">
                    prezzo di listino
                  </span>
                )}
              </div>
              {!ordineForzato && isPronto && (
                <span className={`font-black text-xs sm:text-sm uppercase tracking-tight block leading-tight mt-1 whitespace-nowrap ${
                  isNightMode ? 'text-cyan-300' : 'text-emerald-800'
                }`}>
                  {isDragonstore ? '-32% PRONTO' : 'PRONTO'}
                </span>
              )}
              {!ordineForzato && !isPronto && (
                <span className={`font-mono-code font-bold text-base sm:text-lg block leading-tight mt-0.5 whitespace-nowrap ${
                  isNightMode ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'text-blue-900'
                }`}>
                  -€{formatCompactNum(remaining)}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* REQUISITO 3: Scheda Espansa con Sfondo Liquid Glass su Vetro */}
      {isOpen && (
        <div className={`mt-2.5 p-4 sm:p-6 rounded-2xl border shadow-xl animate-gate-expand space-y-5 overflow-visible relative transition-all duration-300 ${
          isNightMode
            ? 'bg-white/5 border-white/10 text-slate-100 shadow-none'
            : 'bg-white/40 border-white/50 text-slate-900 shadow-xs backdrop-blur-xl'
        }`}>
          {/* Feedback post-condivisione e azzeramento */}
          {shareFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-black text-xs sm:text-sm text-center animate-ticket-pop-in">
              🛫 Volo partito e ordine condiviso su WhatsApp! Il gate si è azzerato per il prossimo decollo.
            </div>
          )}

          {/* 1. Rotte di Decollo / Progress Bar (Nascosta se Volo Forzato perché superflua) */}
          {!ordineForzato && (
            <div className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3.5 ${
              isNightMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/40 border-white/50 text-slate-900 backdrop-blur-md'
            }`}>
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 bg-blue-100 border-blue-200 text-blue-700">
                <Luggage className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                  <span className={isPronto ? 'text-emerald-700 font-black text-base sm:text-lg leading-tight' : (isNightMode ? 'text-cyan-300 font-bold text-lg sm:text-xl leading-snug tracking-tight' : 'text-blue-900 font-bold text-lg sm:text-xl leading-snug tracking-tight')}>
                    {isPronto
                      ? isDragonstore
                        ? 'Soglia 300€ Prezzo di Listino Raggiunta! Extra Sconto 32% Attivo! ✈️'
                        : 'Decollo Gratuito Raggiunto! ✈️'
                      : isDragonstore
                      ? `Ancora ${formatCompactNum(remaining)} € di listino per sbloccare il 32%`
                      : `Ancora €${formatCompactNum(remaining)} e si vola! 🛫`}
                  </span>
                  <span className={`font-mono-code text-xs sm:text-sm font-bold shrink-0 flex items-baseline gap-1 ${
                    isNightMode ? 'text-slate-300' : 'text-blue-900 font-bold'
                  }`}>
                    € {formatCompactNum(isDragonstore ? dragonInfo?.rawProductsTotal : subtotal)}/{formatCompactNum(threshold)}
                    {isDragonstore && (
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 lowercase">
                        prezzo di listino
                      </span>
                    )}
                  </span>
                </div>

                {/* Progress bar pista di decollo */}
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isPronto
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {isPronto ? (
                  <div className="mt-1 text-[11px] font-black text-emerald-700 flex items-center gap-1">
                    <span>✅ Spedizione azzerata per l'intero equipaggio. Integrazione continua consentita!</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* 2. REQUISITO 3: Form di Check-in Gioco */}
          <form onSubmit={handleSubmit} className={`space-y-3.5 p-4 rounded-xl border ${
            isNightMode ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-sky-200/60'
          }`}>
            {/* REQUISITO 1: Alert Ultima Chiamata (solo quando pronto naturalmente e non forzato) */}
            {isPronto && !ordineForzato && (
              <div className={`w-full max-w-full box-border p-3 rounded-xl border font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs overflow-hidden ${
                isNightMode
                  ? 'bg-[#f59e0b]/15 border-[#f59e0b]/50 text-[#f59e0b] animate-departure-pulse'
                  : 'bg-yellow-200 border-yellow-300 text-gray-800 animate-departure-pulse'
              }`}>
                <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0 max-w-full flex-1">
                  <span className="text-base shrink-0">📢</span>
                  <span className="break-words leading-tight">Ultima chiamata d'imbarco! Aggiungi i tuoi giochi prima che l'aereo parta</span>
                </div>
                {subtotal < threshold && (
                  <button
                    type="button"
                    disabled={isGateEmpty}
                    onClick={handleToggleForce}
                    className={`self-center sm:self-auto mx-auto sm:mx-0 px-3 py-2 rounded-lg text-xs font-black shadow-2xs whitespace-nowrap transition-all flex items-center justify-center ${
                      isGateEmpty
                        ? 'opacity-50 grayscale cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer active:scale-95'
                    }`}
                    title={isGateEmpty ? 'Imbarca prima un gioco al Gate per attivare il Volo Forzato' : undefined}
                  >
                    🚀 Forza Ordine
                  </button>
                )}
              </div>
            )}

            <div className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
              isNightMode ? 'text-white' : 'text-slate-800'
            }`}>
              <Plus className={`w-4 h-4 stroke-[3] ${isNightMode ? 'text-[#f59e0b]' : 'text-blue-600'}`} />
              <span>Imbarca un gioco al Gate {shop.name}</span>
            </div>

            {/* RIGA 1 (Chi e Cosa): Nome Passeggero & Nome Gioco */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`passenger-${shop.id}`} className={`block text-xs font-semibold mb-1 ${
                  isNightMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Nome Passeggero
                </label>
                <div className="relative">
                  <input
                    id={`passenger-${shop.id}`}
                    type="text"
                    value={passengerName}
                    onChange={(e) => {
                      setPassengerName(e.target.value)
                      if (onSavePassengerName) onSavePassengerName(e.target.value)
                    }}
                    placeholder="Nome del passeggero (es. Marco)"
                    className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 transition-all shadow-sm font-medium"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor={`game-${shop.id}`} className={`block text-xs font-semibold mb-1 ${
                  isNightMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Nome del Gioco
                </label>
                <input
                  id={`game-${shop.id}`}
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Es. Scythe, Terraforming Mars..."
                  className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 transition-all shadow-sm font-medium"
                />
              </div>
            </div>

            {/* RIGA 2 (L'URL): Link Store intera riga */}
            <div className="col-span-full mt-1">
              <label htmlFor={`game-url-${shop.id}`} className={`block text-xs font-semibold mb-1 ${
                isNightMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Link del negozio (opzionale)
              </label>
              <input
                id={`game-url-${shop.id}`}
                type="url"
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                placeholder="🔗 Incolla qui il link del gioco..."
                className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 transition-all shadow-sm"
              />
            </div>

            {/* RIGA 3 (I Numeri): Prezzo Listino & Quantità affiancati */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <label htmlFor={`price-${shop.id}`} className={`block text-xs font-semibold mb-1 ${
                  isNightMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Prezzo di listino (€)
                </label>
                <div className="relative">
                  <input
                    id={`price-${shop.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={rawPriceInput}
                    onChange={(e) => setRawPriceInput(e.target.value)}
                    placeholder={isDragonstore ? '50.00 (listino)' : '50.00'}
                    className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl pl-4 pr-8 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 transition-all shadow-sm font-mono-code font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                    €
                  </span>
                </div>
                {isDragonstore && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-bold">
                    * Inserisci il prezzo di listino (prezzo pieno 0% base). Al raggiungimento dei 300€ (o con Forza Ordine) si attiva automaticamente il -32% a cascata.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`qty-${shop.id}`} className={`block text-xs font-semibold mb-1 ${
                  isNightMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Quantità
                </label>
                <select
                  id={`qty-${shop.id}`}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 transition-all shadow-sm font-bold text-center cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num} className={isNightMode ? 'bg-[#0f172a] text-white' : ''}>
                      {num}x
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SELETTORE METODO DI PAGAMENTO: "Come vorrai pagare?" */}
            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${
                isNightMode ? 'text-slate-200' : 'text-slate-700'
              }`}>
                Come vorrai pagare? <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const isSelected = paymentMethod === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(opt.id)
                        if (formError.includes('pagare') || formError.includes('pagamento')) setFormError('')
                      }}
                      className={`btn-aviation flex-1 min-w-[95px] py-2 px-3 rounded-full text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                        isSelected
                          ? `${opt.activeColor} ring-2 ring-offset-1 ring-[#f59e0b] scale-[1.02]`
                          : isNightMode
                          ? 'bg-[#1e293b] text-slate-200 border-slate-700 hover:border-[#f59e0b] hover:text-white'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                      }`}
                    >
                      <span className="text-sm leading-none">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Checkbox "Già in offerta?" */}
            <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer ${
              isNightMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200'
            }`}>
              <input
                id={`sale-${shop.id}`}
                type="checkbox"
                checked={isAlreadyOnSale}
                onChange={(e) => setIsAlreadyOnSale(e.target.checked)}
                className="w-4 h-4 rounded text-[#f59e0b] focus:ring-[#f59e0b] border-slate-300 cursor-pointer accent-[#f59e0b] shrink-0"
              />
              <label htmlFor={`sale-${shop.id}`} className={`text-xs font-bold cursor-pointer select-none ${
                isNightMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                Già in offerta? <span className={isNightMode ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>(Nessun ulteriore sconto convenzione)</span>
              </label>
            </div>

            {/* REQUISITO 3: Calcolo Automatico del Prezzo Scontato e del RISPARMIO in tempo reale */}
            {rawPriceInput && !isNaN(parseFloat(String(rawPriceInput).replace(',', '.'))) && parseFloat(String(rawPriceInput).replace(',', '.')) > 0 && (() => {
              const previewPrice = parseFloat(String(rawPriceInput).replace(',', '.'))
              const previewInfo = calculateItemPriceWithQuantity(previewPrice, shop.discount, quantity, isAlreadyOnSale)
              return (
                <div className={`p-3 rounded-xl border text-xs font-black flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-ticket-pop-in ${
                  isNightMode ? 'bg-[#1e293b] border-[#f59e0b]/50 text-white' : 'bg-blue-50 border-blue-200 text-slate-900'
                }`}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Sparkles className={`w-4 h-4 ${isNightMode ? 'text-[#f59e0b]' : 'text-blue-600'} shrink-0`} />
                    <span>Prezzo Calcolato: <strong className={`text-sm font-mono-code ${isNightMode ? 'text-[#f59e0b]' : 'text-blue-900'}`}>{previewInfo.finalPrice.toFixed(2)}€</strong></span>
                    {previewInfo.discountBadge && !previewInfo.isAlreadyOnSale && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        isNightMode ? 'bg-[#f59e0b] text-slate-950' : 'bg-blue-600 text-white'
                      }`}>
                        {previewInfo.discountBadge}
                      </span>
                    )}
                  </div>
                  {previewInfo.savings > 0 ? (
                    <span className={`font-extrabold px-2.5 py-1 rounded-md border ${
                      isNightMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 'text-emerald-700 bg-white border-emerald-300'
                    }`}>
                      💰 Risparmio: <strong>+{previewInfo.savings.toFixed(2)}€</strong>
                    </span>
                  ) : previewInfo.isAlreadyOnSale ? (
                    <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      🏷️ Prezzo fisso offerta sito
                    </span>
                  ) : null}
                </div>
              )
            })()}

            {formError && (
              <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </p>
            )}

            {/* Bottone Imbarca Gioco */}
            <button
              type="submit"
              className={`w-full min-h-12 py-3 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 btn-aviation shadow-sm cursor-pointer transition-all ${
                justAdded
                  ? 'bg-emerald-600 text-white'
                  : isNightMode
                  ? 'bg-[#f59e0b] hover:bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Gioco Imbarcato al Gate! ✈️</span>
                </>
              ) : (
                <>
                  <Plane className="w-4 h-4 stroke-[2.5]" />
                  <span>Imbarca Gioco al Gate</span>
                </>
              )}
            </button>
          </form>

          {/* REQUISITO 2: UN SOLO blocco di testo pulito e chiaro immediatamente prima della distinta */}
          {ordineForzato && (
            <div className={`p-3.5 sm:p-4 rounded-xl border-2 text-xs sm:text-sm font-bold mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-ticket-pop-in shadow-xs transition-colors ${
              isNightMode
                ? 'bg-slate-900 border-amber-500/70 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">🚀</span>
                <span className="leading-relaxed font-bold">
                  Partenza forzata. Spedizione totale:{' '}
                  <strong className={`font-mono-code font-black ${
                    isNightMode ? 'text-cyan-300' : 'text-slate-950'
                  }`}>
                    {shippingCost.toFixed(2).replace('.', ',')} €
                  </strong>
                  . Quota a testa (divisa per{' '}
                  <strong className={`font-mono-code font-black ${
                    isNightMode ? 'text-white' : 'text-slate-950'
                  }`}>
                    {uniquePassengersCount} {uniquePassengersCount === 1 ? 'socio' : 'soci'}
                  </strong>
                  ):{' '}
                  <strong className={`font-mono-code font-black underline decoration-orange-500 decoration-2 ${
                    isNightMode ? 'text-amber-300' : 'text-amber-950'
                  }`}>
                    {shippingPerPassenger.toFixed(2).replace('.', ',')} €
                  </strong>
                  .
                </span>
              </div>

              {shippingOptions.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-end sm:self-auto">
                  <span className={`text-[11px] font-black ${
                    isNightMode ? 'text-amber-200' : 'text-amber-950'
                  }`}>Tariffa:</span>
                  {shippingOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectShipping(opt.id)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        selectedShippingId === opt.id
                          ? 'bg-orange-600 text-white shadow-xs font-black'
                          : isNightMode
                          ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
                          : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
                      }`}
                    >
                      {opt.name} ({opt.price.toFixed(2).replace('.', ',')} €)
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Elenco Bagagli / Giochi Imbarcati al Gate */}
          <div className={`p-4 rounded-xl border ${
            isNightMode ? 'border-white/10' : 'border-sky-200/60 bg-white/40'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isNightMode ? 'text-white' : 'text-slate-900'
              }`}>
                <Ticket className={`w-4 h-4 ${isNightMode ? 'text-[#f59e0b]' : 'text-blue-600'}`} />
                Bagagli Imbarcati al Gate ({effectiveItems.length})
              </span>
            </div>

            {effectiveItems.length === 0 ? (
              <div className={`text-center py-6 px-4 rounded-xl border border-dashed text-xs font-medium ${
                isNightMode ? 'bg-[#0f172a] border-slate-700 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                Nessun gioco imbarcato per questo volo. Aggiungi il primo passeggero sopra!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {effectiveItems.map((it) => {
                  const qty = it.quantita || 1
                  return (
                    <div
                      key={it.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex flex-wrap items-start justify-between gap-2 text-xs transition-all animate-ticket-pop-in shadow-2xs"
                    >
                      <div className="flex-1 min-w-[200px] font-bold space-y-1.5">
                        {/* 1. Dati Primari: Nome socio, Quantità e Nome Gioco */}
                        <div className="text-xs sm:text-sm font-black break-words leading-snug flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                            <span className="text-slate-500 dark:text-slate-400 font-normal select-none">👤</span>
                            <span>{it.nome_utente}</span>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-normal select-none">•</span>
                          <span className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                            <span className="text-slate-500 dark:text-slate-400 font-normal select-none">🎲</span>
                            {it.url ? (
                              <a
                                href={it.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 dark:text-sky-400 font-medium hover:underline inline-flex items-center gap-1.5"
                                title="Apri link negozio"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>{qty}x {it.nome_gioco}</span>
                                <span className="text-[10px] opacity-70 select-none">🔗</span>
                              </a>
                            ) : (
                              <span>{qty}x {it.nome_gioco}</span>
                            )}
                          </span>
                        </div>

                        {/* 2. Badge e Prezzo: riga secondaria con wrap pulito */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="inline-flex items-center">
                            <span className="text-slate-500 dark:text-slate-400 mr-1 select-none">💰</span>
                            <strong className="font-mono-code font-bold text-slate-900 dark:text-amber-400">{it.prezzo.toFixed(2)}€</strong>
                            {isForcedActive && (
                              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">
                                + {shippingPerPassenger.toFixed(2).replace('.', ',')}€ sped.
                              </span>
                            )}
                          </span>
                          {it.metodo_pagamento && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${
                              it.metodo_pagamento === 'Satispay'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60'
                                : it.metodo_pagamento === 'PayPal'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                            }`}>
                              {it.metodo_pagamento === 'Satispay' ? '🔴 Satispay' : it.metodo_pagamento === 'PayPal' ? '🅿️ PayPal' : '💵 Contanti'}
                            </span>
                          )}
                          {it.risparmio > 0 && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                              Risparmiati: +{it.risparmio.toFixed(2)}€
                            </span>
                          )}
                          {it.is_offerta_sito ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800 whitespace-nowrap">
                              Offerta
                            </span>
                          ) : it.discount_badge && !it.risparmio && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800 whitespace-nowrap">
                              {it.discount_badge}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Tasto Elimina protetto con shrink-0 / flex-shrink-0 (SOLO PROPRIETARIO + CONFERMA) */}
                      {(() => {
                        const itemUser = (it.nome_utente || it.passenger || it.user || it.nome_passeggero || '').trim().toLowerCase()
                        const loggedUser = (savedPassengerName || '').trim().toLowerCase()
                        const isOwner = loggedUser && itemUser === loggedUser

                        if (!isOwner) return null

                        return (
                          <div className="flex items-center shrink-0 flex-shrink-0 self-start ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Vuoi davvero rimuovere "${it.nome_gioco}" dal Gate?`)) {
                                  onRemoveItem(it.id)
                                }
                              }}
                              className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 flex-shrink-0 ${
                                isNightMode
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title="Rimuovi il tuo gioco"
                              aria-label="Rimuovi il tuo gioco"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Esportazione Distinta di Volo PDF, Foglio Google Sheets e Annuncio Telegram */}
          <div id="tutorial-gate-actions" className="pt-3 border-t border-slate-200 space-y-2.5 relative overflow-visible">
            {feedbackMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs text-center animate-ticket-pop-in">
                {feedbackMessage}
              </div>
            )}

            {/* SE LA SOGLIA È STATA RAGGIUNTA NATURALMENTE (SENZA FORZATURA) */}
            {isReached && !ordineForzato ? (
              <div className="space-y-2.5 animate-ticket-pop-in relative overflow-visible">
                <div className="flex flex-col md:flex-row items-stretch gap-2.5 md:gap-3 relative overflow-visible">
                  {/* 1. 📢 Annuncia al Volo */}
                  <button
                    type="button"
                    onClick={handleAnnounceTelegram}
                    className="flex-1 min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md bg-[#229ED9] hover:bg-[#1e8dbf] text-white cursor-pointer transition-all"
                    title="Copia negli appunti il messaggio d'urgenza per il gruppo Telegram"
                  >
                    <span className="text-base leading-none">📢</span>
                    <span>Annuncia al Volo</span>
                  </button>

                  {/* 2. 🛫 Distinta di Partenza */}
                  <div className={`relative flex-1 ${isDistintaDropdownOpen ? 'z-50' : 'z-20'}`}>
                    {isDistintaDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsDistintaDropdownOpen(false)}
                        />
                        <div className={`absolute bottom-full right-0 left-0 sm:left-auto sm:right-0 sm:w-80 mb-2 p-2 rounded-2xl border-2 shadow-2xl z-50 space-y-1.5 animate-ticket-pop-in text-left ${
                          isNightMode ? 'bg-[#0f172a] border-[#f59e0b] text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]' : 'bg-white border-slate-700 text-slate-800'
                        }`}>
                          <button
                            type="button"
                            onClick={() => {
                              handleDownloadPdf()
                              setIsDistintaDropdownOpen(false)
                            }}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 border transition-colors text-left font-black text-xs sm:text-sm cursor-pointer whitespace-nowrap ${
                              isNightMode
                                ? 'text-slate-100 hover:bg-slate-800/90 border-transparent hover:border-emerald-400/50'
                                : 'text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 border-transparent hover:border-emerald-200'
                            }`}
                          >
                            <span className="text-xl leading-none shrink-0">📄</span>
                            <span className="truncate">Scarica come PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleExportExcel()
                              setIsDistintaDropdownOpen(false)
                            }}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 border transition-colors text-left font-black text-xs sm:text-sm cursor-pointer whitespace-nowrap ${
                              isNightMode
                                ? 'text-slate-100 hover:bg-slate-800/90 border-transparent hover:border-blue-400/50'
                                : 'text-slate-800 hover:bg-blue-50 hover:text-blue-900 border-transparent hover:border-blue-200'
                            }`}
                          >
                            <span className="text-xl leading-none shrink-0">📊</span>
                            <span className="truncate">Crea Foglio Ordine (Google Sheets)</span>
                          </button>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsDistintaDropdownOpen((prev) => !prev)}
                      className={`w-full min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md cursor-pointer transition-all border ${
                        isNightMode
                          ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700 hover:border-cyan-400'
                          : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                      }`}
                      title="Apri le opzioni per la distinta di partenza"
                      aria-expanded={isDistintaDropdownOpen}
                      aria-haspopup="true"
                    >
                      <span className="text-base leading-none">🛫</span>
                      <span>Distinta di Partenza</span>
                      <ChevronUp
                        className={`w-4 h-4 ml-1 text-slate-300 transition-transform duration-200 ${
                          isDistintaDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* REQUISITO 4: Pulsante ✅ Chiudi Ordine (Visibile quando la distinta è disponibile / pronta per essere chiusa) */}
                {(hasDownloadedDistinta || isPronto) && effectiveItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCloseOrder}
                    className="w-full min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white cursor-pointer transition-all border border-emerald-500/80 animate-ticket-pop-in"
                    title="Chiudi definitivamente l'ordine, archivialo nel Registro e azzera il Gate"
                  >
                    <span className="text-base leading-none">✅</span>
                    <span>Chiudi Ordine</span>
                  </button>
                )}
              </div>
            ) : ordineForzato ? (
              /* QUANDO ORDINE È FORZATO (Sotto soglia o forzato dall'utente) */
              <div className="space-y-2.5 animate-ticket-pop-in relative overflow-visible">
                <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:justify-center gap-2.5 md:gap-3 relative overflow-visible">
                  {/* 1. 📢 Annuncia al Volo */}
                  <button
                    type="button"
                    onClick={handleAnnounceTelegram}
                    className="w-full md:w-auto md:flex-1 min-w-[150px] min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md bg-[#229ED9] hover:bg-[#1e8dbf] text-white cursor-pointer transition-all"
                    title="Copia il messaggio di annuncio volo forzato per Telegram negli appunti"
                  >
                    <span className="text-base leading-none">📢</span>
                    <span>Annuncia al Volo</span>
                  </button>

                  {/* 2. 🛫 Distinta di Partenza */}
                  <div className={`relative w-full md:w-auto md:flex-1 min-w-[150px] ${isDistintaDropdownOpen ? 'z-50' : 'z-20'}`}>
                    {isDistintaDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsDistintaDropdownOpen(false)}
                        />
                        <div className={`absolute bottom-full right-0 left-0 sm:left-auto sm:right-0 sm:w-80 mb-2 p-2 rounded-2xl border-2 shadow-2xl z-50 space-y-1.5 animate-ticket-pop-in text-left ${
                          isNightMode ? 'bg-[#0f172a] border-[#f59e0b] text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]' : 'bg-white border-slate-700 text-slate-800'
                        }`}>
                          <button
                            type="button"
                            onClick={() => {
                              handleDownloadPdf()
                              setIsDistintaDropdownOpen(false)
                            }}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 border transition-colors text-left font-black text-xs sm:text-sm cursor-pointer whitespace-nowrap ${
                              isNightMode
                                ? 'text-slate-100 hover:bg-slate-800/90 border-transparent hover:border-emerald-400/50'
                                : 'text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 border-transparent hover:border-emerald-200'
                            }`}
                          >
                            <span className="text-xl leading-none shrink-0">📄</span>
                            <span className="truncate">Scarica come PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleExportExcel()
                              setIsDistintaDropdownOpen(false)
                            }}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 border transition-colors text-left font-black text-xs sm:text-sm cursor-pointer whitespace-nowrap ${
                              isNightMode
                                ? 'text-slate-100 hover:bg-slate-800/90 border-transparent hover:border-blue-400/50'
                                : 'text-slate-800 hover:bg-blue-50 hover:text-blue-900 border-transparent hover:border-blue-200'
                            }`}
                          >
                            <span className="text-xl leading-none shrink-0">📊</span>
                            <span className="truncate">Crea Foglio Ordine (Google Sheets)</span>
                          </button>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsDistintaDropdownOpen((prev) => !prev)}
                      className={`w-full min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md cursor-pointer transition-all border ${
                        isNightMode
                          ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700 hover:border-cyan-400'
                          : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                      }`}
                      title="Apri le opzioni per la distinta di partenza"
                      aria-expanded={isDistintaDropdownOpen}
                      aria-haspopup="true"
                    >
                      <span className="text-base leading-none">🛫</span>
                      <span>Distinta di Partenza</span>
                      <ChevronUp
                        className={`w-4 h-4 ml-1 text-slate-300 transition-transform duration-200 ${
                          isDistintaDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* 3. Tasto Annulla Forzatura / Forza ordine (€ X,XX) */}
                  <button
                    type="button"
                    onClick={handleToggleForce}
                    className="w-full md:w-auto min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md bg-orange-600 hover:bg-orange-700 text-white cursor-pointer transition-all shrink-0"
                    title="Annulla la forzatura dell'ordine"
                  >
                    <span>❌ Annulla Forza Ordine (€ {shippingCost.toFixed(2).replace('.', ',')})</span>
                  </button>
                </div>

                {/* REQUISITO 4: Pulsante ✅ Chiudi Ordine anche per ordine forzato */}
                {(hasDownloadedDistinta || isPronto) && effectiveItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCloseOrder}
                    className="w-full min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white cursor-pointer transition-all border border-emerald-500/80 animate-ticket-pop-in"
                    title="Chiudi definitivamente l'ordine, archivialo nel Registro e azzera il Gate"
                  >
                    <span className="text-base leading-none">✅</span>
                    <span>Chiudi Ordine</span>
                  </button>
                )}
              </div>
            ) : (
              /* QUANDO SOTTO SOGLIA E NON ANCORA FORZATO: SOTTO LA LISTA I DUE PULSANTI */
              <div className="space-y-2.5">
                {/* Selettore tariffa se il negozio ha più di 1 opzione */}
                {shippingOptions.length > 1 && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex-wrap">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Opzione Spedizione:</span>
                    <div className="flex items-center gap-1.5">
                      {shippingOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectShipping(opt.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedShippingId === opt.id
                              ? 'bg-blue-600 text-white shadow-xs font-black'
                              : isNightMode
                              ? 'bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          {opt.name} ({opt.price.toFixed(2).replace('.', ',')} €)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* REQUISITO 1: Sotto la lista, pulsanti "Annuncia al volo" e "Forza ordine (€ 4,00)" */}
                <div className="flex flex-col md:flex-row items-stretch gap-2.5 md:gap-3">
                  {/* 1. 📢 Annuncia al Volo */}
                  <button
                    type="button"
                    onClick={handleAnnounceTelegram}
                    className="flex-1 min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md bg-[#229ED9] hover:bg-[#1e8dbf] text-white cursor-pointer transition-all"
                    title="Copia il messaggio di annuncio per Telegram negli appunti"
                  >
                    <span className="text-base leading-none">📢</span>
                    <span>Annuncia al Volo</span>
                  </button>

                  {/* 2. 🚀 Forza Ordine con costo totale tra parentesi: es. Forza ordine (€ 4,00) */}
                  <button
                    type="button"
                    disabled={isGateEmpty}
                    onClick={handleToggleForce}
                    className={`flex-1 min-h-12 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 btn-aviation shadow-md transition-all ${
                      isGateEmpty
                        ? 'opacity-50 grayscale cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700'
                        : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                    }`}
                    title={
                      isGateEmpty
                        ? 'Imbarca prima un gioco al Gate per attivare il Volo Forzato'
                        : "Bypassa la soglia minima e forza la partenza dell'ordine dividendo le spese di spedizione"
                    }
                  >
                    <span className="text-base leading-none">🚀</span>
                    <span>Forza ordine (€ {shippingCost.toFixed(2).replace('.', ',')})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REQUISITO 3: Link Diretto al Sito Ufficiale del Negozio */}
          {shop.websiteUrl && (
            <div className="pt-2 border-t border-slate-200 text-center relative z-0">
              <a
                href={shop.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors btn-aviation"
                title={`Visita il sito ufficiale di ${shop.name}`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Visita il sito di {shop.name}</span>
                <span className="text-[10px] text-slate-500">↗</span>
              </a>
            </div>
          )}
        </div>
      )}


    </article>
  )
}

export default GateAccordionItem
