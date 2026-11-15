import React from 'react'
import { BookOpen, ClipboardList, Moon, Sun, Luggage, Compass, Package } from 'lucide-react'

export function AirportHeader({
  totalGamesCount = 0,
  totalCartAmount = 0,
  savedPassengerName = '',
  onOpenPassport,
  onOpenHistory,
  onOpenHangar,
  hangarCount = 0,
  readyGatesCount = 0,
  flightBudget = 0,
  passengerPersonalSpent = 0,
  isNightMode = false,
  onToggleNightMode,
  dbStatus = { online: false, error: null },
}) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
      className="w-full transition-colors duration-300 bg-[#f9fafb]/85 dark:bg-[#0f172a]/85 border-b border-white/40 dark:border-white/10 shadow-xs px-3 sm:px-4 py-2 md:py-2.5 flex flex-col items-center justify-center"
    >
      {/* =========================================================================
          1. HEADER ESCLUSIVO MOBILE (< 768px): SINGOLA RIGA COMPATTA
          - Logo/titolo "JustPlayPort" a sinistra
          - A destra: 3 pulsanti compatti (Manuali, DB, Dark Mode) con gap: 8px
          - Nascosto qualsiasi altro elemento, filtro o sottotitolo
         ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          width: '100%',
        }}
        className="flex md:hidden"
      >
        {/* A sinistra: Logo/titolo "JustPlayPort" bilanciato */}
        <div className="flex items-center gap-1.5 font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white shrink-0 min-w-0">
          <span className="truncate">JustPlayPort</span>
          <span className="text-sm select-none">✈️</span>
        </div>

        {/* A destra: 3 pulsanti compatti (Manuali, DB, Dark Mode) raggruppati con gap: 8px */}
        <div
          style={{ gap: '8px' }}
          className="flex items-center shrink-0"
        >
          {/* 1. Pulsante Manuali */}
          <a
            href="https://boardrulesit.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/80 dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Consulta i Manuali e Regolamenti"
            aria-label="Manuali"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
            <span className="text-[11px] font-bold">Manuali</span>
          </a>

          {/* 2. Badge DB (Stato Connessione Database) */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-mono-code font-bold border shadow-2xs transition-colors shrink-0 ${
              dbStatus.online
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-400/30'
            }`}
            title={dbStatus.online ? 'Connessione Supabase OK' : `Errore Supabase: ${dbStatus.error || 'Nessuna risposta'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{dbStatus.online ? 'DB 🟢' : 'DB 🔴'}</span>
          </div>

          {/* 3. Pulsante Dark Mode (Toggle Tema) */}
          <button
            type="button"
            onClick={onToggleNightMode}
            aria-label={isNightMode ? 'Passa alla modalità diurna' : 'Attiva la modalità notturna'}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
            title={isNightMode ? 'Passa alla modalità diurna' : 'Attiva la modalità notturna'}
          >
            {isNightMode ? (
              <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. HEADER DESKTOP / PC (>= 768px): TOTALMENTE INVARIATO
          - Con tutte le tab, i filtri, i pulsanti e i contatori preesistenti
         ========================================================================= */}
      <div className="hidden md:flex flex-col items-center justify-center gap-2 w-full">
        {/* RIGA 1: BADGE DB A SINISTRA, TITOLO CENTRALE E TOGGLE TEMA A DESTRA */}
        <div className="flex flex-row items-center justify-between w-full max-w-4xl px-2">
          {/* Badge Minimale DB */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono-code font-bold border shadow-xs transition-colors shrink-0 ${
              dbStatus.online
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-400/30'
            }`}
            title={dbStatus.online ? 'Connessione Supabase OK' : `Errore Supabase: ${dbStatus.error || 'Nessuna risposta'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{dbStatus.online ? 'DB 🟢' : 'DB 🔴'}</span>
          </div>

          {/* TITOLO CENTRALE Just Play Port ✈️ */}
          <h1
            style={{ fontSize: '23px', fontWeight: 700 }}
            className="tracking-tight text-slate-900 dark:text-white text-center flex items-center justify-center gap-1.5 mx-auto"
          >
            <span>Just Play Port</span>
            <span style={{ fontSize: '22px' }}>✈️</span>
          </h1>

          {/* Tasto Tema compatto a destra */}
          <button
            type="button"
            onClick={onToggleNightMode}
            aria-label={isNightMode ? 'Passa alla modalità diurna' : 'Attiva la modalità notturna'}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 cursor-pointer shrink-0"
            title={isNightMode ? 'Passa alla modalità diurna' : 'Attiva la modalità notturna'}
          >
            {isNightMode ? (
              <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>
        </div>

        {/* RIGA 2 (DESKTOP): I 4 TASTI CLASSICI (Manuali, Passaporto, Registro, Hangar) */}
        <div className="flex flex-row items-center justify-center gap-3 w-full py-1">
          <a
            href="https://boardrulesit.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Manuali dei Voli"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Consulta i Manuali e Regolamenti"
          >
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
            <span>Manuali</span>
          </a>

          <button
            type="button"
            onClick={onOpenPassport}
            aria-label="Passaporto Ludico"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Apri il Passaporto Ludico"
          >
            <span className="text-sm leading-none">🛂</span>
            <span>Passaporto</span>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Registro dei Voli"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Registro dei Voli"
          >
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
            <span>Registro</span>
          </button>

          <button
            type="button"
            onClick={onOpenHangar}
            aria-label="Hangar Prevendite"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-1.5 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Apri l'Hangar delle Prevendite"
          >
            <Package className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Hangar</span>
            {hangarCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white leading-none">
                {hangarCount}
              </span>
            )}
          </button>
        </div>

        {/* RIGA 3 (DESKTOP): I 3 CONTATORI COMPATTI A PILLOLA */}
        <div className="flex flex-wrap justify-center items-center gap-2 w-full font-mono-code text-xs">
          <div className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full px-3 py-1 shadow-2xs text-slate-700 dark:text-slate-300">
            <Luggage className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>Bagagli: <strong className="text-slate-900 dark:text-white text-[13px]">{totalGamesCount}</strong></span>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full px-3 py-1 shadow-2xs text-slate-700 dark:text-slate-300">
            <Compass className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Totale: <strong className="text-emerald-600 dark:text-emerald-400 text-[13px]">{totalCartAmount.toFixed(2)} €</strong></span>
          </div>

          {readyGatesCount > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-amber-500/15 dark:bg-amber-500/20 backdrop-blur-md border border-amber-400/40 rounded-full px-3 py-1 shadow-2xs text-amber-700 dark:text-amber-300 animate-pulse font-bold text-[13px]">
              <span>✈️ Decolli: <strong>{readyGatesCount}</strong></span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default AirportHeader
