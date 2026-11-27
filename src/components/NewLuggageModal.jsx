import React, { useState, useEffect } from 'react'
import { X, Plane, Sparkles, AlertCircle, Check, Package, ChevronDown } from 'lucide-react'
import { calculateItemPriceWithQuantity, parsePriceInputWithList } from '../utils/pricing.js'

// Metodi di pagamento: SOLO Contanti e PayPal
const PAYMENT_OPTIONS = [
  { id: 'Contanti', label: 'Contanti', emoji: '💵', activeColor: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/30' },
  { id: 'PayPal', label: 'PayPal', emoji: '🅿️', activeColor: 'bg-blue-600 text-white border-blue-700 shadow-blue-500/30' },
]

export function NewLuggageModal({
  isOpen,
  onClose,
  shops = [],
  initialShopId = null,
  savedPassengerName = '',
  onAddItem,
  onAddPrevendita,
  isNightMode = false,
}) {
  const activeGateShops = shops.filter((s) => s.id !== 'playbazar' && s.name?.toLowerCase() !== 'playbazar')
  const selectableShops = isPreorder ? shops : activeGateShops

  const defaultActiveShopId = activeGateShops[0]?.id || shops[0]?.id || 'ls-giochi'
  const [selectedShopId, setSelectedShopId] = useState(
    initialShopId && initialShopId !== 'playbazar' ? initialShopId : defaultActiveShopId
  )
  const [passengerName, setPassengerName] = useState(savedPassengerName || '')
  const [gameName, setGameName] = useState('')
  const [gameUrl, setGameUrl] = useState('')
  const [rawPriceInput, setRawPriceInput] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('Contanti')
  const [isAlreadyOnSale, setIsAlreadyOnSale] = useState(false)
  const [isPreorder, setIsPreorder] = useState(false)
  const [preorderReleaseDate, setPreorderReleaseDate] = useState('')
  const [formError, setFormError] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  // Quando si apre, aggiorna lo shop selezionato e il passeggero se presenti
  useEffect(() => {
    if (isOpen) {
      if (initialShopId && initialShopId !== 'playbazar') setSelectedShopId(initialShopId)
      else if (!selectedShopId || (!isPreorder && selectedShopId === 'playbazar')) {
        setSelectedShopId(defaultActiveShopId)
      }
      if (savedPassengerName && !passengerName) setPassengerName(savedPassengerName)
      setFormError('')
      setJustAdded(false)
    }
  }, [isOpen, initialShopId, savedPassengerName])

  // Sicurezza: se l'utente toglie la spunta Hangar mentre è selezionato Playbazar, reimposta sul primo Gate attivo
  useEffect(() => {
    if (!isPreorder && selectedShopId === 'playbazar') {
      setSelectedShopId(defaultActiveShopId)
    }
  }, [isPreorder, selectedShopId, defaultActiveShopId])

  // Blocco scroll body quando aperta
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev || ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const selectedShop = selectableShops.find((s) => s.id === selectedShopId) || selectableShops[0] || {}
  const isDragonstore = selectedShop?.id === 'dragonstore' || selectedShop?.name?.toLowerCase().includes('dragonstore')

  // Parsing del prezzo di listino inserito: legge RIGOROSAMENTE e SOLTANTO il valore del campo input rawPriceInput
  const parsedPriceData = parsePriceInputWithList(rawPriceInput)
  const parsedPrice = parsedPriceData.salePrice || 0
  const parsedListPrice = parsedPriceData.listPrice || parsedPrice

  // Anteprima calcolo prezzo
  const previewInfo = parsedPrice > 0
    ? parsedPriceData.hasExplicitList
      ? {
          finalPrice: Number((parsedPrice * quantity).toFixed(2)),
          savings: Number(((parsedListPrice - parsedPrice) * quantity).toFixed(2)),
          discountBadge: `-${Math.round(((parsedListPrice - parsedPrice) / parsedListPrice) * 100)}%`,
          isExplicit: true,
          listPriceTot: Number((parsedListPrice * quantity).toFixed(2)),
        }
      : calculateItemPriceWithQuantity(parsedPrice, selectedShop.discount, quantity, isAlreadyOnSale)
    : null

  const handleSubmit = (e) => {
    e.preventDefault()

    const cleanUser = passengerName.trim()
    const cleanGame = gameName.trim()

    if (!cleanUser) {
      setFormError('Inserisci il nome del passeggero/socio.')
      return
    }
    if (!cleanGame) {
      setFormError('Inserisci il nome del gioco.')
      return
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Inserisci un prezzo valido (es. 29.99 o 80 barrato 60).')
      return
    }

    setFormError('')

    // Se opzione "Metti in Hangar Prevendite" è attiva
    if (isPreorder && onAddPrevendita) {
      onAddPrevendita({
        nome_utente: cleanUser,
        nome_passeggero: cleanUser,
        nome_gioco: cleanGame,
        url: gameUrl.trim(),
        url_negozio: gameUrl.trim(),
        id_negozio: selectedShop.id,
        negozio_scelto: selectedShop.id,
        prezzo: parsedPrice,
        prezzo_listino: parsedListPrice,
        prezzo_vendita: parsedPrice,
        data_uscita: preorderReleaseDate || new Date().toISOString().split('T')[0],
      })
      setJustAdded(true)
      setTimeout(() => {
        setJustAdded(false)
        onClose()
      }, 700)
      return
    }

    // Altrimenti imbarco normale nel Gate
    let finalItemPrice = 0
    let listPriceUnit = parsedListPrice
    let listPriceTot = Number((parsedListPrice * quantity).toFixed(2))
    let savings = 0
    let discountBadge = null
    let isSaleSite = isAlreadyOnSale

    if (parsedPriceData.hasExplicitList) {
      // Se l'utente ha inserito esplicitamente sia listino che vendita (es. "80 barrato 60")
      finalItemPrice = Number((parsedPrice * quantity).toFixed(2))
      savings = Number(((parsedListPrice - parsedPrice) * quantity).toFixed(2))
      discountBadge = `-${Math.round(((parsedListPrice - parsedPrice) / parsedListPrice) * 100)}%`
      isSaleSite = true
    } else {
      const effectiveDiscount = isDragonstore ? null : selectedShop.discount
      const pricing = calculateItemPriceWithQuantity(parsedPrice, effectiveDiscount, quantity, isAlreadyOnSale)
      finalItemPrice = isDragonstore ? Number((parsedPrice * quantity).toFixed(2)) : pricing.finalPrice
      savings = isDragonstore ? 0 : pricing.savings || 0
      discountBadge = isDragonstore ? (isAlreadyOnSale ? 'Offerta' : null) : pricing.discountBadge
      isSaleSite = isAlreadyOnSale
    }

    if (onAddItem) {
      onAddItem({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        id_negozio: selectedShop.id,
        nome_store: selectedShop.name,
        gate_id: selectedShop.id,
        nome_utente: cleanUser,
        nome_gioco: cleanGame,
        url: gameUrl.trim(),
        quantita: quantity,
        prezzo: finalItemPrice,
        prezzo_listino_unitario: listPriceUnit,
        prezzo_listino_totale: listPriceTot,
        risparmio: savings,
        is_offerta_sito: isSaleSite,
        discount_badge: discountBadge,
        metodo_pagamento: paymentMethod,
        created_at: new Date().toISOString(),
      })
    }

    setJustAdded(true)
    setTimeout(() => {
      setJustAdded(false)
      // Reset campi
      setGameName('')
      setGameUrl('')
      setRawPriceInput('')
      setQuantity(1)
      setIsAlreadyOnSale(false)
      setIsPreorder(false)
      onClose()
    }, 600)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      className="animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
        }}
        className={`fixed inset-0 sm:relative sm:inset-auto w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-lg overflow-y-auto flex flex-col animate-slide-up rounded-none sm:rounded-3xl border-0 sm:border shadow-2xl transition-all ${
          isNightMode
            ? 'bg-[#18181b] text-white border-white/10 shadow-black/90'
            : 'bg-white text-slate-900 border-slate-200 shadow-slate-900/30'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            HEADER STICKY LIQUID GLASS IN ALTO (Tasto Chiudi "✕", min 44x44px)
           ========================================================================= */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: isNightMode ? 'rgba(24, 24, 27, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/10 shrink-0 gap-2"
        >
          {/* Titolo centrato: "Aggiungi al Gate" */}
          <div className="flex items-center gap-1.5 font-bold text-base tracking-tight truncate">
            <span>✈️</span>
            <span className="truncate">Aggiungi al Gate</span>
          </div>

          {/* Tasto Chiudi '✕' a destra (Target tocco min 44x44px) */}
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.1] dark:hover:bg-white/20 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            aria-label="Chiudi modale"
            title="Chiudi"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* CORPO DEL FORM CON PADDING CONFORTEVOLE */}
        <div className="p-4 sm:p-6 pb-28 sm:pb-8 flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* PASSO 2.3: MENU A TENDINA (<select>) AL POSTO DEI BOTTONI NEGOZIO */}
            <div>
              <label htmlFor="modal-store-select" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Seleziona Gate / Store
              </label>
              <div className="relative">
                <select
                  id="modal-store-select"
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className={`w-full py-2.5 pl-3 pr-10 rounded-xl border text-sm font-bold appearance-none transition-all outline-hidden cursor-pointer ${
                    isNightMode
                      ? 'bg-zinc-900 border-white/20 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-800 focus:border-blue-600 shadow-2xs'
                  }`}
                >
                  {selectableShops.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-900 bg-white dark:text-white dark:bg-zinc-900">
                      {s.name} {s.discount ? `(${s.discount})` : ''}
                    </option>
                  ))}
                </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* NOME PASSEGGERO & NOME GIOCO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Socio / Passeggero <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Nome socio"
                className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors outline-hidden ${
                  isNightMode
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Nome Gioco <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="es. Scythe, Dune..."
                className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors outline-hidden ${
                  isNightMode
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
                required
              />
            </div>
          </div>

          {/* PREZZO DI LISTINO & QUANTITÀ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Prezzo Listino (€) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={rawPriceInput}
                onChange={(e) => setRawPriceInput(e.target.value)}
                placeholder="es. 49.90"
                className={`w-full px-3 py-2 rounded-xl border text-sm font-bold font-mono-code transition-colors outline-hidden ${
                  isNightMode
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Quantità
              </label>
              <div className="relative">
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  className={`w-full py-2 pl-3 pr-8 rounded-xl border text-sm font-bold font-mono-code transition-colors outline-hidden appearance-none cursor-pointer ${
                    isNightMode
                      ? 'bg-zinc-900 border-white/10 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n} className="text-slate-900 bg-white dark:text-white dark:bg-zinc-900">
                      {n}x
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* LINK OPZIONALE */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
              Link del gioco / Note (opzionale)
            </label>
            <input
              type="url"
              value={gameUrl}
              onChange={(e) => setGameUrl(e.target.value)}
              placeholder="https://..."
              className={`w-full px-3 py-2 rounded-xl border text-sm transition-colors outline-hidden ${
                isNightMode
                  ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            />
          </div>

          {/* PASSO 2.4: METODO DI PAGAMENTO (SOLO Contanti e PayPal) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Metodo di Pagamento
            </label>
            <div className="flex gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = paymentMethod === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${opt.activeColor} shadow-md ring-2 ring-blue-500/30`
                        : isNightMode
                        ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* CHECKBOX "GIÀ IN OFFERTA" & "PREORDINE IN HANGAR" */}
          <div className="space-y-2 pt-1">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none ${
              isNightMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={isAlreadyOnSale}
                onChange={(e) => setIsAlreadyOnSale(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Già in offerta? <span className="text-[11px] text-slate-500 dark:text-slate-400">(Nessun ulteriore sconto convenzione)</span>
              </span>
            </label>

            <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none ${
              isPreorder
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : isNightMode
                ? 'bg-white/5 border-white/10'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={isPreorder}
                onChange={(e) => setIsPreorder(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                📦 Metti in Hangar Prevendite <span className="text-[11px] text-slate-500 dark:text-slate-400">(Preordine in attesa)</span>
              </span>
            </label>

            {/* CAMPO DATA DI USCITA (SPUNTA FUORI SOLO SE PREORDINE SELEZIONATO) */}
            {isPreorder && (
              <div className={`p-3 rounded-2xl border space-y-1.5 animate-slide-up ${
                isNightMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/70 border-amber-200'
              }`}>
                <label className="block text-xs font-bold text-amber-800 dark:text-amber-300">
                  📅 Data stimata di uscita
                </label>
                <input
                  type="date"
                  value={preorderReleaseDate}
                  onChange={(e) => setPreorderReleaseDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                    isNightMode
                      ? 'bg-slate-900 border-amber-500/30 text-white'
                      : 'bg-white border-amber-300 text-slate-900'
                  }`}
                />
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  Potrai aggiornare la data o cambiare store direttamente nell'Hangar in qualsiasi momento.
                </span>
              </div>
            )}
          </div>

          {/* ANTEPRIMA PREZZO IN TEMPO REALE */}
          {previewInfo && !isPreorder && (
            <div className={`p-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs ${
              isNightMode ? 'bg-blue-950/30 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                {previewInfo.isExplicit ? (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 line-through">Listino: {previewInfo.listPriceTot.toFixed(2)}€</span>
                    <span>→ Prezzo Vendita: <strong className="font-mono-code text-sm font-bold text-emerald-600 dark:text-emerald-400">{previewInfo.finalPrice.toFixed(2)}€</strong></span>
                  </span>
                ) : (
                  <span>Prezzo Netto Stimato: <strong className="font-mono-code text-sm font-bold">{previewInfo.finalPrice.toFixed(2)}€</strong></span>
                )}
                {previewInfo.discountBadge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white">
                    {previewInfo.discountBadge}
                  </span>
                )}
              </div>
              {previewInfo.savings > 0 && (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Risparmio: +{previewInfo.savings.toFixed(2)}€
                </span>
              )}
            </div>
          )}

          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* PASSO 2.5: PULSANTE "✈️ Imbarca al Gate" BEN VISIBILE IN FONDO CON MARGINI ESPLICITI */}
          <div style={{ marginTop: '16px', marginBottom: '24px', width: '100%' }}>
            <button
              type="submit"
              style={{ width: '100%', padding: '14px' }}
              className={`rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                justAdded
                  ? 'bg-emerald-600 shadow-emerald-500/30'
                  : isPreorder
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isPreorder ? 'Aggiunto in Hangar! 📦' : 'Imbarcato con successo! ✈️'}</span>
                </>
              ) : isPreorder ? (
                <>
                  <Package className="w-5 h-5" />
                  <span>Salva in Hangar Prevendite</span>
                </>
              ) : (
                <>
                  <Plane className="w-5 h-5" />
                  <span>Imbarca al Gate</span>
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}

export default NewLuggageModal
