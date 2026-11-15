import React, { useState, useEffect } from 'react'
import { X, Plane, Sparkles, AlertCircle, Check, Package, Store } from 'lucide-react'
import { calculateItemPriceWithQuantity } from '../utils/pricing.js'

const PAYMENT_OPTIONS = [
  { id: 'Contanti', label: 'Contanti', emoji: '💵', activeColor: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/30' },
  { id: 'PayPal', label: 'PayPal', emoji: '🅿️', activeColor: 'bg-blue-600 text-white border-blue-700 shadow-blue-500/30' },
  { id: 'Bonifico', label: 'Bonifico', emoji: '🏦', activeColor: 'bg-purple-600 text-white border-purple-700 shadow-purple-500/30' },
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
  const [selectedShopId, setSelectedShopId] = useState(initialShopId || shops[0]?.id || 'ls-giochi')
  const [passengerName, setPassengerName] = useState(savedPassengerName || '')
  const [gameName, setGameName] = useState('')
  const [gameUrl, setGameUrl] = useState('')
  const [rawPriceInput, setRawPriceInput] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('Contanti')
  const [isAlreadyOnSale, setIsAlreadyOnSale] = useState(false)
  const [isPreorder, setIsPreorder] = useState(false)
  const [formError, setFormError] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  // Quando si apre, aggiorna lo shop selezionato e il passeggero se presenti
  useEffect(() => {
    if (isOpen) {
      if (initialShopId) setSelectedShopId(initialShopId)
      else if (!selectedShopId && shops[0]) setSelectedShopId(shops[0].id)
      if (savedPassengerName && !passengerName) setPassengerName(savedPassengerName)
      setFormError('')
      setJustAdded(false)
    }
  }, [isOpen, initialShopId, savedPassengerName])

  // Blocco scroll body
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

  const selectedShop = shops.find((s) => s.id === selectedShopId) || shops[0] || {}
  const isDragonstore = selectedShop?.id === 'dragonstore' || selectedShop?.name?.toLowerCase().includes('dragonstore')

  // Anteprima calcolo prezzo
  const parsedPrice = parseFloat(String(rawPriceInput).replace(',', '.')) || 0
  const previewInfo = parsedPrice > 0
    ? calculateItemPriceWithQuantity(parsedPrice, selectedShop.discount, quantity, isAlreadyOnSale)
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
      setFormError('Inserisci un prezzo valido (es. 29.99).')
      return
    }

    setFormError('')

    // Se opzione "Metti in Hangar Prevendite" è attiva
    if (isPreorder && onAddPrevendita) {
      onAddPrevendita({
        nome_passeggero: cleanUser,
        nome_gioco: cleanGame,
        url_negozio: gameUrl.trim(),
        negozio_scelto: selectedShop.id,
        prezzo_listino: parsedPrice,
      })
      setJustAdded(true)
      setTimeout(() => {
        setJustAdded(false)
        onClose()
      }, 900)
      return
    }

    // Altrimenti imbarco normale nel Gate
    const effectiveDiscount = isDragonstore ? null : selectedShop.discount
    const pricing = calculateItemPriceWithQuantity(parsedPrice, effectiveDiscount, quantity, isAlreadyOnSale)

    const finalItemPrice = isDragonstore
      ? Number((parsedPrice * quantity).toFixed(2))
      : pricing.finalPrice

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
        prezzo_listino_unitario: parsedPrice,
        prezzo_listino_totale: Number((parsedPrice * quantity).toFixed(2)),
        risparmio: isDragonstore ? 0 : pricing.savings || 0,
        is_offerta_sito: isDragonstore ? false : pricing.isAlreadyOnSale,
        discount_badge: isDragonstore ? null : pricing.discountBadge,
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
    }, 700)
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-ticket-pop-in transition-all ${
          isNightMode
            ? 'bg-[#18181b] border-white/10 text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Intestazione iOS Sheet */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isNightMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Nuovo Bagaglio</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Imbarca un gioco al Gate o aggiungilo all'Hangar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-200/60 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Chiudi modale"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Corpo Form Scorrevole */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. SELETTORE DEL GATE / STORE */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Seleziona Gate / Store
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {shops.map((s) => {
                const isSelected = s.id === selectedShopId
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedShopId(s.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                        : isNightMode
                        ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Store className="w-4 h-4 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. NOME PASSEGGERO & NOME GIOCO */}
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

          {/* 3. PREZZO DI LISTINO & QUANTITÀ */}
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
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-bold font-mono-code transition-colors outline-hidden cursor-pointer ${
                  isNightMode
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n} className="text-slate-900 bg-white">
                    {n}x
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. LINK OPZIONALE */}
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

          {/* 5. METODO DI PAGAMENTO */}
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

          {/* 6. CHECKBOX "GIÀ IN OFFERTA" & "PREORDINE IN HANGAR" */}
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
          </div>

          {/* ANTEPRIMA PREZZO IN TEMPO REALE */}
          {previewInfo && !isPreorder && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-xs ${
              isNightMode ? 'bg-blue-950/30 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Prezzo Netto Stimato: <strong className="font-mono-code text-sm font-bold">{previewInfo.finalPrice.toFixed(2)}€</strong></span>
                {previewInfo.discountBadge && !isAlreadyOnSale && (
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

          {/* PULSANTE PRIMARIO */}
          <button
            type="submit"
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
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
                <span>Imbarca al Gate {selectedShop.name}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default NewLuggageModal
