import React, { useState, useMemo } from 'react'
import {
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import {
  calculateDragonstoreDiscount,
  getShopEffectiveItems,
} from '../utils/pricing.js'
import { GateDetailModal } from './GateDetailModal.jsx'

export function Gates({
  shops = [],
  cartItems = [],
  openGateId = null,
  onToggleGate,
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
  // Pattern Master-Detail: memorizza lo shop attualmente aperto nel dettaglio
  const [selectedShopId, setSelectedShopId] = useState(openGateId)

  // Sincronizza lo stato con openGateId passato dal componente genitore (App)
  // Questo assicura che se la barra di navigazione o un'altra modale resetta openGateId a null,
  // la modale del Gate si chiuda istantaneamente senza click a vuoto.
  React.useEffect(() => {
    setSelectedShopId(openGateId)
  }, [openGateId])

  const handleSelectShop = (shopId) => {
    setSelectedShopId(shopId)
    if (onToggleGate) onToggleGate(shopId)
  }

  const handleCloseDetail = () => {
    setSelectedShopId(null)
    if (onToggleGate) onToggleGate(null)
  }

  const activeShop = useMemo(() => {
    return shops.find((s) => s.id === selectedShopId) || null
  }, [shops, selectedShopId])

  const activeShopItems = useMemo(() => {
    if (!activeShop) return []
    return cartItems.filter((item) => item.id_negozio === activeShop.id)
  }, [cartItems, activeShop])

  return (
    <>
      {/* VISTA PRINCIPALE (Master): Griglia a 2 colonne su mobile (stile widget compatti iOS), 3-4 su desktop */}
      <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shops.map((shop) => {
          const storeItems = cartItems.filter((item) => item.id_negozio === shop.id)
          return (
            <LiquidGlassGateCard
              key={shop.id}
              shop={shop}
              items={storeItems}
              onClick={() => handleSelectShop(shop.id)}
              isNightMode={isNightMode}
            />
          )
        })}
      </div>

      {/* VISTA DI DETTAGLIO (Detail): Pannello Modale Fullscreen / Fluid iOS Sheet */}
      <GateDetailModal
        shop={activeShop}
        items={activeShopItems}
        isOpen={Boolean(activeShop)}
        onClose={handleCloseDetail}
        savedPassengerName={savedPassengerName}
        onSavePassengerName={onSavePassengerName}
        onAddItem={onAddItem}
        onRemoveItem={onRemoveItem}
        onClearCart={onClearCart}
        onShareStore={onShareStore}
        onToggleForceOrder={() => activeShop && onToggleForceOrder && onToggleForceOrder(activeShop.id)}
        onSelectShippingOption={(optionId) =>
          activeShop && onSelectShippingOption && onSelectShippingOption(activeShop.id, optionId)
        }
        onGetNextOrderNumber={onGetNextOrderNumber}
        onArchiveFlight={onArchiveFlight}
        isNightMode={isNightMode}
      />
    </>
  )
}

/**
 * Card Copertina Apple Liquid Glass - Formato Widget Compatto iOS:
 * - 2 colonne su mobile (~4 card visibili a colpo d'occhio)
 * - 'p-3' o 'p-3.5', 'rounded-2xl sm:rounded-3xl'
 * - Icona app 'w-12 h-12 sm:w-14 sm:h-14 rounded-xl p-1.5'
 * - Nome negozio 'text-sm sm:text-base font-bold'
 * - Badge del totale 'text-[11px] sm:text-xs font-black'
 * - Stesse classi Liquid Glass 3D (riflesso, ombre, bordi, backdrop-blur)
 */
function LiquidGlassGateCard({ shop, items = [], onClick, isNightMode = false }) {
  const isDragonstore = shop.id === 'dragonstore'
  const isForcedActive = Boolean(shop.ordineForzato)

  const effectiveItems = useMemo(() => {
    return getShopEffectiveItems(shop, items)
  }, [shop, items])

  const subtotal = useMemo(() => {
    return effectiveItems.reduce((acc, it) => acc + (it.prezzo || 0), 0)
  }, [effectiveItems])

  const dragonInfo = useMemo(() => {
    if (!isDragonstore) return null
    return calculateDragonstoreDiscount(items, isForcedActive)
  }, [isDragonstore, items, isForcedActive])

  const threshold = shop.freeShipping || 50
  const isReached = isDragonstore ? (dragonInfo?.rawProductsTotal >= 300) : subtotal >= threshold
  const isPronto = isReached || isForcedActive
  const remaining = isDragonstore ? Math.max(0, 300 - (dragonInfo?.rawProductsTotal || 0)) : Math.max(0, threshold - subtotal)
  const progressPercent = isDragonstore
    ? Math.min(100, Math.round(((dragonInfo?.rawProductsTotal || 0) / 300) * 100))
    : Math.min(100, Math.round((subtotal / threshold) * 100))

  const logoSrc = shop.image

  const discountLabel = useMemo(() => {
    if (isDragonstore) {
      return dragonInfo?.isSuperDiscount ? '-32%' : '0%'
    }
    if (shop.discount) {
      return `-${shop.discount}`
    }
    return null
  }, [isDragonstore, dragonInfo, shop.discount])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick && onClick()
        }
      }}
      className={`group relative rounded-2xl sm:rounded-3xl bg-white/75 backdrop-blur-xl transition-all duration-300 ease-out cursor-pointer select-none active:scale-[0.97] flex flex-col justify-between overflow-hidden text-slate-800 dark:text-white ${
        isReached
          ? 'border border-green-400/80 dark:border-green-500/60 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.12)] shadow-[0_0_20px_rgba(74,222,128,0.25)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(74,222,128,0.35)] hover:bg-white/85 dark:bg-white/5 dark:shadow-[0_0_25px_rgba(74,222,128,0.2)] dark:hover:bg-white/[0.08] dark:backdrop-blur-xl'
          : 'border border-sky-200/60 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.12)] shadow-slate-400/40 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.18)] hover:bg-white/85 hover:border-sky-300/70 dark:bg-white/5 dark:border-white/10 dark:shadow-2xl dark:hover:bg-white/[0.08] dark:hover:border-white/20 dark:backdrop-blur-xl dark:hover:translate-y-0'
      }`}
    >
      {/* 4. ANELLO PULSANTE A EFFETTO RESPIRO (Pulsazione sovrapposta al bordo, nessun impatto sul testo) */}
      {isReached && (
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] border-2 border-green-400/50 dark:border-green-400/30 animate-pulse z-20" />
      )}

      {/* Bagliore soft interno sulla superficie del vetro */}
      <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-white/40 dark:bg-white/[0.04] blur-xl pointer-events-none" />

      {/* 1. SEZIONE SUPERIORE: Badge fluttuanti e Icona App Logo ridotta */}
      <div className="pt-3 px-3 sm:pt-4 sm:px-4 pb-1">
        {/* 1. SEZIONE SUPERIORE: Indicatore Spedizione Sbloccata e Sconto con nota Dragon Store */}
        <div className="flex items-start justify-between pointer-events-none mb-2 gap-1 min-h-[24px]">
          {/* Indicatore verde lampeggiante condizionale (solo se totale >= soglia di spedizione) */}
          <div className="flex items-center">
            {isReached && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                  Spedizione Sbloccata
                </span>
              </div>
            )}
          </div>

          {/* Sconto badge & nota condizionale Dragon Store */}
          <div className="flex flex-col items-end shrink-0">
            {discountLabel && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs backdrop-blur-md">
                {discountLabel}
              </span>
            )}

            {/* Testo specifico Dragon Store: 32% se >= 300€ */}
            {isDragonstore && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold tracking-tight">
                {dragonInfo?.isSuperDiscount ? '-32% attivo' : '32% se >= 300€'}
              </span>
            )}
          </div>
        </div>

        {/* CONTENITORE LOGO IN STILE "ICONA APP DI iOS" RIDOTTO: w-12 h-12 (sm:w-14 sm:h-14), rounded-xl, p-1.5 */}
        <div className="flex justify-center my-2">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white p-1.5 shadow-sm border border-gray-100 dark:border-none flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md shrink-0">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`Logo ${shop.name}`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="text-base font-black text-slate-800 font-mono-code">
                {shop.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Barra di avanzamento soglia sottile */}
        <div className="w-full bg-slate-200/80 dark:bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
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

      {/* 2. CORPO DELLA CARD: Nome del negozio al centro e dettagli compatti */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col items-center text-center space-y-0.5 min-w-0">
        <h3
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.25,
          }}
          className="text-xs sm:text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors w-full break-words"
        >
          {shop.name}
        </h3>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate w-full">
          Free a <strong className="text-slate-800 dark:text-slate-200">{shop.freeShipping}€</strong>
        </p>

        <span className="text-[10px] text-blue-600 dark:text-cyan-400 font-semibold truncate w-full">
          {effectiveItems.length > 0
            ? `🎲 ${effectiveItems.length} ${effectiveItems.length === 1 ? 'gioco' : 'giochi'}`
            : '0 giochi'}
        </span>
      </div>

      {/* 3. FOOTER APPLE STYLE COMPATTO: Pill Totale centrata ed elegante */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-center bg-white/30 dark:bg-white/[0.02]">
        {/* Pill Totale Gate con tabular-nums e no-wrap */}
        <div
          style={{ padding: '3px 10px', borderRadius: '12px' }}
          className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/30 shadow-2xs backdrop-blur-md"
        >
          <span
            style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
            className="font-mono-code text-xs sm:text-sm font-black text-emerald-950 dark:text-white"
          >
            {subtotal.toFixed(2)} €
          </span>
        </div>
      </div>
    </div>
  )
}

export default Gates
