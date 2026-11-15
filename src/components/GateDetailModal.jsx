import React, { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { GateAccordionItem } from './GateAccordionItem.jsx'
import { getShopEffectiveItems, calculateDragonstoreDiscount } from '../utils/pricing.js'

export function GateDetailModal({
  shop,
  items = [],
  isOpen = false,
  onClose,
  savedPassengerName = '',
  onSavePassengerName,
  onAddItem,
  onRemoveItem,
  onClearCart,
  onShareStore,
  onToggleForceOrder,
  onSelectShippingOption,
  onGetNextOrderNumber,
  onArchiveFlight,
  isNightMode = false,
}) {
  // Blocco scroll del body con overscroll-behavior quando aperto
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

  // Chiusura con tasto Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose && onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const isDragonstore = shop?.id === 'dragonstore'
  const isForcedActive = Boolean(shop?.ordineForzato)

  const effectiveItems = useMemo(() => {
    if (!shop) return []
    return getShopEffectiveItems(shop, items)
  }, [shop, items])

  const subtotal = useMemo(() => {
    return effectiveItems.reduce((acc, it) => acc + (it.prezzo || 0), 0)
  }, [effectiveItems])

  const dragonInfo = useMemo(() => {
    if (!isDragonstore) return null
    return calculateDragonstoreDiscount(items, isForcedActive)
  }, [isDragonstore, items, isForcedActive])

  const threshold = shop?.freeShipping || 50
  const isReached = isDragonstore
    ? (dragonInfo?.rawProductsTotal >= 300 && dragonInfo?.rawProductsTotal > 0)
    : (subtotal >= threshold && subtotal > 0 && threshold > 0)
  const isPronto = isReached || isForcedActive
  const currentProgressAmount = isDragonstore ? (dragonInfo?.rawProductsTotal || 0) : subtotal
  const progressTarget = isDragonstore ? 300 : threshold
  const progressPercent = progressTarget > 0 ? Math.min(100, Math.round((currentProgressAmount / progressTarget) * 100)) : 100

  if (!isOpen || !shop) return null

  const handleClose = () => {
    document.body.style.overflow = ''
    document.body.style.overscrollBehavior = ''
    onClose && onClose()
  }

  return (
    <div
      style={{
        overscrollBehavior: 'contain',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}
      className="fixed inset-0 z-[3000] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 touch-none overflow-hidden"
      onClick={handleClose}
    >
      {/* SFONDO RETROSTANTE (OVERLAY): bg-slate-900/40 backdrop-blur-sm */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in touch-none cursor-pointer"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* CONTENITORE PRINCIPALE VISTA DI DETTAGLIO: Bordo azzurro ghiaccio in Light Mode */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden transition-all transform animate-slide-up bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl backdrop-saturate-150 border border-sky-300/70 dark:border-white/10 ring-1 ring-sky-200/50 dark:ring-0 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-none touch-auto ${
          isNightMode ? 'text-[#F5F5F7]' : 'text-slate-900'
        }`}
      >
        {/* iOS TOP NAVIGATION BAR STICKY IN GLASSMORPHISM */}
        <div
          className={`sticky top-0 z-20 px-3.5 sm:px-6 py-2.5 sm:py-3 border-b backdrop-blur-xl ${
            isNightMode
              ? 'bg-slate-900/70 border-white/10'
              : 'bg-white/60 border-sky-200/50'
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Titolo centrato compatto con nome negozio */}
            <div className="text-left truncate px-1 flex-1">
              <span className="font-bold text-sm sm:text-base tracking-tight truncate block">
                {shop.name}
              </span>
              <span className="text-[10px] font-mono-code text-slate-500 dark:text-slate-400 uppercase">
                Gate d'Imbarco
              </span>
            </div>

            {/* Tasto Chiudi 'X' a destra */}
            <button
              type="button"
              onClick={handleClose}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs ${
                isNightMode
                  ? 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                  : 'bg-black/[0.06] hover:bg-black/[0.1] text-slate-700 border border-black/[0.05]'
              }`}
              title="Chiudi"
              aria-label="Chiudi"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* REQUISITO 3: BARRA DI PROGRESSO ORDINE SOTTO AL NOME DELLO STORE (Dettaglio Gate) */}
          <div className="mt-2.5 pt-2 border-t border-sky-100/80 dark:border-white/5">
            <div className="flex items-center justify-between text-xs font-mono-code font-bold mb-1">
              <span className={isPronto ? 'text-emerald-600 dark:text-emerald-400 font-black' : (isNightMode ? 'text-cyan-300' : 'text-blue-700')}>
                {isPronto ? '✅ Spedizione Gratuita Sbloccata!' : 'Progresso Spedizione Gratuita'}
              </span>
              <span className={isPronto ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-700 dark:text-slate-300'}>
                {currentProgressAmount.toFixed(2)} € / {progressTarget.toFixed(2)} €
              </span>
            </div>
            {/* Barra linea di progresso identica alla card della Home */}
            <div className="w-full bg-slate-200/80 dark:bg-white/10 h-2 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isPronto
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-cyan-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CONTENUTO SCORREVOLE: SEZIONI INTERNE "VETRO SU VETRO" */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-20 sm:pb-16 space-y-4">
          <GateAccordionItem
            shop={shop}
            items={items}
            savedPassengerName={savedPassengerName}
            onSavePassengerName={onSavePassengerName}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onClearCart={onClearCart}
            onShareStore={onShareStore}
            onToggleForceOrder={onToggleForceOrder}
            onSelectShippingOption={onSelectShippingOption}
            isOpen={true}
            onToggle={() => {}}
            onGetNextOrderNumber={onGetNextOrderNumber}
            onArchiveFlight={onArchiveFlight}
            isNightMode={isNightMode}
            isDetailView={true}
          />
        </div>
      </div>
    </div>
  )
}

export default GateDetailModal
