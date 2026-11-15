import { supabase } from '../supabaseClient.js'
import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  User,
  Sparkles,
  Check,
  Luggage,
  Coins,
  Plane,
  Trash2,
  Calendar,
  Target,
  AlertTriangle,
  RotateCcw,
  Download,
  FileText,
  FileSpreadsheet,
  Lock,
  Layers,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import { exportPassengerMonthlyStatementPdf } from '../utils/pdfExport.js'
import { exportPassengerMonthlyStatementExcel } from '../utils/excelExport.js'
import { getShopEffectiveItems } from '../utils/pricing.js'
import { SHOPS_DATA } from '../data/stores.js'

export function PassportModal({
  isOpen,
  onClose,
  savedPassengerName = '',
  onSavePassengerName,
  userPurchases = [],
  onResetPurchases,
  cartItems = [],
  onRemoveItem,
  totalCartAmount = 0,
  flightBudget = 0,
  onSaveFlightBudget,
  userMonthlyBudgets = {},
  onSavePassengerMonthlyBudget,
  flightHistory = [],
  shops = SHOPS_DATA,
  isNightMode = false,
  wishlist = [],
  onAddWish,
  onRemoveWish,
}) {
  const [tempName, setTempName] = useState(savedPassengerName)
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false)
  const [downloadNotification, setDownloadNotification] = useState(null)
  const [nuovoDesiderio, setNuovoDesiderio] = useState('')

  // Blocco scroll del body con overscroll-behavior quando la modale è aperta
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      const prevOverscroll = document.body.style.overscrollBehavior
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
      return () => {
        document.body.style.overflow = prevOverflow || ''
        document.body.style.overscrollBehavior = prevOverscroll || ''
      }
    }
  }, [isOpen])

  // Chiusura tasto Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose && onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    setTempName(savedPassengerName)
  }, [savedPassengerName])

  const handleSaveName = (e) => {
    e.preventDefault()
    const trimmed = tempName.trim()
    if (!trimmed) return
    onSavePassengerName(trimmed)
    setNameSavedSuccess(true)
    setTimeout(() => setNameSavedSuccess(false), 2000)
  }

  // Mese corrente formattato in italiano (es. "Ottobre 2026")
  const currentMonthDefault = useMemo(() => {
    const raw = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date())
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [])

  // Nome passeggero normalizzato per filtri strettamente personali
  const cleanPassenger = useMemo(() => {
    return (savedPassengerName || '').trim().toLowerCase()
  }, [savedPassengerName])

  // =========================================================================
  // GESTIONE DEI MESI DISPONIBILI (Archiviati + Mese Corrente)
  // =========================================================================
  const availableMonths = useMemo(() => {
    const monthsSet = new Set()
    monthsSet.add(currentMonthDefault)

    // Aggiungi mesi dagli acquisti utente registrati
    userPurchases.forEach((p) => {
      const pUser = (p.nome_utente || savedPassengerName || '').trim().toLowerCase()
      if (pUser === cleanPassenger || !cleanPassenger) {
        if (p.mese && typeof p.mese === 'string' && p.mese.trim()) {
          monthsSet.add(p.mese.trim())
        } else if (p.data) {
          try {
            const raw = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date(p.data))
            monthsSet.add(raw.charAt(0).toUpperCase() + raw.slice(1))
          } catch {
            // ignora
          }
        }
      }
    })

    // Aggiungi mesi dai voli archiviati in FlightHistory
    flightHistory.forEach((flight) => {
      const flightDate = flight.date || ''
      // Esempio data: "17 Ottobre 2026", "28 Settembre 2026"
      const match = flightDate.match(/([A-Za-zàèéìòù]+)\s+(\d{4})/)
      if (match) {
        const flightMonth = `${match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()} ${match[2]}`
        // Controlla se il passeggero ha giochi in questo volo
        const hasMemberItem = (flight.items || []).some(
          (it) => (it.nome_utente || '').trim().toLowerCase() === cleanPassenger
        )
        if (hasMemberItem || !cleanPassenger) {
          monthsSet.add(flightMonth)
        }
      }
    })

    // Aggiungi mesi in cui il passeggero ha salvato un budget
    if (cleanPassenger && userMonthlyBudgets[savedPassengerName]) {
      Object.keys(userMonthlyBudgets[savedPassengerName]).forEach((m) => {
        if (m) monthsSet.add(m)
      })
    }

    return Array.from(monthsSet)
  }, [userPurchases, flightHistory, userMonthlyBudgets, savedPassengerName, cleanPassenger, currentMonthDefault])

  // Stato per il mese selezionato dal menu a tendina (default: mese corrente)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthDefault)

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(currentMonthDefault)
    }
  }, [availableMonths, currentMonthDefault, selectedMonth])

  const isCurrentMonth = selectedMonth === currentMonthDefault

  // =========================================================================
  // ESTRAZIONE ARTICOLI ESCLUSIVAMENTE DEL SOCIO LOGGATO PER QUALSIASI MESE
  // =========================================================================
  const getPassengerItemsForMonth = (targetMonth) => {
    const isTargetCurrent = targetMonth === currentMonthDefault
    const memberItems = []
    const seenItemKeys = new Set()

    // 1. Articoli dagli acquisti archiviati (userPurchases)
    userPurchases.forEach((p) => {
      const pUser = (p.nome_utente || savedPassengerName || '').trim().toLowerCase()
      let itemMonth = p.mese
      if (!itemMonth && p.data) {
        try {
          const raw = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date(p.data))
          itemMonth = raw.charAt(0).toUpperCase() + raw.slice(1)
        } catch {
          itemMonth = currentMonthDefault
        }
      }
      itemMonth = itemMonth || currentMonthDefault

      if ((!cleanPassenger || pUser === cleanPassenger) && itemMonth === targetMonth) {
        const key = `${p.nome_gioco}_${p.negozio}_${p.prezzo}`
        seenItemKeys.add(key)
        memberItems.push({
          id: p.id || `up-${Math.random()}`,
          nome_gioco: p.nome_gioco,
          negozio: p.negozio || 'Gate Imbarco',
          quantita: p.quantita || 1,
          prezzo: Number(p.prezzo || 0),
          risparmio: Number(p.risparmio || 0),
          metodo_pagamento: p.metodo_pagamento || 'Contanti',
          status: 'chiuso',
        })
      }
    })

    // 2. Articoli da FlightHistory (voli chiusi/archiviati)
    flightHistory.forEach((flight) => {
      const flightDate = flight.date || ''
      const match = flightDate.match(/([A-Za-zàèéìòù]+)\s+(\d{4})/)
      let flightMonth = ''
      if (match) {
        flightMonth = `${match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()} ${match[2]}`
      }
      if (flightMonth === targetMonth || (!flightMonth && isTargetCurrent)) {
        (flight.items || []).forEach((it) => {
          const itUser = (it.nome_utente || '').trim().toLowerCase()
          if (!cleanPassenger || itUser === cleanPassenger) {
            const key = `${it.nome_gioco}_${flight.shop?.name || ''}_${it.prezzo}`
            if (!seenItemKeys.has(key)) {
              seenItemKeys.add(key)
              memberItems.push({
                id: it.id || `fh-${Math.random()}`,
                nome_gioco: it.nome_gioco,
                negozio: flight.shop?.name || 'Gate Imbarco',
                quantita: it.quantita || 1,
                prezzo: Number(it.prezzo || 0),
                risparmio: Number(it.risparmio || 0),
                metodo_pagamento: it.metodo_pagamento || 'Contanti',
                status: 'chiuso',
              })
            }
          }
        })
      }
    })

    // 3. Se è il Mese Corrente, aggiungi i giochi del socio attualmente in attesa nei GATE APERTI
    if (isTargetCurrent) {
      shops.forEach((shop) => {
        const storeItems = cartItems.filter((it) => it.id_negozio === shop.id)
        const effectiveItems = getShopEffectiveItems(shop, storeItems)
        effectiveItems.forEach((it) => {
          const itUser = (it.nome_utente || '').trim().toLowerCase()
          if (!cleanPassenger || itUser === cleanPassenger) {
            const listino = it.prezzo_listino_totale || (it.prezzo_listino_unitario ? it.prezzo_listino_unitario * (it.quantita || 1) : it.prezzo)
            const diff = Math.max(0, listino - it.prezzo)
            memberItems.push({
              id: it.id,
              nome_gioco: it.nome_gioco,
              negozio: shop.name || shop.id,
              id_negozio: shop.id,
              quantita: it.quantita || 1,
              prezzo: Number(it.prezzo || 0),
              risparmio: it.risparmio !== undefined ? Number(it.risparmio) : Number(diff.toFixed(2)),
              metodo_pagamento: it.metodo_pagamento || 'Contanti',
              status: 'aperto',
            })
          }
        })
      })
    }

    return memberItems
  }

  // =========================================================================
  // GESTIONE BUDGET DI VOLO PERSONALE E MENSILE
  // =========================================================================
  
  // =========================================================================
  // SUPABASE: Recupero Budget reale dalla tabella 'soci'
  // =========================================================================
  const [dbBudget, setDbBudget] = useState(null)

  useEffect(() => {
    if (!isOpen || !savedPassengerName) return

    let isMounted = true
    const fetchMemberBudget = async () => {
      try {
        const { data, error } = await supabase
          .from('soci')
          .select('budget, nome')
          .ilike('nome', savedPassengerName.trim())
          .maybeSingle()

        if (error) {
          console.warn('Errore lettura budget da soci (Supabase):', error.message)
          return
        }

        if (isMounted && data && data.budget !== undefined && data.budget !== null) {
          const val = parseFloat(data.budget) || 0
          setDbBudget(val)
        }
      } catch (err) {
        console.warn('Supabase fetch soci budget error:', err)
      }
    }

    fetchMemberBudget()
    return () => { isMounted = false }
  }, [isOpen, savedPassengerName])

  // Ottieni il budget impostato per il socio nel mese corrente
  const currentMemberBudget = useMemo(() => {
    if (dbBudget !== null && dbBudget !== undefined) {
      return dbBudget
    }
    const userMap = userMonthlyBudgets[savedPassengerName] || {}
    if (userMap[currentMonthDefault] !== undefined) {
      return userMap[currentMonthDefault]
    }
    return flightBudget || 0
  }, [dbBudget, userMonthlyBudgets, savedPassengerName, currentMonthDefault, flightBudget])

  const [tempBudget, setTempBudget] = useState(
    currentMemberBudget > 0 ? String(currentMemberBudget) : ''
  )
  const [budgetSavedSuccess, setBudgetSavedSuccess] = useState(false)

  useEffect(() => {
    setTempBudget(currentMemberBudget > 0 ? String(currentMemberBudget) : '')
  }, [currentMemberBudget])

  const handleSaveBudget = (e) => {
    if (e) e.preventDefault()
    const parsed = Math.max(0, parseFloat(tempBudget) || 0)
    if (onSavePassengerMonthlyBudget) {
      onSavePassengerMonthlyBudget(parsed, currentMonthDefault, savedPassengerName)
    } else if (onSaveFlightBudget) {
      onSaveFlightBudget(parsed)
    }

    // Aggiornamento asincrono su Supabase tabella 'soci'
    if (savedPassengerName) {
      setDbBudget(parsed)
      supabase
        .from('soci')
        .upsert({ nome: savedPassengerName.trim(), budget: parsed }, { onConflict: 'nome' })
        .then(({ error }) => {
          if (error) console.warn('Errore salvataggio budget su soci:', error.message)
        })
        .catch((e) => console.warn('Supabase error:', e))
    }
    setBudgetSavedSuccess(true)
    setTimeout(() => setBudgetSavedSuccess(false), 2000)
  }

  const handleQuickAddBudget = (amount) => {
    const current = parseFloat(tempBudget) || 0
    const updated = Math.max(0, current + amount)
    setTempBudget(String(updated))
    if (onSavePassengerMonthlyBudget) {
      onSavePassengerMonthlyBudget(updated, currentMonthDefault, savedPassengerName)
    } else if (onSaveFlightBudget) {
      onSaveFlightBudget(updated)
    }
    setBudgetSavedSuccess(true)
    setTimeout(() => setBudgetSavedSuccess(false), 2000)
  }

  const handleResetBudget = () => {
    setTempBudget('')
    if (onSavePassengerMonthlyBudget) {
      onSavePassengerMonthlyBudget(0, currentMonthDefault, savedPassengerName)
    } else if (onSaveFlightBudget) {
      onSaveFlightBudget(0)
    }
  }

  // =========================================================================
  // CALCOLO DELLA SPESA PERSONALE (Strettamente per il socio loggato)
  // =========================================================================
  // Per il mese selezionato:
  const selectedMonthItems = useMemo(() => {
    return getPassengerItemsForMonth(selectedMonth)
  }, [selectedMonth, userPurchases, flightHistory, cartItems, shops, cleanPassenger, currentMonthDefault])

  const closedPurchasesSelectedMonth = useMemo(() => {
    return selectedMonthItems.filter((it) => it.status === 'chiuso')
  }, [selectedMonthItems])

  const activeGateItemsSelectedMonth = useMemo(() => {
    return selectedMonthItems.filter((it) => it.status === 'aperto')
  }, [selectedMonthItems])

  const totalSpeso = useMemo(() => {
    return Number(selectedMonthItems.reduce((sum, it) => sum + (it.prezzo || 0), 0).toFixed(2))
  }, [selectedMonthItems])

  const totalRisparmiato = useMemo(() => {
    return Number(selectedMonthItems.reduce((sum, it) => sum + (it.risparmio || 0), 0).toFixed(2))
  }, [selectedMonthItems])

  // Budget applicabile al mese selezionato
  const selectedMonthBudget = useMemo(() => {
    const userMap = userMonthlyBudgets[savedPassengerName] || {}
    if (userMap[selectedMonth] !== undefined) {
      return userMap[selectedMonth]
    }
    return isCurrentMonth ? currentMemberBudget : 0
  }, [userMonthlyBudgets, savedPassengerName, selectedMonth, isCurrentMonth, currentMemberBudget])

  // REQUISITI 2 & 3: Calcolo ratio budget e avanzamento grafico
  const budgetNum = Math.max(0, parseFloat(selectedMonthBudget) || 0)
  const currentSpent = Math.max(0, totalSpeso || 0)
  const budgetRatio = budgetNum > 0 ? currentSpent / budgetNum : 0
  const budgetPercent = Math.round(budgetRatio * 100)
  const remainingBudget = budgetNum > 0 ? Math.max(0, budgetNum - currentSpent) : 0
  const overBudgetAmount = budgetNum > 0 && currentSpent > budgetNum ? currentSpent - budgetNum : 0

  // FEEDBACK COLORATO DINAMICO
  // - Verde / Ciano: sotto l'80%
  // - Giallo/Arancione: tra l'80% e il 99% (avviso di stiva quasi piena)
  // - Rosso (con avviso testuale): supera il budget impostato
  const budgetStatus = useMemo(() => {
    if (budgetNum <= 0) {
      return {
        level: 'none',
        barColor: isNightMode ? 'bg-slate-700' : 'bg-slate-300',
        badgeBg: isNightMode
          ? 'bg-slate-800 text-slate-300 border-slate-700'
          : 'bg-slate-100 text-slate-700 border-slate-300',
        badgeText: 'Non Impostato',
        cardBg: isNightMode ? 'bg-[#091224] border-slate-700/80' : 'bg-white border-slate-200',
      }
    }
    if (currentSpent > budgetNum) {
      return {
        level: 'over',
        barColor: 'bg-rose-500',
        badgeBg: isNightMode
          ? 'bg-rose-950/90 text-rose-200 border-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.4)]'
          : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
        badgeText: '🔴 Sovraccarico Stiva',
        cardBg: isNightMode
          ? 'bg-[#260e16] border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.25)]'
          : 'bg-rose-50/70 border-rose-300',
      }
    }
    if (budgetRatio >= 0.8) {
      return {
        level: 'warning',
        barColor: 'bg-amber-500',
        badgeBg: isNightMode
          ? 'bg-amber-950/90 text-amber-200 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
          : 'bg-amber-100 text-amber-900 border-amber-300',
        badgeText: '🟡 Stiva Quasi Piena (80-99%)',
        cardBg: isNightMode
          ? 'bg-[#261605] border-amber-500/80 shadow-[0_0_18px_rgba(245,158,11,0.25)]'
          : 'bg-amber-50/70 border-amber-300',
      }
    }
    return {
      level: 'good',
      barColor: isNightMode ? 'bg-cyan-400' : 'bg-emerald-500',
      badgeBg: isNightMode
        ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.35)]'
        : 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeText: '🟢 Entro i Limiti (< 80%)',
      cardBg: isNightMode
        ? 'bg-[#061d1e] border-cyan-500/80 shadow-[0_0_18px_rgba(6,182,212,0.2)]'
        : 'bg-emerald-50/50 border-emerald-200',
    }
  }, [budgetNum, currentSpent, budgetRatio, isNightMode])

  // =========================================================================
  // DOWNLOAD ESTRATTO CONTO MENSILE (Solo dati del socio loggato)
  // =========================================================================
  const handleDownloadStatementPdf = (month) => {
    const items = getPassengerItemsForMonth(month)
    const userMap = userMonthlyBudgets[savedPassengerName] || {}
    const monthBudget = userMap[month] !== undefined ? userMap[month] : (month === currentMonthDefault ? currentMemberBudget : 0)
    const spent = items.reduce((s, it) => s + (it.prezzo || 0), 0)
    const savings = items.reduce((s, it) => s + (it.risparmio || 0), 0)

    exportPassengerMonthlyStatementPdf(
      savedPassengerName || 'Passeggero',
      month,
      monthBudget,
      spent,
      savings,
      items
    )

    setDownloadNotification(`📄 PDF Estratto ${month} scaricato con successo!`)
    setTimeout(() => setDownloadNotification(null), 3500)
  }

  const handleDownloadStatementExcel = async (month) => {
    const items = getPassengerItemsForMonth(month)
    const userMap = userMonthlyBudgets[savedPassengerName] || {}
    const monthBudget = userMap[month] !== undefined ? userMap[month] : (month === currentMonthDefault ? currentMemberBudget : 0)
    const spent = items.reduce((s, it) => s + (it.prezzo || 0), 0)
    const savings = items.reduce((s, it) => s + (it.risparmio || 0), 0)

    await exportPassengerMonthlyStatementExcel(
      savedPassengerName || 'Passeggero',
      month,
      monthBudget,
      spent,
      savings,
      items
    )

    setDownloadNotification(`📊 Excel Estratto ${month} scaricato con successo!`)
    setTimeout(() => setDownloadNotification(null), 3500)
  }

  if (!isOpen) return null

  const handleAddWishSubmit = (e) => {
    e?.preventDefault()
    const trimmed = nuovoDesiderio.trim()
    if (!trimmed) return
    if (onAddWish) {
      onAddWish(trimmed)
    }
    setNuovoDesiderio('')
  }

  const handleClose = () => {
    document.body.style.overflow = ''
    document.body.style.overscrollBehavior = ''
    onClose && onClose()
  }

  return (
    <div
      style={{ overscrollBehavior: 'contain' }}
      className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 overflow-hidden bg-slate-950/70 backdrop-blur-md animate-ticket-pop-in touch-none cursor-pointer"
      onClick={handleClose}
    >
      {/* Modal a forma di Passaporto / Lounge Passeggero */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl passport-cover rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col border-2 shadow-2xl transition-all duration-300 touch-auto cursor-default ${
          isNightMode ? 'border-amber-500/90 shadow-[0_0_30px_rgba(245,158,11,0.25)]' : 'border-amber-500'
        }`}
      >
        {/* Notifica Rapida Download Documento */}
        {downloadNotification && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-mono-code text-xs font-black shadow-xl flex items-center gap-2 animate-ticket-pop-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{downloadNotification}</span>
          </div>
        )}

        {/* Copertina Superiore Passaporto con Tasto Indietro a Sinistra */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-2 border-b-2 border-amber-500/80 shrink-0">
          {/* Tasto Indietro a sinistra in stile iOS Liquid Glass */}
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-full text-xs sm:text-sm font-bold bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white backdrop-blur-xl border border-black/10 dark:border-white/20 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            title="Torna ai Gate"
            aria-label="Torna ai Gate"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Gate</span>
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-base shadow-inner text-amber-300 shrink-0">
              🛂
            </div>
            <div className="truncate">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                Passaporto
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
            title="Chiudi Passaporto"
            aria-label="Chiudi Passaporto"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Pagine Interne del Passaporto */}
        <div
          className={`p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 transition-colors duration-300 ${
            isNightMode ? 'bg-[#070d19] text-slate-100' : 'bg-[#fafaf9] text-slate-800'
          }`}
        >
          {/* SEZIONE 1: DATI ANAGRAFICI PASSEGGERO */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-xs relative ${
              isNightMode ? 'bg-[#0c1527] border-slate-800/90 text-white' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono-code font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isNightMode ? 'text-cyan-300' : 'text-blue-900'
                }`}
              >
                <User className={`w-3.5 h-3.5 ${isNightMode ? 'text-cyan-400' : 'text-blue-600'}`} />
                1. Dati Anagrafici Passeggero
              </span>
              <span className={`text-[10px] font-mono-code ${isNightMode ? 'text-slate-400' : 'text-slate-400'}`}>
                DOC: JP-2026-BOARD
              </span>
            </div>

            <form onSubmit={handleSaveName} className="flex items-center gap-2 w-full max-w-full">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Nome e Cognome (es. Marco)"
                className={`flex-1 min-w-0 w-full min-h-11 px-3 sm:px-3.5 rounded-xl border font-bold focus:outline-none transition-all text-sm sm:text-base ${
                  isNightMode
                    ? 'bg-[#050b14] border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                }`}
              />
              <button
                type="submit"
                className={`shrink-0 w-auto min-h-11 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 btn-aviation text-white shadow-xs cursor-pointer whitespace-nowrap ${
                  nameSavedSuccess
                    ? 'bg-emerald-600'
                    : isNightMode
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {nameSavedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Registrato!</span>
                  </>
                ) : (
                  <span>Aggiorna</span>
                )}
              </button>
            </form>
            <p className={`text-[11px] mt-1.5 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
              ✈️ Stai visualizzando i dati associati esclusivamente a{' '}
              <strong className={isNightMode ? 'text-cyan-300' : 'text-blue-900'}>
                {savedPassengerName || 'questo passeggero'}
              </strong>
              .
            </p>
          </div>

          {/* SEZIONE 2: BUDGET PERSONALE MENSILE & AVANZAMENTO SPESA */}
          <div className={`p-4 rounded-2xl border transition-all shadow-xs ${budgetStatus.cardBg}`}>
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono-code font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isNightMode ? 'text-cyan-300' : 'text-blue-900'
                }`}
              >
                <Target className={`w-3.5 h-3.5 ${isNightMode ? 'text-cyan-400' : 'text-blue-600'}`} />
                2. Budget di Volo Mensile ({currentMonthDefault})
              </span>
              <span
                className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border shadow-2xs ${budgetStatus.badgeBg}`}
              >
                {budgetStatus.badgeText}
              </span>
            </div>

            {/* Input Form per Impostare/Modificare il Budget Personale */}
            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label
                  htmlFor="input-flight-budget"
                  className={`block text-xs font-black mb-1 ${
                    isNightMode ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  Imposta il tuo Budget per {currentMonthDefault} (€)
                </label>
                <div className="flex items-center gap-2 w-full max-w-full">
                  <div className="relative flex-1 min-w-0 w-full">
                    <input
                      id="input-flight-budget"
                      type="number"
                      min="0"
                      step="5"
                      value={tempBudget}
                      onChange={(e) => setTempBudget(e.target.value)}
                      placeholder="Es. 150 (massimale di spesa)"
                      className={`w-full min-h-11 pl-3 sm:pl-3.5 pr-7 sm:pr-8 rounded-xl border font-mono-code font-black text-sm sm:text-base focus:outline-none transition-all ${
                        isNightMode
                          ? 'bg-[#050b14] border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                    <span
                      className={`absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 font-mono-code font-bold text-xs sm:text-sm pointer-events-none ${
                        isNightMode ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      €
                    </span>
                  </div>
                  <button
                    type="submit"
                    className={`shrink-0 w-auto min-h-11 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 btn-aviation text-white shadow-xs cursor-pointer transition-all whitespace-nowrap ${
                      budgetSavedSuccess
                        ? 'bg-emerald-600'
                        : isNightMode
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {budgetSavedSuccess ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Salvato!</span>
                      </>
                    ) : (
                      <span>Salva Budget</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Bottoni Rapidi (+50€, +100€, +150€, Reset) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-mono-code uppercase font-bold mr-1 ${
                    isNightMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Rapidi:
                </span>
                {[50, 100, 150].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddBudget(val)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono-code font-bold transition-all shadow-2xs cursor-pointer ${
                      isNightMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300 hover:border-cyan-400'
                        : 'bg-white/90 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border-slate-200 text-slate-700'
                    }`}
                  >
                    +{val}€
                  </button>
                ))}
                {budgetNum > 0 && (
                  <button
                    type="button"
                    onClick={handleResetBudget}
                    className={`ml-auto px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isNightMode
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Azzera Budget di Volo"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Azzera</span>
                  </button>
                )}
              </div>
            </form>

            {/* INDICATORE VISIVO E BARRA DI AVANZAMENTO IN TEMPO REALE */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="font-bold flex items-center gap-1.5">
                  <span>Spesa Personale Mese:</span>
                  <strong className={isNightMode ? 'text-white' : 'text-slate-900'}>
                    {currentSpent.toFixed(2)} €
                  </strong>
                  {budgetNum > 0 && (
                    <span className="text-slate-400 font-normal">/ {budgetNum.toFixed(2)} €</span>
                  )}
                </span>

                {budgetNum > 0 ? (
                  <span
                    className={`font-black ${
                      currentSpent > budgetNum
                        ? 'text-rose-500'
                        : budgetRatio >= 0.8
                        ? 'text-amber-500'
                        : isNightMode
                        ? 'text-cyan-400'
                        : 'text-emerald-600'
                    }`}
                  >
                    {budgetPercent}%
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">Nessun limite</span>
                )}
              </div>

              {/* Barra di Avanzamento con Transizione Morbida */}
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative shadow-inner">
                <div
                  className={`h-full transition-all duration-500 ease-out rounded-full ${
                    budgetNum <= 0
                      ? isNightMode
                        ? 'bg-slate-700'
                        : 'bg-slate-300'
                      : budgetStatus.barColor
                  }`}
                  style={{
                    width: budgetNum > 0 ? `${Math.min(100, budgetPercent)}%` : '0%',
                  }}
                />
              </div>

              {/* Dettaglio Rimanente / Sovraccarico */}
              <div className="flex items-center justify-between text-[11px] font-mono-code">
                <span className={isNightMode ? 'text-slate-400' : 'text-slate-500'}>
                  {budgetNum > 0 ? (
                    currentSpent > budgetNum ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sovraccarico di +{overBudgetAmount.toFixed(2)} €!
                      </span>
                    ) : (
                      <span>
                        Capienza Stiva Rimanente: <strong>{remainingBudget.toFixed(2)} €</strong>
                      </span>
                    )
                  ) : (
                    <span>Imposta una cifra massima per attivare la barra di capienza.</span>
                  )}
                </span>

                <span className="text-[10px] text-slate-400">
                  {selectedMonthItems.length} {selectedMonthItems.length === 1 ? 'gioco' : 'giochi'}
                </span>
              </div>
            </div>
          </div>

          {/* SEZIONE 3: SELETTORE MESE & STATISTICHE DEL SOCIO */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isNightMode ? 'bg-[#0c1527] border-slate-800' : 'bg-white border-blue-200/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shadow-2xs shrink-0 ${
                  isNightMode
                    ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                    : 'bg-blue-100 border-blue-200 text-blue-700'
                }`}
              >
                <Calendar className={`w-4 h-4 ${isNightMode ? 'text-cyan-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <span
                  className={`text-[11px] font-mono-code font-black uppercase tracking-wider block ${
                    isNightMode ? 'text-cyan-300' : 'text-blue-950'
                  }`}
                >
                  3. Dettaglio Mensile
                </span>
                <span className={`text-[10px] font-medium ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Seleziona il mese da esaminare nel passaporto
                </span>
              </div>
            </div>

            {/* Menu a tendina Mese */}
            <div className="relative">
              <select
                id="select-mese-passaporto"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`w-full sm:w-auto appearance-none font-mono-code font-bold text-base pl-3.5 pr-9 py-2 rounded-xl border focus:outline-none focus:ring-2 cursor-pointer shadow-2xs transition-all ${
                  isNightMode
                    ? 'bg-[#050b14] hover:bg-slate-900 text-white border-slate-700 focus:border-cyan-400 focus:ring-cyan-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} className={isNightMode ? 'bg-slate-900 text-white' : ''}>
                    {m} {m === currentMonthDefault ? '🛫 (Mese Corrente)' : '📦'}
                  </option>
                ))}
              </select>
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${
                  isNightMode ? 'text-cyan-400' : 'text-slate-500'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* CARDS STATISTICHE MENSILI (Totale Speso & Totale Risparmiato) */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Stat Card 1: Spesa Personale */}
              <div
                className={`p-3.5 rounded-2xl border shadow-xs text-center flex flex-col justify-center ${
                  isNightMode ? 'bg-[#0c1527] border-slate-800 text-white' : 'bg-white border-slate-200'
                }`}
              >
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase block ${
                    isNightMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Tua Spesa Effettiva
                </span>
                <span
                  className={`text-xl sm:text-2xl font-mono-code font-black block mt-0.5 ${
                    isNightMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {totalSpeso.toFixed(2)} €
                </span>
                <span className={`text-[10px] mt-0.5 truncate px-1 ${isNightMode ? 'text-slate-400' : 'text-slate-400'}`}>
                  in {selectedMonth}
                </span>
              </div>

              {/* Stat Card 2: Risparmio Personale Gruppo */}
              <div
                className={`p-3.5 rounded-2xl border shadow-xs text-center flex flex-col justify-center ${
                  isNightMode ? 'bg-[#051c17] border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase block flex items-center justify-center gap-1 ${
                    isNightMode ? 'text-emerald-400' : 'text-emerald-800'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  Tuo Risparmio
                </span>
                <span
                  className={`text-xl sm:text-2xl font-mono-code font-black block mt-0.5 ${
                    isNightMode ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                >
                  +{totalRisparmiato.toFixed(2)} €
                </span>
                <span
                  className={`text-[10px] font-black mt-0.5 truncate px-1 ${
                    isNightMode ? 'text-emerald-300' : 'text-emerald-700'
                  }`}
                >
                  sconti gruppo ({selectedMonth})
                </span>
              </div>
            </div>

            {/* REQUISITO: AREA WISHLIST NEL PASSAPORTO */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 p-4 mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                  isNightMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <span>La mia Wishlist ⭐️</span>
                  {wishlist.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {wishlist.length} {wishlist.length === 1 ? 'titolo' : 'titoli'}
                    </span>
                  )}
                </h3>
                <span className={`text-[11px] ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  I giochi che sogni di comprare
                </span>
              </div>

              {/* FORM DI INSERIMENTO WISHLIST */}
              <form onSubmit={handleAddWishSubmit} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={nuovoDesiderio}
                  onChange={(e) => setNuovoDesiderio(e.target.value)}
                  placeholder="Aggiungi un gioco ai desideri..."
                  className="flex-1 bg-white/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 shadow-sm transition-all"
                />
                <button
                  type="submit"
                  className="shrink-0 flex items-center justify-center w-10 h-10 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-lg shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Aggiungi alla Wishlist"
                >
                  +
                </button>
              </form>

              {/* LISTA DEI GIOCHI DESIDERATI A SCORRIMENTO ORIZZONTALE (No crescita verticale) */}
              <div className="flex flex-row overflow-x-auto flex-nowrap gap-2 mt-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(!wishlist || wishlist.length === 0) ? (
                  <div className={`py-1 text-xs italic ${
                    isNightMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Nessun gioco nella tua lista desideri.
                  </div>
                ) : (
                  wishlist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 shrink-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 rounded-full px-3 py-1.5 text-xs shadow-sm"
                    >
                      <span className="font-medium whitespace-nowrap text-slate-800 dark:text-slate-200">
                        {item.nome_gioco || item.titolo}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveWish && onRemoveWish(item.id)}
                        className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-500 dark:text-slate-400 transition-colors text-[10px] font-bold cursor-pointer"
                        title="Rimuovi"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SEZIONE 4: ELENCO GIOCHI IMBARCATI DAL SOCIO */}
          <div
            className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
              isNightMode ? 'bg-[#0c1527] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2 ${
                isNightMode ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <span
                className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                  isNightMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                <Luggage className={`w-4 h-4 ${isNightMode ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span>
                  4. I tuoi giochi in {selectedMonth} ({selectedMonthItems.length})
                </span>
              </span>

              {closedPurchasesSelectedMonth.length > 0 && onResetPurchases && (
                <button
                  type="button"
                  onClick={onResetPurchases}
                  className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Azzera lo storico del passaporto per test"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Azzera Storico</span>
                </button>
              )}
            </div>

            {selectedMonthItems.length === 0 ? (
              <div
                className={`text-center py-5 px-3 rounded-xl border border-dashed text-xs font-medium ${
                  isNightMode
                    ? 'bg-[#050b14] border-slate-800 text-slate-400'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <span>🧳 Nessun gioco registrato per {savedPassengerName || 'questo socio'} in {selectedMonth}.</span>
                <p className={`text-[11px] mt-1 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isCurrentMonth
                    ? 'Aggiungi giochi a tuo nome nei vari Gate per vederli comparire qui!'
                    : 'Nessun ordine completato registrato in questo mese.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedMonthItems.map((item, idx) => (
                  <li
                    key={item.id || idx}
                    className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                      item.status === 'aperto'
                        ? isNightMode
                          ? 'bg-[#071728] border-cyan-700/60'
                          : 'bg-blue-50/70 border-blue-200'
                        : isNightMode
                        ? 'bg-[#050b14] hover:bg-slate-900 border-slate-800/90'
                        : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className={`font-black text-sm shrink-0 select-none ${
                          item.status === 'aperto'
                            ? 'text-amber-400 animate-pulse'
                            : isNightMode
                            ? 'text-cyan-400'
                            : 'text-blue-600'
                        }`}
                      >
                        {item.status === 'aperto' ? '⏳' : '•'}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`font-extrabold block truncate ${
                            isNightMode ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {item.quantita && item.quantita > 1 ? `${item.quantita}x ` : ''}
                          {item.nome_gioco}
                        </span>
                        <div
                          className={`flex items-center gap-1.5 text-[10px] font-medium flex-wrap ${
                            isNightMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          <span>✈️ {item.negozio || 'Gate Negozio'}</span>
                          {item.status === 'aperto' ? (
                            <span className="text-amber-500 font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-400/30">
                              Al Gate (Aperto)
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-400/30">
                              Decollato
                            </span>
                          )}
                          {item.metodo_pagamento && (
                            <>
                              <span>•</span>
                              <span className={`font-bold ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.metodo_pagamento === 'Satispay'
                                  ? '🔴 Satispay'
                                  : item.metodo_pagamento === 'PayPal'
                                  ? '🅿️ PayPal'
                                  : '💵 Contanti'}
                              </span>
                            </>
                          )}
                          {item.risparmio > 0 && (
                            <>
                              <span>•</span>
                              <span
                                className={
                                  isNightMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold'
                                }
                              >
                                Risparmio: +{item.risparmio.toFixed(2)}€
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span
                        className={`font-mono-code font-black text-sm ${
                          isNightMode ? 'text-cyan-400' : 'text-blue-900'
                        }`}
                      >
                        {item.prezzo ? item.prezzo.toFixed(2) : '0.00'} €
                      </span>

                      {/* Tasto Rimuovi per giochi al Gate con trigger Scatola Nera (SOLO PROPRIETARIO + CONFERMA) */}
                      {item.status === 'aperto' && onRemoveItem && (() => {
                        const itemUser = (item.nome_utente || item.passenger || item.user || item.nome_passeggero || '').trim().toLowerCase()
                        const loggedUser = (savedPassengerName || '').trim().toLowerCase()
                        const isOwner = loggedUser && itemUser === loggedUser
                        if (!isOwner) return null

                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Vuoi davvero rimuovere "${item.nome_gioco}" dal Gate?`)) {
                                onRemoveItem(item.id)
                              }
                            }}
                            className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Rimuovi il tuo gioco dal Gate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* SEZIONE 5: STORICO PERSONALE (RESOCONTO DEI MESI & DOWNLOAD ESTRATTO CONTO) */}
          <div
            className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
              isNightMode ? 'bg-[#0c1527] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isNightMode ? 'bg-cyan-950/60 text-cyan-400' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className={`text-xs sm:text-sm font-black leading-tight ${
                      isNightMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    5. Storico Personale & Estratti di Volo
                  </h3>
                  <span className={`text-[10px] font-medium ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Resoconto mensile scaricabile per il socio {savedPassengerName || 'Passeggero'}
                  </span>
                </div>
              </div>
            </div>

            <p className={`text-[11px] leading-relaxed ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Ogni mese congelato conserva lo storico dei tuoi acquisti e il budget impostato. Scarica il resoconto
              ufficiale in <strong>PDF</strong> o <strong>Excel</strong> con le sole quote a te intestate.
            </p>

            {/* Elenco dei Mesi con Dati di Spesa e Tasti di Download */}
            <div className="space-y-2.5 pt-1">
              {availableMonths.map((month) => {
                const monthItems = getPassengerItemsForMonth(month)
                const userMap = userMonthlyBudgets[savedPassengerName] || {}
                const monthBudget =
                  userMap[month] !== undefined
                    ? userMap[month]
                    : month === currentMonthDefault
                    ? currentMemberBudget
                    : 0
                const monthSpent = monthItems.reduce((s, it) => s + (it.prezzo || 0), 0)
                const monthSavings = monthItems.reduce((s, it) => s + (it.risparmio || 0), 0)
                const isCurrent = month === currentMonthDefault

                return (
                  <div
                    key={month}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? isNightMode
                          ? 'bg-[#09152b] border-cyan-600/70 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'bg-blue-50/60 border-blue-300 shadow-2xs'
                        : isNightMode
                        ? 'bg-[#050b14] border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Dati Sinistra: Mese e Badge Stato */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm sm:text-base ${
                              isNightMode ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {month}
                          </span>
                          {isCurrent ? (
                            <span
                              className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#ea580c] border border-cyan-400/40"
                              style={{ color: '#ea580c', fontWeight: 600 }}
                            >
                              In Corso 🛫
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-400/30 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Chiuso / Congelato ❄️
                            </span>
                          )}
                        </div>

                        {/* Riepilogo cifre */}
                        <div className="flex items-center gap-3 mt-1 text-xs font-mono-code flex-wrap">
                          <span>
                            Budget:{' '}
                            <strong className={isNightMode ? 'text-slate-200' : 'text-slate-700'}>
                              {monthBudget > 0 ? `${monthBudget.toFixed(2)} €` : 'N/D'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Speso:{' '}
                            <strong
                              className={
                                monthBudget > 0 && monthSpent > monthBudget
                                  ? 'text-rose-500'
                                  : isNightMode
                                  ? 'text-cyan-300'
                                  : 'text-blue-900'
                              }
                            >
                              {monthSpent.toFixed(2)} €
                            </strong>
                          </span>
                          {monthSavings > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-500 font-bold">
                                +{monthSavings.toFixed(2)} € risp.
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-slate-400">
                            {monthItems.length} {monthItems.length === 1 ? 'gioco' : 'giochi'}
                          </span>
                        </div>
                      </div>

                      {/* Tasti di Download: PDF ed Excel per singolo socio */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadStatementPdf(month)}
                          className={`btn-aviation px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all ${
                            isNightMode
                              ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-rose-500/40 hover:border-rose-400'
                              : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
                          }`}
                          title={`Scarica Estratto di Volo in PDF per ${month}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadStatementExcel(month)}
                          className={`btn-aviation px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all ${
                            isNightMode
                              ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                          }`}
                          title={`Scarica Estratto di Volo in Excel per ${month}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Excel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dati Passaporto MRZ (Machine Readable Zone) */}
          <div
            className={`p-3 rounded-xl font-mono-code text-[10px] tracking-widest uppercase leading-tight select-none border ${
              isNightMode ? 'bg-[#050b14] text-slate-500 border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <div>
              P&lt;ITA{savedPassengerName ? savedPassengerName.toUpperCase().replace(/\s+/g, '&lt;') : 'PASSEGGERO'}
              &lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            </div>
            <div>JP2026884M9999999&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;06</div>
          </div>
        </div>

        {/* Footer Passaporto con Tasto in Basso a Sinistra sempre raggiungibile */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 gap-2">
          {/* 2. PULSANTE IN BASSO A SINISTRA (SEMPRE RAGGIUNGIBILE COL POLLICE) */}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-white/90 text-slate-900 backdrop-blur-xl border border-white/20 shadow-md active:scale-95 transition-all cursor-pointer"
            title="Torna ai Gate"
            aria-label="Torna ai Gate"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Gate</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className={`px-4 py-2 min-h-[40px] rounded-full font-black text-xs sm:text-sm btn-aviation cursor-pointer shadow-md flex items-center justify-center ${
              isNightMode
                ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Chiudi Lounge
          </button>
        </div>
      </div>
    </div>
  )
}

export default PassportModal
