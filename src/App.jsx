import { supabase } from './supabaseClient.js'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { AirportHeader } from './components/AirportHeader.jsx'
import { FloatingBottomBar } from './components/FloatingBottomBar.jsx'
import { NewLuggageModal } from './components/NewLuggageModal.jsx'
import { HangarPrevenditeModal } from './components/HangarPrevenditeModal.jsx'
import { Gates } from './components/Gates.jsx'
import { GateAccordionItem } from './components/GateAccordionItem.jsx'
import { PassportModal } from './components/PassportModal.jsx'
import { FlightHistoryModal } from './components/FlightHistoryModal.jsx'
import { SecurityBriefingTour } from './components/SecurityBriefingTour.jsx'
import { BlackBoxToast } from './components/BlackBoxToast.jsx'
import { Footer } from './components/Footer.jsx'
import { SHOPS_DATA } from './data/stores.js'
import { FLIGHT_HISTORY_DATA } from './data/flightHistoryData.js'
import { getShopEffectiveItems } from './utils/pricing.js'

// COMPONENTE CHECK-IN (Definito FUORI dall'App principale)
const CheckInScreen = ({ onLogin }) => {
  const [nome, setNome] = useState('')
  const handleLogin = () => {
    if (nome.trim()) {
      localStorage.setItem('nomePasseggero', nome.trim())
      onLogin(nome.trim())
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 dark:border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] text-center animate-slide-up">
        <h1 className="text-3xl font-bold mb-2">Just Play Port ✈️</h1>
        <p className="text-slate-600 dark:text-slate-300">Effettua il check-in per proseguire</p>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="Il tuo nome..."
          autoFocus
          className="w-full bg-white/70 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-3 mt-6 text-center text-lg focus:outline-none focus:ring-2 focus:ring-sky-400/60 shadow-sm transition-all"
        />
        <button
          type="button"
          onClick={handleLogin}
          disabled={!nome.trim()}
          className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 mt-4 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          Registrati / Entra
        </button>
      </div>
    </div>
  )
}

export function App() {
  // 1. STATO PASSEGGERO LOGGATO (blocco di check-in iniziale)
  const [passeggero, setPasseggero] = useState(() => {
    return localStorage.getItem('nomePasseggero') || localStorage.getItem('justplay_user') || localStorage.getItem('slothy_user') || ''
  })

  // STATO DIAGNOSTICA SUPABASE (Badge Online / Errore)
  const [dbStatus, setDbStatus] = useState({ online: false, error: null })

  const savedPassengerName = passeggero
  const setSavedPassengerName = setPasseggero

  const handleLoginCheckIn = (nomeInserito) => {
    const clean = (nomeInserito || '').trim()
    if (!clean) return
    setPasseggero(clean)
    try {
      localStorage.setItem('nomePasseggero', clean)
      localStorage.setItem('justplay_user', clean)
      localStorage.setItem('justplay_checkin_done', 'true')
    } catch (e) {
      console.error('Errore salvataggio passeggero:', e)
    }
  }

  // REQUISITO BRIEFING DI SICUREZZA: Onboarding Tour guidato
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)

  const handleBriefingStepChange = (step) => {
    // Al passo 3 ("Comandi di Decollo"), apri il primo Gate così i bottoni Annuncia/PDF sono visibili nel DOM
    if (step === 3) {
      if (sortedShops && sortedShops.length > 0) {
        setOpenGateId(sortedShops[0].id)
      }
    }
  }

  const handleFinishBriefing = () => {
    setIsBriefingOpen(false)
    try {
      localStorage.setItem('briefingCompleted', 'true')
      localStorage.setItem('justplay_briefing_completed', 'true')
    } catch (e) {
      console.error('Errore salvataggio briefingCompleted:', e)
    }
  }

  const handleSkipBriefing = () => {
    setIsBriefingOpen(false)
    try {
      localStorage.setItem('briefingCompleted', 'true')
      localStorage.setItem('justplay_briefing_completed', 'true')
    } catch (e) {
      console.error('Errore salvataggio briefingCompleted:', e)
    }
  }

  // Stato Modale "Passaporto Ludico"
  const [isPassportOpen, setIsPassportOpen] = useState(false)

  // STATO WISHLIST (Sincronizzato con Supabase tabella 'wishlist')
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('justplay_wishlist_v1')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('justplay_wishlist_v1', JSON.stringify(wishlist))
    } catch (e) {
      console.error('Errore salvataggio local wishlist:', e)
    }
  }, [wishlist])

  const handleAddWish = async (nomeGioco) => {
    const cleanNome = (nomeGioco || '').trim()
    if (!cleanNome) return

    // Ottimistico nello stato locale
    const tempId = `wish_${Date.now()}`
    const tempItem = { id: tempId, nome_gioco: cleanNome, data_aggiunta: new Date().toISOString() }
    setWishlist((prev) => [tempItem, ...prev])

    try {
      const { data, error } = await supabase
        .from('wishlist')
        .insert([{ nome_gioco: cleanNome }])
        .select()

      if (error) {
        alert("ERRORE SUPABASE: " + error.message)
        console.error('Errore Supabase wishlist insert:', error)
        return
      } else if (data && data[0]) {
        setWishlist((prev) => prev.map((w) => (w.id === tempId ? data[0] : w)))
      }
    } catch (err) {
      alert("ERRORE SUPABASE: " + (err.message || err))
      console.error('Errore Supabase:', err)
    }
  }

  const handleRemoveWish = async (id) => {
    setWishlist((prev) => prev.filter((w) => w.id !== id))
    try {
      const { error } = await supabase.from('wishlist').delete().eq('id', id)
      if (error) {
        console.error('Errore Supabase wishlist delete:', error)
      }
    } catch (err) {
      console.error('Errore Supabase:', err)
    }
  }

  // STATO PREVENDITE (Hangar Prevendite) con persistenza locale e Supabase
  const [isHangarOpen, setIsHangarOpen] = useState(false)
  const [prevendite, setPrevendite] = useState(() => {
    try {
      const saved = localStorage.getItem('justplay_prevendite_v1')
      if (saved) return JSON.parse(saved)
      return []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('justplay_prevendite_v1', JSON.stringify(prevendite))
    } catch (e) {
      console.error('Errore salvataggio prevendite:', e)
    }
  }, [prevendite])

  const handleAddPrevendita = async (nuova) => {
    // Ottimistico locale
    setPrevendite((prev) => [nuova, ...prev])

    try {
      const payload = {
        nome_passeggero: nuova.nome_utente || nuova.nome_passeggero || savedPassengerName || 'Passeggero',
        nome_gioco: nuova.nome_gioco,
        url_negozio: (nuova.url || nuova.url_negozio || '').trim() || null,
        negozio_scelto: nuova.id_negozio || nuova.negozio_scelto || 'playbazar',
        prezzo_listino: Number(nuova.prezzo || 0),
      }

      // Se fornita una data d'inserimento o uscita, includila solo se non vuota, altrimenti null o omettila per default now()
      const rawDate = nuova.data_inserimento || nuova.data_uscita || nuova.data
      if (rawDate && typeof rawDate === 'string' && rawDate.trim()) {
        payload.data_inserimento = rawDate.trim()
      }

      const { data, error } = await supabase
        .from('hangar_prevendite')
        .insert([payload])
        .select()

      if (error) {
        alert("ERRORE SUPABASE: " + error.message)
        console.error('Errore Supabase hangar_prevendite insert:', error)
        return
      } else if (data && data[0]) {
        const itemWithId = {
          ...nuova,
          id: data[0].id,
          nome_utente: data[0].nome_passeggero,
          nome_gioco: data[0].nome_gioco,
          url: data[0].url_negozio,
          id_negozio: data[0].negozio_scelto,
          prezzo: parseFloat(data[0].prezzo_listino) || 0,
          created_at: data[0].data_inserimento,
          data_uscita: nuova.data_uscita || data[0].data_inserimento,
        }
        setPrevendite((prev) => prev.map((p) => (p.id === nuova.id ? itemWithId : p)))
      }
    } catch (err) {
      alert("ERRORE SUPABASE: " + (err.message || err))
      console.error('Errore Supabase:', err)
    }
  }

  const handleRemovePrevendita = async (id) => {
    setPrevendite((prev) => prev.filter((p) => p.id !== id))
    try {
      const { error } = await supabase.from('hangar_prevendite').delete().eq('id', id)
      if (error) {
        console.error('Errore Supabase hangar_prevendite delete:', error)
      }
    } catch (err) {
      console.error('Errore Supabase:', err)
    }
  }

  // Modifica di una prevendita nell'Hangar (store, data, prezzo) con update Supabase
  const handleUpdatePrevendita = async (id, fieldsToUpdate) => {
    setPrevendite((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          ...fieldsToUpdate,
          id_negozio: fieldsToUpdate.id_negozio || fieldsToUpdate.negozio_scelto || item.id_negozio,
          prezzo: fieldsToUpdate.prezzo !== undefined ? parseFloat(fieldsToUpdate.prezzo) || 0 : item.prezzo,
          data_uscita: fieldsToUpdate.data_uscita !== undefined ? fieldsToUpdate.data_uscita : item.data_uscita,
        }
      })
    )

    try {
      const payload = {}
      if (fieldsToUpdate.id_negozio || fieldsToUpdate.negozio_scelto) {
        payload.negozio_scelto = fieldsToUpdate.id_negozio || fieldsToUpdate.negozio_scelto
      }
      if (fieldsToUpdate.prezzo !== undefined) {
        payload.prezzo_listino = Number(fieldsToUpdate.prezzo) || 0
      }

      // GESTIONE CAMPI DATA: se la data è specificata, se è vuota o whitespace va trasformata in null, altrimenti formattata
      if ('data_uscita' in fieldsToUpdate || 'data_inserimento' in fieldsToUpdate || 'data' in fieldsToUpdate) {
        const dateVal = fieldsToUpdate.data_uscita ?? fieldsToUpdate.data_inserimento ?? fieldsToUpdate.data
        if (dateVal && typeof dateVal === 'string' && dateVal.trim() !== '') {
          payload.data_inserimento = dateVal.trim()
        } else if (dateVal === null || dateVal === '') {
          // Se esplicitamente svuotata, passa null
          payload.data_inserimento = null
        }
      }

      if (Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from('hangar_prevendite')
          .update(payload)
          .eq('id', id)

        if (error) {
          console.error('Errore Supabase hangar_prevendite update:', error)
          alert('ERRORE AGGIORNAMENTO SUPABASE: ' + error.message)
        }
      }
    } catch (err) {
      console.error('Errore Supabase update hangar:', err)
    }
  }

  // AUTOMAZIONE: Spostamento automatico dal Hangar al Gate del negozio quando è disponibile
  const handleSpostaNelGate = async (prevendita) => {
    // 1. Rimuove dalla lista prevendite attive (locale e Supabase)
    handleRemovePrevendita(prevendita.id)

    // 2. Mappatura esatta delle percentuali di sconto per ogni negozio
    const DIZIONARIO_SCONTI = {
      'weega': 0,
      'playbazar': 20,
      'dragonstore': 0,
      'ls-giochi': 15,
      'frogames': 0,
      'philibert': 0,
      'boardhouse': 0,
      'magic-merchant': 0,
      'bottega-ludica': 0,
      'dungeon-dice': 0,
    }

    const targetShopId = prevendita.id_negozio || 'playbazar'
    const targetShop = shops.find((s) => s.id === targetShopId) || shops[0]
    
    // Recupero percentuale sconto (dal dizionario o fallback da targetShop.discount)
    let percentualeSconto = 0
    if (DIZIONARIO_SCONTI[targetShopId] !== undefined) {
      percentualeSconto = DIZIONARIO_SCONTI[targetShopId]
    } else if (targetShop?.discount) {
      const parsed = parseInt(String(targetShop.discount).replace('%', ''), 10)
      if (!isNaN(parsed)) percentualeSconto = parsed
    }

    // 3. Calcolo matematico del prezzo scontato
    const prezzoListino = parseFloat(prevendita.prezzo) || 0
    const scontoCalcolato = Number(((prezzoListino * percentualeSconto) / 100).toFixed(2))
    const prezzoScontato = Number(Math.max(0, prezzoListino - scontoCalcolato).toFixed(2))

    // 4. Inserimento nel Gate del negozio con prezzoScontato come prezzo effettivo
    const nuovoItemCarrello = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      id_negozio: targetShopId,
      nome_utente: prevendita.nome_utente || 'Passeggero',
      nome_gioco: prevendita.nome_gioco,
      url: prevendita.url || '',
      quantita: 1,
      prezzo: prezzoScontato, // Importo finale scontato conteggiato nel totale del Gate
      prezzo_listino_unitario: prezzoListino,
      prezzo_listino_totale: prezzoListino,
      risparmio: scontoCalcolato,
      is_offerta_sito: false,
      discount_badge: percentualeSconto > 0 ? `-${percentualeSconto}%` : null,
      metodo_pagamento: 'Contanti',
      created_at: new Date().toISOString(),
    }

    handleAddItem(nuovoItemCarrello)
  }

  // REQUISITO 4: Volo Notturno (Dark Mode) - Default iniziale TEMA CHIARO (GIORNO) al primo avvio
  const [isNightMode, setIsNightMode] = useState(() => {
    try {
      const saved = localStorage.getItem('justplay_night_mode') ?? localStorage.getItem('darkMode')
      if (saved !== null) {
        return saved === 'true'
      }
      // Default: Modalità Giorno (Light Mode) al primo avvio
      return false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('justplay_night_mode', String(isNightMode))
      localStorage.setItem('darkMode', String(isNightMode))
    } catch (e) {
      console.error('Errore salvataggio night_mode:', e)
    }

    if (isNightMode) {
      document.documentElement.classList.add('dark', 'night-mode')
    } else {
      document.documentElement.classList.remove('dark', 'night-mode')
    }
  }, [isNightMode])

  const handleToggleNightMode = () => {
    setIsNightMode((prev) => !prev)
  }

  // REQUISITO: Stato Modale "Registro di Volo" (Storico Ordini)
  const [isFlightHistoryOpen, setIsFlightHistoryOpen] = useState(false)
  // Stato Modale Globale Imbarco Nuovo Bagaglio / Prevendita (+)
  const [isNewLuggageOpen, setIsNewLuggageOpen] = useState(false)

  // Gestione centralizzata del cambio tab / navigazione
  // Chiude all'istante qualsiasi modale, drawer o scheda Gate aperta e scorre fluido in cima
  const closeAllModalsAndViews = () => {
    setIsNewLuggageOpen(false)
    setIsHangarOpen(false)
    setIsPassportOpen(false)
    setIsFlightHistoryOpen(false)
    setIsBriefingOpen(false)
    setOpenGateId(null)
  }

  const navigateToTab = (tab) => {
    closeAllModalsAndViews()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (tab === 'hangar') {
      setIsHangarOpen(true)
    } else if (tab === 'passport') {
      setIsPassportOpen(true)
    } else if (tab === 'newLuggage') {
      setIsNewLuggageOpen(true)
    } else if (tab === 'history') {
      setIsFlightHistoryOpen(true)
    } else if (tab === 'briefing') {
      setIsBriefingOpen(true)
    }
  }

  // Registro di Volo (Storico Ordini) persistente in LocalStorage
  const [flightHistory, setFlightHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('justplay_flight_history_v1')
      if (raw !== null) {
        return JSON.parse(raw)
      }
      return FLIGHT_HISTORY_DATA
    } catch {
      return FLIGHT_HISTORY_DATA
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('justplay_flight_history_v1', JSON.stringify(flightHistory))
    } catch (e) {
      console.error('Errore salvataggio flight_history:', e)
    }
  }, [flightHistory])

  // REQUISITO 1: Svuotamento Registro di Volo (Reset di Test) con conferma
  const handleClearHistory = async () => {
    const isConfirmed = window.confirm('Sei sicuro di voler svuotare completamente il Registro?')
    if (!isConfirmed) return

    setFlightHistory([])
    try {
      localStorage.setItem('justplay_flight_history_v1', JSON.stringify([]))
      localStorage.removeItem('justplay_flight_history_v1')
    } catch (e) {
      console.error('Errore reset flight_history:', e)
    }

    // Se esistono tabelle di registro/storico/decolli su Supabase, le pulisce
    try {
      for (const table of ['registro', 'storico', 'decolli', 'registro_voli', 'flight_history']) {
        try {
          await supabase.from(table).delete().neq('id', 0)
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Errore pulizia eventuale tabella Supabase registro:', e)
    }
  }

  const handleRemoveFlightFromHistory = (flightId) => {
    setFlightHistory((prev) => {
      const updated = prev.filter((f) => f.id !== flightId)
      try {
        localStorage.setItem('justplay_flight_history_v1', JSON.stringify(updated))
      } catch (e) {
        console.error('Errore salvataggio flight_history:', e)
      }
      return updated
    })
  }

  // REQUISITO 2: Numerazione progressiva dinamica per negozio: (ordini passati di quel negozio nel Registro) + 1
  const getNextOrderNumberForShop = (shopId) => {
    const pastOrdersCount = flightHistory.filter((flight) => {
      const flightShopId = flight.shop?.id || flight.shopId || flight.id_negozio
      return flightShopId === shopId
    }).length

    return `Ordine #${pastOrdersCount + 1}`
  }

  const handleSavePassengerName = (name) => {
    setSavedPassengerName(name)
    try {
      localStorage.setItem('justplay_user', name)
    } catch (e) {
      console.error('Errore salvataggio nome passeggero:', e)
    }
  }

  // PARTE 1: LA SCATOLA NERA (Prevenzione perdita dati / Undo)
  const [blackBoxData, setBlackBoxData] = useState(null)
  const blackBoxTimerRef = useRef(null)

  const handleUndoBlackBox = () => {
    if (blackBoxData && blackBoxData.previousCart) {
      setCartItems(blackBoxData.previousCart)
      setBlackBoxData(null)
      if (blackBoxTimerRef.current) {
        clearTimeout(blackBoxTimerRef.current)
        blackBoxTimerRef.current = null
      }
    }
  }

  const handleDismissBlackBox = () => {
    setBlackBoxData(null)
    if (blackBoxTimerRef.current) {
      clearTimeout(blackBoxTimerRef.current)
      blackBoxTimerRef.current = null
    }
  }

  // PARTE 2: Budget di Volo Mensile Personale per socio in Local Storage
  const [userMonthlyBudgets, setUserMonthlyBudgets] = useState(() => {
    try {
      const raw = localStorage.getItem('justplay_user_monthly_budgets')
      if (raw) return JSON.parse(raw)
      return {}
    } catch {
      return {}
    }
  })

  // REQUISITO: Budget di Volo salvato in Local Storage (retrocompatibile)
  const [flightBudget, setFlightBudget] = useState(() => {
    try {
      const saved = localStorage.getItem('justplay_flight_budget')
      if (saved !== null && saved !== '') {
        const parsed = parseFloat(saved)
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    } catch {
      return 0
    }
  })

  const handleSaveFlightBudget = (newBudget) => {
    const num = Math.max(0, parseFloat(newBudget) || 0)
    setFlightBudget(num)
    try {
      localStorage.setItem('justplay_flight_budget', String(num))
    } catch (e) {
      console.error('Errore salvataggio budget di volo:', e)
    }
  }

  const handleSavePassengerMonthlyBudget = (amount, monthKey, targetPassenger) => {
    const num = Math.max(0, parseFloat(amount) || 0)
    const cleanPassenger = (targetPassenger || savedPassengerName || 'Passeggero').trim()
    const rawMonth = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date())
    const currentMonthKey = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
    const finalMonthKey = monthKey || currentMonthKey

    setUserMonthlyBudgets((prev) => {
      const userMap = { ...(prev[cleanPassenger] || {}) }
      userMap[finalMonthKey] = num
      const updated = { ...prev, [cleanPassenger]: userMap }
      try {
        localStorage.setItem('justplay_user_monthly_budgets', JSON.stringify(updated))
      } catch (e) {
        console.error('Errore salvataggio budget mensile:', e)
      }
      return updated
    })

    if (finalMonthKey === currentMonthKey) {
      setFlightBudget(num)
      try {
        localStorage.setItem('justplay_flight_budget', String(num))
      } catch (e) {
        console.error('Errore salvataggio budget di volo:', e)
      }
    }
  }

  // 2. React State per i carrelli dei vari Gate (nessun database)

  // =========================================================================
  // SUPABASE: Sincronizzazione Iniziale gates, bagagli, hangar_prevendite, wishlist
  // =========================================================================
  useEffect(() => {
    let isMounted = true

    const syncWithSupabase = async () => {
      try {
        // Test di connettività / diagnostica con 'wishlist' ordinata per data_aggiunta
        const { data: testWishData, error: testWishError } = await supabase
          .from('wishlist')
          .select('*')
          .order('data_aggiunta', { ascending: true })

        if (testWishError) {
          console.error('Errore test connettività Supabase wishlist:', testWishError)
          if (isMounted) setDbStatus({ online: false, error: testWishError.message })
        } else {
          if (isMounted) {
            setDbStatus({ online: true, error: null })
            if (testWishData) setWishlist(testWishData)
          }
        }

        // 1. GATES: sincronizzazione o auto-seed
        let gatesList = []
        const { data: gatesData, error: gatesError } = await supabase
          .from('gates')
          .select('*')

        if (gatesError) {
          console.error('Errore Supabase gates select:', gatesError)
        } else if (gatesData && gatesData.length > 0) {
          // Filtra via Cranio Creations per sostituirlo con Weega
          gatesList = gatesData.filter((g) => {
            const n = (g.nome_store || '').toLowerCase()
            return !n.includes('cranio') && g.id !== 'cranio-creation'
          })

          // Assicura che Weega esista nella lista dei gates
          const weegaExists = gatesList.some((g) => (g.nome_store || '').toLowerCase() === 'weega' || g.id === 'weega')
          if (!weegaExists) {
            try {
              const { data: newWeegaGate } = await supabase
                .from('gates')
                .insert([{ nome_store: 'Weega', totale_imbarcato: 0, stato: 'in_attesa' }])
                .select()
              if (newWeegaGate && newWeegaGate[0]) {
                gatesList.push(newWeegaGate[0])
              }
            } catch (err) {
              console.error('Errore auto-creazione gate Weega:', err)
            }
          }
        } else {
          // Auto-seed gates se vuoto
          const seedPayload = SHOPS_DATA.map((s) => ({
            nome_store: s.name,
            totale_imbarcato: 0,
            stato: 'in_attesa',
          }))
          const { data: seededGates, error: seedError } = await supabase
            .from('gates')
            .insert(seedPayload)
            .select()

          if (seedError) {
            console.error('Errore Supabase auto-seed gates:', seedError)
          } else if (seededGates) {
            gatesList = seededGates
          }
        }

        // Mappa UUID per ciascun negozio (garantendo che lo sconto rimanga 0 o quello configurato)
        if (isMounted && gatesList.length > 0) {
          setShops((prevShops) =>
            prevShops
              .filter((shop) => shop.id !== 'cranio-creation' && !shop.name?.toLowerCase().includes('cranio'))
              .map((shop) => {
                const matchedGate = gatesList.find(
                  (g) =>
                    (g.nome_store || '').trim().toLowerCase() === (shop.name || '').trim().toLowerCase() ||
                    (g.nome_store || '').trim().toLowerCase() === (shop.id || '').trim().toLowerCase()
                )
                return matchedGate ? { ...shop, supabaseGateId: matchedGate.id } : shop
              })
          )
        }

        // 2. BAGAGLI: sincronizzazione articoli del carrello
        const { data: bagagliData, error: bagagliError } = await supabase
          .from('bagagli')
          .select('*')

        if (bagagliError) {
          console.error('Errore Supabase bagagli select:', bagagliError)
        } else if (bagagliData && isMounted) {
          const normalizedCart = bagagliData.map((b) => {
            // Trova negozio confrontando String(b.gate_id) === String(gate.id) o b.nome_store === gate.nome/name
            const matchedShop = SHOPS_DATA.find((s) => {
              const matchedByGateId = String(b.gate_id || '').toLowerCase() === String(s.id || '').toLowerCase()
              const matchedByName = (b.nome_store || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()
              const matchedGateUuid = gatesList.find((g) => g.id === b.gate_id)
              const matchedByUuidStore = matchedGateUuid && (
                (s.name || '').trim().toLowerCase() === (matchedGateUuid.nome_store || '').trim().toLowerCase() ||
                (s.id || '').trim().toLowerCase() === (matchedGateUuid.nome_store || '').trim().toLowerCase()
              )
              return matchedByGateId || matchedByName || matchedByUuidStore
            })

            const targetShopId = matchedShop ? matchedShop.id : (b.gate_id || 'playbazar')
            const prezzoFinale = parseFloat(b.prezzo_finale) || 0

            return {
              id: b.id,
              gate_id: b.gate_id,
              nome_store: b.nome_store || (matchedShop ? matchedShop.name : ''),
              id_negozio: targetShopId,
              nome_utente: b.nome_passeggero || 'Passeggero',
              nome_gioco: b.nome_gioco,
              url: b.url_negozio || '',
              quantita: b.quantita || 1,
              prezzo: prezzoFinale,
              prezzo_listino_unitario: prezzoFinale,
              prezzo_listino_totale: Number((prezzoFinale * (b.quantita || 1)).toFixed(2)),
              risparmio: 0,
              is_offerta_sito: false,
              discount_badge: null,
              metodo_pagamento: b.metodo_pagamento || 'Contanti',
              created_at: b.created_at || new Date().toISOString(),
            }
          })
          setCartItems(normalizedCart)
        }

        // 3. HANGAR PREVENDITE & RIPRISTINO PREVENDITE ANDREA NANNI
        const { data: hangarData, error: hangarError } = await supabase
          .from('hangar_prevendite')
          .select('*')

        if (hangarError) {
          console.error('Errore Supabase hangar_prevendite select:', hangarError)
        } else if (isMounted) {
          let currentHangar = hangarData || []

          // Verifica se mancano i 3 giochi di Andrea Nanni
          const hasNanniHangar = currentHangar.some(
            (h) => (h.nome_passeggero || '').toLowerCase().includes('andrea nanni')
          )

          if (!hasNanniHangar) {
            const nanniGames = [
              {
                nome_passeggero: 'Andrea Nanni',
                nome_gioco: 'Z Horde',
                url_negozio: 'https://www.playbazar.it/44144-z-horde.html',
                negozio_scelto: 'playbazar',
                prezzo_listino: 11.99,
              },
              {
                nome_passeggero: 'Andrea Nanni',
                nome_gioco: 'Unmatched - Lee VS Ali',
                url_negozio: 'https://www.playbazar.it/44273-unmatched-lee-vs-ali-carte-foil-incluse.html',
                negozio_scelto: 'playbazar',
                prezzo_listino: 25.59,
              },
              {
                nome_passeggero: 'Andrea Nanni',
                nome_gioco: 'Unmatched - Cobble & Fog',
                url_negozio: 'https://www.playbazar.it/25549-unmatched-cobble-fog.html',
                negozio_scelto: 'playbazar',
                prezzo_listino: 30.39,
              },
            ]

            try {
              const { data: insertedHangar } = await supabase
                .from('hangar_prevendite')
                .insert(nanniGames)
                .select()
              if (insertedHangar) {
                currentHangar = [...currentHangar, ...insertedHangar]
              }
              // Rimuove eventuali duplicati rimasti nei bagagli di Playbazar
              await supabase
                .from('bagagli')
                .delete()
                .ilike('nome_passeggero', '%andrea nanni%')
            } catch (errNanni) {
              console.error('Errore ripristino prevendite Andrea Nanni:', errNanni)
            }
          }

          const normalizedHangar = currentHangar.map((h) => ({
            id: h.id,
            nome_utente: h.nome_passeggero,
            nome_gioco: h.nome_gioco,
            url: h.url_negozio || '',
            id_negozio: h.negozio_scelto || 'playbazar',
            prezzo: parseFloat(h.prezzo_listino) || 0,
            created_at: h.data_inserimento || new Date().toISOString(),
          }))
          setPrevendite(normalizedHangar)
        }
      } catch (err) {
        console.error('Errore sincronizzazione Supabase:', err)
        if (isMounted) setDbStatus({ online: false, error: err.message || 'Errore di connessione' })
      }
    }

    syncWithSupabase()
    return () => {
      isMounted = false
    }
  }, [])

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('justplay_cart_v1') || localStorage.getItem('slothy_cart_items_v6')
      if (saved) return JSON.parse(saved)
      return []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('justplay_cart_v1', JSON.stringify(cartItems))
    } catch (e) {
      console.error('Errore salvataggio carrelli:', e)
    }
  }, [cartItems])

  // REQUISITO 2: Gate / Accordion aperto (null = tutti chiusi all'avvio)
  const [openGateId, setOpenGateId] = useState(null)

  // STATO NEGOZI (con ordineForzato per bypass della soglia)
  const [shops, setShops] = useState(() => SHOPS_DATA)

  const handleToggleGate = (shopId) => {
    setOpenGateId((prev) => (prev === shopId ? null : shopId))
  }

  // REQUISITO 1: Toggle Forza Ordine con filtro ordini specifici del Gate e calcolo partecipanti unici con Set
  const handleToggleForceOrder = (shopId) => {
    // 1. Filtra gli ordini correnti per isolare SOLO quelli appartenenti a questo specifico Gate
    const gateOrders = cartItems.filter(
      (item) => item.id_negozio === shopId || item.shopId === shopId
    )
    const currentShop = shops.find((s) => s.id === shopId)

    // CONDIZIONE DI BLOCCO: attivabile SOLO SE c'è almeno un ordine inserito
    if (!currentShop?.ordineForzato && gateOrders.length === 0) {
      return
    }

    // 2. Estrai gli utenti unici da questa lista (usando Set) per ottenere il numero esatto dei partecipanti reali
    const uniqueUsersSet = new Set()
    gateOrders.forEach((item) => {
      const name = (item.nome_utente || item.passenger || item.user || '').trim()
      if (name) {
        uniqueUsersSet.add(name.toLowerCase())
      }
    })
    const uniqueParticipantsCount = uniqueUsersSet.size

    setShops((prev) =>
      prev.map((s) => {
        if (s.id !== shopId) return s
        const nextForzato = !s.ordineForzato

        // Costo totale della spedizione
        const shippingOptions = s.shippingOptions && s.shippingOptions.length > 0
          ? s.shippingOptions
          : [{ id: 'standard', name: 'Standard', price: 4.90, isDefault: true }]
        const selectedOpt = shippingOptions.find((o) => o.id === s.selectedShippingId)
          || shippingOptions.find((o) => o.isDefault)
          || shippingOptions[0]
        const shippingCost = selectedOpt ? selectedOpt.price : 4.90

        // 3. Dividi il costo totale della spedizione per questo numero di partecipanti unici
        const quotaDivisa = uniqueParticipantsCount > 0
          ? Number((shippingCost / uniqueParticipantsCount).toFixed(2))
          : shippingCost

        return {
          ...s,
          ordineForzato: nextForzato,
          forcedParticipantsCount: uniqueParticipantsCount,
          forcedShippingPerParticipant: quotaDivisa,
          forcedShippingTotal: shippingCost,
        }
      })
    )
  }

  // Selezione opzione di spedizione (es. InPost vs Standard) e ricalcolo divisione spese
  const handleSelectShippingOption = (shopId, shippingOptionId) => {
    const gateOrders = cartItems.filter(
      (item) => item.id_negozio === shopId || item.shopId === shopId
    )
    const uniqueUsersSet = new Set()
    gateOrders.forEach((item) => {
      const name = (item.nome_utente || item.passenger || item.user || '').trim()
      if (name) uniqueUsersSet.add(name.toLowerCase())
    })
    const uniqueParticipantsCount = uniqueUsersSet.size

    setShops((prev) =>
      prev.map((s) => {
        if (s.id !== shopId) return s
        const shippingOptions = s.shippingOptions && s.shippingOptions.length > 0
          ? s.shippingOptions
          : [{ id: 'standard', name: 'Standard', price: 4.90, isDefault: true }]
        const selectedOpt = shippingOptions.find((o) => o.id === shippingOptionId) || shippingOptions[0]
        const shippingCost = selectedOpt ? selectedOpt.price : 4.90
        const quotaDivisa = uniqueParticipantsCount > 0
          ? Number((shippingCost / uniqueParticipantsCount).toFixed(2))
          : shippingCost

        return {
          ...s,
          selectedShippingId: shippingOptionId,
          forcedParticipantsCount: uniqueParticipantsCount,
          forcedShippingPerParticipant: quotaDivisa,
          forcedShippingTotal: shippingCost,
        }
      })
    )
  }

  // Helper per trovare/recuperare o creare il gate_id UUID su Supabase
  const getSupabaseGateId = async (shopId) => {
    const shop = shops.find((s) => s.id === shopId)
    if (shop?.supabaseGateId) return shop.supabaseGateId

    try {
      const shopName = shop?.name || shopId
      // Cerca nei gates esistenti
      const { data, error } = await supabase
        .from('gates')
        .select('id, nome_store')
        .ilike('nome_store', shopName)
        .limit(1)

      if (data && data[0]) {
        setShops((prev) =>
          prev.map((s) => (s.id === shopId ? { ...s, supabaseGateId: data[0].id } : s))
        )
        return data[0].id
      }

      // Se non esiste, inserisci
      const { data: newGate, error: insertErr } = await supabase
        .from('gates')
        .insert([{ nome_store: shopName, totale_imbarcato: 0, stato: 'in_attesa' }])
        .select()

      if (newGate && newGate[0]) {
        setShops((prev) =>
          prev.map((s) => (s.id === shopId ? { ...s, supabaseGateId: newGate[0].id } : s))
        )
        return newGate[0].id
      }
    } catch (e) {
      console.error('Errore getSupabaseGateId:', e)
    }
    return null
  }

  // Helper per aggiornare totale_imbarcato in gates
  const updateGateTotalInSupabase = async (gateUuid, newTotal) => {
    if (!gateUuid) return
    try {
      await supabase
        .from('gates')
        .update({ totale_imbarcato: Number(newTotal.toFixed(2)) })
        .eq('id', gateUuid)
    } catch (e) {
      console.error('Errore updateGateTotalInSupabase:', e)
    }
  }

  // Operazioni sui carrelli con INSERT reale su 'bagagli' Supabase (gate_id TEXT, nome_store TEXT)
  const handleAddItem = async (newItem) => {
    // Individua il Gate / Shop corrispondente
    const targetShop = shops.find((s) => s.id === newItem.id_negozio) || { id: newItem.id_negozio, name: newItem.id_negozio }

    const gateIdVal = String(targetShop.id || targetShop.name || newItem.id_negozio)
    const nomeStoreVal = String(targetShop.name || targetShop.store || targetShop.id || '')

    const prezzoFinaleNum = Number(String(newItem.prezzo).replace(',', '.')) || 0
    const quantitaNum = Number(newItem.quantita) || 1

    const nuovoBagaglio = {
      gate_id: gateIdVal,
      nome_store: nomeStoreVal,
      nome_passeggero: newItem.nome_utente || savedPassengerName || 'Passeggero',
      nome_gioco: newItem.nome_gioco,
      url_negozio: newItem.url || null,
      prezzo_finale: prezzoFinaleNum,
      quantita: quantitaNum,
      metodo_pagamento: newItem.metodo_pagamento || 'Contanti',
    }

    try {
      const { data, error } = await supabase
        .from('bagagli')
        .insert([nuovoBagaglio])
        .select()

      if (error) {
        alert("ERRORE SUPABASE IMBARCO: " + error.message)
        console.error("Errore Supabase imbarco:", error)
        return
      }

      if (data && data[0]) {
        const itemInserito = {
          ...newItem,
          id: data[0].id,
          gate_id: data[0].gate_id,
          nome_store: data[0].nome_store,
          prezzo: parseFloat(data[0].prezzo_finale) || prezzoFinaleNum,
          quantita: data[0].quantita || quantitaNum,
        }
        setCartItems((prev) => [...prev, itemInserito])

        // Aggiorna totale imbarcato in gates su Supabase
        const gateUuid = targetShop.supabaseGateId
        if (gateUuid) {
          const shopItems = [...cartItems.filter((it) => it.id_negozio === targetShop.id), itemInserito]
          const newGateTotal = shopItems.reduce((sum, it) => sum + (it.prezzo || 0), 0)
          updateGateTotalInSupabase(gateUuid, newGateTotal)
        }
      }
    } catch (e) {
      alert("ERRORE SUPABASE IMBARCO: " + (e.message || e))
      console.error('Errore chiamata bagagli Supabase:', e)
    }
  }

  // PARTE 1 - TRIGGER SCATOLA NERA: Eliminazione singolo gioco
  const handleRemoveItem = async (itemId) => {
    const itemToRemove = cartItems.find((it) => it.id === itemId)
    const previousCart = [...cartItems]

    setCartItems((prev) => prev.filter((it) => it.id !== itemId))

    // Cancella da Supabase bagagli
    if (itemId) {
      try {
        const { error } = await supabase.from('bagagli').delete().eq('id', itemId)
        if (error) {
          console.error('Errore Supabase bagagli delete:', error)
        }
        if (itemToRemove) {
          const gateUuid = itemToRemove.gate_id || (await getSupabaseGateId(itemToRemove.id_negozio))
          const remainingItems = previousCart.filter(
            (it) => it.id !== itemId && it.id_negozio === itemToRemove.id_negozio
          )
          const newGateTotal = remainingItems.reduce((sum, it) => sum + (it.prezzo || 0), 0)
          await updateGateTotalInSupabase(gateUuid, newGateTotal)
        }
      } catch (err) {
        console.error('Errore Supabase:', err)
      }
    }

    if (itemToRemove) {
      if (blackBoxTimerRef.current) clearTimeout(blackBoxTimerRef.current)
      setBlackBoxData({
        type: 'single',
        item: itemToRemove,
        previousCart,
        message: `${itemToRemove.nome_gioco || 'Gioco'} (${(itemToRemove.prezzo || 0).toFixed(2)} €)`,
      })
      blackBoxTimerRef.current = setTimeout(() => {
        setBlackBoxData(null)
      }, 5000)
    }
  }

  // PARTE 1 - TRIGGER SCATOLA NERA: Svuotamento intero Gate
  const handleClearGate = async (shopId, isArchiving = false) => {
    const itemsInGate = cartItems.filter((it) => it.id_negozio === shopId)
    if (itemsInGate.length === 0) return
    const previousCart = [...cartItems]

    setCartItems((prev) => prev.filter((it) => it.id_negozio !== shopId))

    // Cancella da Supabase bagagli per questo gate (tramite ID precisi dei bagagli e per gate_id)
    try {
      const itemIds = itemsInGate.map((it) => it.id).filter(Boolean)
      if (itemIds.length > 0) {
        const { error: delByIdsErr } = await supabase.from('bagagli').delete().in('id', itemIds)
        if (delByIdsErr) console.warn('Cancellazione bagagli per IDs fallita, provo con gate_id:', delByIdsErr)
      }

      const gateUuid = await getSupabaseGateId(shopId)
      if (gateUuid) {
        const { error } = await supabase.from('bagagli').delete().eq('gate_id', gateUuid)
        if (error) {
          console.error('Errore Supabase svuotamento bagagli gate:', error)
        }
        await updateGateTotalInSupabase(gateUuid, 0)
      }
    } catch (e) {
      console.error('Errore svuotamento gate Supabase:', e)
    }

    // Reset ordine forzato se presente
    setShops((prev) =>
      prev.map((s) => (s.id === shopId ? { ...s, ordineForzato: false } : s))
    )

    // Se l'operazione non deriva dal normale decollo/archiviazione, attiva la Scatola Nera
    if (!isArchiving) {
      const shop = SHOPS_DATA.find((s) => s.id === shopId)
      if (blackBoxTimerRef.current) clearTimeout(blackBoxTimerRef.current)
      setBlackBoxData({
        type: 'gate',
        shopId,
        previousCart,
        message: `Svuotato Gate ${shop ? shop.name : ''} (${itemsInGate.length} ${itemsInGate.length === 1 ? 'gioco' : 'giochi'})`,
      })
      blackBoxTimerRef.current = setTimeout(() => {
        setBlackBoxData(null)
      }, 5000)
    }
  }

  // 3. REQUISITO 4: Salvataggio Profilo nel Local Storage ('profilo_utente')
  // Array degli acquisti confermati: Mese corrente, Nome Gioco, Prezzo Pagato, Risparmio Ottenuto
  const [userPurchases, setUserPurchases] = useState(() => {
    try {
      const raw = localStorage.getItem('profilo_utente')
      if (raw) return JSON.parse(raw)
      return []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('profilo_utente', JSON.stringify(userPurchases))
    } catch (e) {
      console.error('Errore salvataggio profilo_utente:', e)
    }
  }, [userPurchases])

  // REQUISITO 4: Nel momento della condivisione, salva in Local Storage ('profilo_utente')
  // l'array degli acquisti di quel passeggero
  const handleShareStoreOrder = (shopId, storeItems) => {
    const cleanPassenger = savedPassengerName.trim().toLowerCase()
    const shop = SHOPS_DATA.find((s) => s.id === shopId)

    // Filtra gli acquisti del passeggero corrente
    let relevantItems = storeItems.filter(
      (it) => (it.nome_utente || '').trim().toLowerCase() === cleanPassenger
    )

    if (relevantItems.length === 0 && (!cleanPassenger || storeItems.length === 1)) {
      relevantItems = storeItems
    }

    const rawMonth = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date())
    const currentMonth = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)

    if (relevantItems.length > 0) {
      const newEntries = relevantItems.map((it) => {
        const listino = it.prezzo_listino_totale || (it.prezzo_listino_unitario ? it.prezzo_listino_unitario * (it.quantita || 1) : it.prezzo)
        const computedSavings = Math.max(0, listino - it.prezzo)
        const finalSavings = it.risparmio !== undefined ? it.risparmio : computedSavings

        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
          mese: currentMonth,
          nome_gioco: it.nome_gioco,
          prezzo: Number((it.prezzo || 0).toFixed(2)),
          risparmio: Number(finalSavings.toFixed(2)),
          quantita: it.quantita || 1,
          negozio: shop ? shop.name : shopId,
          id_negozio: shopId,
          nome_utente: (it.nome_utente || savedPassengerName).trim(),
          metodo_pagamento: it.metodo_pagamento || null,
          data: new Date().toISOString(),
        }
      })

      setUserPurchases((prev) => {
        const updated = [...prev, ...newEntries]
        try {
          localStorage.setItem('profilo_utente', JSON.stringify(updated))
        } catch (e) {
          console.error(e)
        }
        return updated
      })
    }
  }

  const handleResetPurchases = () => {
    setUserPurchases([])
    try {
      localStorage.setItem('profilo_utente', JSON.stringify([]))
    } catch (e) {
      console.error(e)
    }
  }

  // REQUISITO 3: Trigger di archiviazione immediata nel Registro di Volo al download del PDF/Foglio Ordine e reset del Gate
  const handleArchiveFlight = (shop, items, orderNumber, date) => {
    if (!items || items.length === 0) return

    const totalAmount = Number(
      items.reduce((sum, it) => sum + (it.prezzo || 0), 0).toFixed(2)
    )

    const newFlight = {
      id: `flight-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      orderNumber: orderNumber, // es. "Ordine #1"
      date: date || '17 Ottobre 2026',
      shop: {
        id: shop.id,
        name: shop.name,
        flightCode: shop.flightCode || 'JP',
        gate: shop.gate || 'Gate',
        freeShipping: shop.freeShipping,
        discount: shop.discount || null,
      },
      totalAmount: totalAmount,
      freeShippingUnlocked: true,
      items: items.map((it) => ({ ...it })),
    }

    setFlightHistory((prev) => {
      const updated = [newFlight, ...prev]
      try {
        localStorage.setItem('justplay_flight_history_v1', JSON.stringify(updated))
      } catch (e) {
        console.error('Errore salvataggio flight_history:', e)
      }
      return updated
    })

    // Registra acquisti nel profilo dell'utente (Passaporto Ludico)
    handleShareStoreOrder(shop.id, items)

    // Svuota immediatamente il carrello del Gate portandolo a 0€ (isArchiving = true, nessun toast di bagaglio smarrito)
    handleClearGate(shop.id, true)

    // Reset eventuale forzatura ordine per questo Gate
    setShops((prev) =>
      prev.map((s) => (s.id === shop.id ? { ...s, ordineForzato: false } : s))
    )
  }

  // REQUISITO 2: ORDINAMENTO DINAMICO DEI GATE (Le schede pronte salgono AUTOMATICAMENTE in cima)
  const sortedShops = useMemo(() => {
    return [...shops].sort((a, b) => {
      const itemsA = getShopEffectiveItems(a, cartItems.filter((it) => it.id_negozio === a.id))
      const totalA = itemsA.reduce((sum, it) => sum + (it.prezzo || 0), 0)
      const isDragonA = a.id === 'dragonstore' || a.name?.toLowerCase().includes('dragonstore')
      const rawProductsA = isDragonA
        ? cartItems.filter((it) => it.id_negozio === a.id).reduce((sum, it) => sum + (it.prezzo_listino_totale || it.prezzo || 0), 0)
        : totalA
      const thresholdA = a.freeShipping || 49
      const isReachedA = isDragonA
        ? (((rawProductsA >= 300 || totalA >= 300) && (rawProductsA > 0 || totalA > 0)) || a.ordineForzato)
        : ((totalA >= thresholdA && thresholdA > 0) || a.ordineForzato)

      const itemsB = getShopEffectiveItems(b, cartItems.filter((it) => it.id_negozio === b.id))
      const totalB = itemsB.reduce((sum, it) => sum + (it.prezzo || 0), 0)
      const isDragonB = b.id === 'dragonstore' || b.name?.toLowerCase().includes('dragonstore')
      const rawProductsB = isDragonB
        ? cartItems.filter((it) => it.id_negozio === b.id).reduce((sum, it) => sum + (it.prezzo_listino_totale || it.prezzo || 0), 0)
        : totalB
      const thresholdB = b.freeShipping || 49
      const isReachedB = isDragonB
        ? (((rawProductsB >= 300 || totalB >= 300) && (rawProductsB > 0 || totalB > 0)) || b.ordineForzato)
        : ((totalB >= thresholdB && thresholdB > 0) || b.ordineForzato)

      // 1. Quelli con decollo autorizzato o forzato (BLU AVIAZIONE) vanno per primi in cima
      if (isReachedA && !isReachedB) return -1
      if (!isReachedA && isReachedB) return 1

      // 2. Tra quelli pronti, ordina per importo decrescente
      if (isReachedA && isReachedB) return totalB - totalA

      // 3. Tra quelli in corso, dai precedenza a quelli con giochi già imbarcati
      if (totalA > 0 && totalB === 0) return -1
      if (totalA === 0 && totalB > 0) return 1

      return 0
    })
  }, [shops, cartItems])

  const readyGatesCount = useMemo(() => {
    return sortedShops.filter((shop) => {
      const isDragon = shop.id === 'dragonstore' || shop.name?.toLowerCase().includes('dragonstore')
      const storeItems = getShopEffectiveItems(shop, cartItems.filter((it) => it.id_negozio === shop.id))
      const storeTotal = storeItems.reduce((sum, it) => sum + (it.prezzo || 0), 0)
      const rawProducts = isDragon
        ? cartItems.filter((it) => it.id_negozio === shop.id).reduce((sum, it) => sum + (it.prezzo_listino_totale || it.prezzo || 0), 0)
        : storeTotal
      const isReady = isDragon
        ? (((rawProducts >= 300 || storeTotal >= 300) && (rawProducts > 0 || storeTotal > 0)) || shop.ordineForzato)
        : ((storeTotal >= (shop.freeShipping || 49) && storeTotal > 0) || shop.ordineForzato)

      return isReady
    }).length
  }, [sortedShops, cartItems])

  // Totali imbarcati calcolati per l'intero gruppo
  const totalCartAmount = useMemo(() => {
    return shops.reduce((sum, shop) => {
      const storeItems = getShopEffectiveItems(shop, cartItems.filter((it) => it.id_negozio === shop.id))
      return sum + storeItems.reduce((s, it) => s + (it.prezzo || 0), 0)
    }, 0)
  }, [shops, cartItems])

  const totalGamesCount = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + (it.quantita || 1), 0)
  }, [cartItems])

  // PARTE 2: CALCOLO DELLA SPESA PERSONALE DEL SINGOLO SOCIO LOGGATO
  // (Somma i suoi giochi nei Gate aperti + i suoi giochi nei voli chiusi/archiviati in questo mese)
  const currentMonthName = useMemo(() => {
    const raw = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date())
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [])

  // 1. Spesa del socio nei carrelli dei Gate ancora aperti
  const passengerActiveSpent = useMemo(() => {
    const cleanPassenger = (savedPassengerName || '').trim().toLowerCase()
    if (!cleanPassenger) return 0

    let total = 0
    shops.forEach((shop) => {
      const storeItems = cartItems.filter((it) => it.id_negozio === shop.id)
      const effectiveItems = getShopEffectiveItems(shop, storeItems)
      effectiveItems.forEach((it) => {
        if ((it.nome_utente || '').trim().toLowerCase() === cleanPassenger) {
          total += Number(it.prezzo || 0)
        }
      })
    })
    return Number(total.toFixed(2))
  }, [shops, cartItems, savedPassengerName])

  // 2. Spesa del socio nei voli chiusi/archiviati in questo mese (da userPurchases e flightHistory)
  const passengerClosedSpentCurrentMonth = useMemo(() => {
    const cleanPassenger = (savedPassengerName || '').trim().toLowerCase()
    if (!cleanPassenger) return 0

    const seenItemKeys = new Set()
    let closedTotal = 0

    userPurchases.forEach((p) => {
      const pUser = (p.nome_utente || savedPassengerName || '').trim().toLowerCase()
      const pMonth = p.mese || currentMonthName
      if (pUser === cleanPassenger && pMonth === currentMonthName) {
        const key = `${p.nome_gioco}_${p.negozio}_${p.prezzo}`
        seenItemKeys.add(key)
        closedTotal += Number(p.prezzo || 0)
      }
    })

    flightHistory.forEach((flight) => {
      const flightDate = flight.date || ''
      const match = flightDate.match(/([A-Za-zàèéìòù]+)\s+(\d{4})/)
      let flightMonth = ''
      if (match) {
        flightMonth = `${match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()} ${match[2]}`
      }
      if (flightMonth === currentMonthName || !flightMonth) {
        (flight.items || []).forEach((it) => {
          const itUser = (it.nome_utente || '').trim().toLowerCase()
          if (itUser === cleanPassenger) {
            const key = `${it.nome_gioco}_${flight.shop?.name || ''}_${it.prezzo}`
            if (!seenItemKeys.has(key)) {
              seenItemKeys.add(key)
              closedTotal += Number(it.prezzo || 0)
            }
          }
        })
      }
    })

    return Number(closedTotal.toFixed(2))
  }, [userPurchases, flightHistory, savedPassengerName, currentMonthName])

  // 3. Totale Spesa Personale Mensile Effettiva del socio
  const passengerCurrentMonthTotalSpent = useMemo(() => {
    return Number((passengerActiveSpent + passengerClosedSpentCurrentMonth).toFixed(2))
  }, [passengerActiveSpent, passengerClosedSpentCurrentMonth])

  // 4. Budget Personale Mensile per il socio loggato (con fallback a flightBudget)
  const currentPassengerBudget = useMemo(() => {
    const cleanPassenger = (savedPassengerName || '').trim()
    const userMap = userMonthlyBudgets[cleanPassenger] || {}
    if (userMap[currentMonthName] !== undefined) {
      return userMap[currentMonthName]
    }
    return flightBudget || 0
  }, [userMonthlyBudgets, savedPassengerName, currentMonthName, flightBudget])

  // REQUISITO: Se non c'è il passeggero loggato, renderizza ESCLUSIVAMENTE CheckInScreen
  if (!passeggero) {
    return <CheckInScreen onLogin={handleLoginCheckIn} isNightMode={isNightMode} />
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300 w-full max-w-full flex flex-col antialiased font-sans relative overflow-x-hidden box-border"
    >
      {/* Sfondo con Bagliori di Colore Sfocati (Glow Orbs) per esaltare il Glassmorphism sia chiaro che scuro */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden -z-10" aria-hidden="true">
        {/* Glow Orb 1 - Ciano / Sky */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-200/50 dark:bg-cyan-600/20 blur-3xl" />
        {/* Glow Orb 2 - Indaco / Viola */}
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-indigo-200/40 dark:bg-indigo-600/15 blur-3xl" />
        {/* Glow Orb 3 - Ambra / Arancio */}
        <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-blue-200/40 dark:bg-blue-600/15 blur-3xl" />
        {/* Griglia texture sottile per profondità */}
        <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025] dark:opacity-[0.03]" />
      </div>

      {/* REQUISITO 1: Header Fisso/Fixed in alto (position: fixed; z-index: 1000) con zero stacco di colore */}
      <AirportHeader
        totalGamesCount={totalGamesCount}
        totalCartAmount={totalCartAmount}
        savedPassengerName={savedPassengerName}
        onOpenPassport={() => navigateToTab('passport')}
        onOpenHistory={() => navigateToTab('history')}
        onOpenHangar={() => navigateToTab('hangar')}
        hangarCount={prevendite.length}
        readyGatesCount={readyGatesCount}
        flightBudget={currentPassengerBudget}
        passengerPersonalSpent={passengerCurrentMonthTotalSpent}
        isNightMode={isNightMode}
        onToggleNightMode={handleToggleNightMode}
        dbStatus={dbStatus}
      />

      {/* Contenitore Principale Terminal con padding-top compatto su mobile (pt-[68px]) e desktop (md:pt-[140px]), e pb-[110px] per la Bottom Bar Liquid Glass */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-[110px] sm:pb-[120px] pt-[68px] md:pt-[140px] flex-1 flex flex-col box-border">
        {/* REQUISITO: Modale Globale Imbarco Nuovo Bagaglio / Prevendita (+) */}
        <NewLuggageModal
          isOpen={isNewLuggageOpen}
          onClose={() => setIsNewLuggageOpen(false)}
          shops={shops}
          initialShopId={openGateId}
          savedPassengerName={savedPassengerName}
          onAddItem={handleAddItem}
          onAddPrevendita={handleAddPrevendita}
          isNightMode={isNightMode}
        />

        {/* REQUISITO: Modale Hangar Prevendite */}
        <HangarPrevenditeModal
          isOpen={isHangarOpen}
          onClose={() => setIsHangarOpen(false)}
          prevendite={prevendite}
          onAddPrevendita={handleAddPrevendita}
          onRemovePrevendita={handleRemovePrevendita}
          onUpdatePrevendita={handleUpdatePrevendita}
          onSpostaNelGate={handleSpostaNelGate}
          shops={shops}
          savedPassengerName={savedPassengerName}
          isNightMode={isNightMode}
        />

        {/* REQUISITO: Modal Registro di Volo (Storico Ordini Passati) */}
        <FlightHistoryModal
          isOpen={isFlightHistoryOpen}
          onClose={() => setIsFlightHistoryOpen(false)}
          flights={flightHistory}
          onRemoveFlight={handleRemoveFlightFromHistory}
          onClearHistory={handleClearHistory}
          savedPassengerName={savedPassengerName}
          isNightMode={isNightMode}
        />

        {/* PARTE 2: Modal Passaporto Ludico trasformato in "Lounge Passeggero" Personale */}
        <PassportModal
          isOpen={isPassportOpen}
          onClose={() => setIsPassportOpen(false)}
          savedPassengerName={savedPassengerName}
          onSavePassengerName={handleSavePassengerName}
          userPurchases={userPurchases}
          onResetPurchases={handleResetPurchases}
          cartItems={cartItems}
          onRemoveItem={handleRemoveItem}
          totalCartAmount={totalCartAmount}
          flightBudget={currentPassengerBudget}
          onSaveFlightBudget={handleSaveFlightBudget}
          userMonthlyBudgets={userMonthlyBudgets}
          onSavePassengerMonthlyBudget={handleSavePassengerMonthlyBudget}
          flightHistory={flightHistory}
          shops={shops}
          isNightMode={isNightMode}
          wishlist={wishlist}
          onAddWish={handleAddWish}
          onRemoveWish={handleRemoveWish}
        />

        {/* BRIEFING DI SICUREZZA: Onboarding Tour guidato a 4 tappe */}
        <SecurityBriefingTour
          isOpen={isBriefingOpen}
          onStepChange={handleBriefingStepChange}
          onFinish={handleFinishBriefing}
          onSkip={handleSkipBriefing}
          isNightMode={isNightMode}
        />

        {/* Separatore di Sezione: Tabellone Gate di Partenza */}
        <div className="flex items-center gap-2 my-3 px-1">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            isNightMode ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-blue-600'
          }`} />
          <h2 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
            isNightMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            Gate d'Imbarco ({shops.length} Voli)
          </h2>
        </div>

        {/* REQUISITO: Griglia Gate ispirata al design di BoardRules IT! */}
        <Gates
          shops={sortedShops}
          cartItems={cartItems}
          openGateId={openGateId}
          onToggleGate={handleToggleGate}
          savedPassengerName={savedPassengerName}
          onSavePassengerName={handleSavePassengerName}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearGate}
          onShareStore={handleShareStoreOrder}
          onToggleForceOrder={handleToggleForceOrder}
          onSelectShippingOption={handleSelectShippingOption}
          onGetNextOrderNumber={getNextOrderNumberForShop}
          onArchiveFlight={handleArchiveFlight}
          isNightMode={isNightMode}
        />
      </main>

      {/* PARTE 1: LA SCATOLA NERA (Toast dark bottom con 5s countdown e pulsante RECUPERA) */}
      <BlackBoxToast
        data={blackBoxData}
        onUndo={handleUndoBlackBox}
        onDismiss={handleDismissBlackBox}
        duration={5000}
        isNightMode={isNightMode}
      />

      {/* REQUISITO: Floating Bottom Bar (iOS Liquid Glass Dock Bar) e FAB "Aggiungi al Gate" */}
      <FloatingBottomBar
        hangarCount={prevendite.length}
        onOpenGates={() => navigateToTab('gates')}
        onOpenHangar={() => navigateToTab('hangar')}
        onOpenPassport={() => navigateToTab('passport')}
        onOpenNewLuggage={() => navigateToTab('newLuggage')}
        onOpenHistory={() => navigateToTab('history')}
        onOpenManuals={() => navigateToTab('briefing')}
        isNightMode={isNightMode}
      />

      <Footer isNightMode={isNightMode} />
    </div>
  )
}

export default App
