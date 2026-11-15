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
      className="w-full flex flex-col items-center justify-center gap-2 px-3 py-2.5 transition-colors duration-300 bg-[#f9fafb]/85 dark:bg-[#0f172a]/85 border-b border-white/40 dark:border-white/10 shadow-xs"
    >
      {/* RIGA 1: BADGE DB A SINISTRA, TITOLO PRINCIPALE PIÙ GRANDE E TASTO TEMA SOLE/LUNA */}
      <div className="flex flex-row items-center justify-center gap-2.5 flex-wrap">
        {/* 1. BADGE MINIMALE DB 🟢 / DB 🔴 (A SINISTRA DEL TITOLO) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono-code font-bold border shadow-xs transition-colors ${
            dbStatus.online
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-400/30'
          }`}
          title={dbStatus.online ? 'Connessione Supabase OK' : `Errore Supabase: ${dbStatus.error || 'Nessuna risposta'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>{dbStatus.online ? 'DB 🟢' : `DB 🔴`}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center flex items-center justify-center gap-2">
          <span>Just Play Port</span>
          <span className="text-lg sm:text-xl">✈️</span>
        </h1>

        {/* Tasto Tema compatto (w-8 h-8) e discreto */}
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

      {/* RIGA 2: LA PULSANTIERA SCORREVOLE IN STILE iOS PIÙ SPAZIOSA E LEGGIBILE */}
      <div className="w-full flex flex-col items-center">
        <div className="flex flex-row items-center w-full overflow-x-auto flex-nowrap gap-2.5 px-2 pb-0.5 md:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Pulsante Manuali */}
          <a
            href="https://boardrulesit.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Manuali dei Voli"
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs sm:text-[13.5px] font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-2 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Consulta i Manuali e Regolamenti"
          >
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
            <span>Manuali</span>
          </a>

          {/* Pulsante Passaporto */}
          <button
            id="tutorial-budget"
            type="button"
            onClick={onOpenPassport}
            aria-label="Passaporto Ludico"
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs sm:text-[13.5px] font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-2 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Apri il Passaporto Ludico"
          >
            <span className="text-sm leading-none">🛂</span>
            <span>Passaporto</span>
          </button>

          {/* Pulsante Registro */}
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Registro dei Voli"
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs sm:text-[13.5px] font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-2 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Registro dei Voli"
          >
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
            <span>Registro</span>
          </button>

          {/* Pulsante Hangar Prevendite */}
          <button
            type="button"
            onClick={onOpenHangar}
            aria-label="Hangar Prevendite"
            className="shrink-0 whitespace-nowrap bg-white dark:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs sm:text-[13.5px] font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 active:translate-y-0 flex items-center gap-2 text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Apri l'Hangar delle Prevendite"
          >
            <Package className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Hangar</span>
            {hangarCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white leading-none">
                {hangarCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RIGA 3: I CONTATORI A PILLOLA TRASLUCIDA APPLE PIÙ GRANDI ED EVIDENTI */}
      <div className="flex flex-wrap justify-center items-center gap-2 w-full text-xs font-mono-code">
        {/* Pillola Bagagli al Gate */}
        <div className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full px-3 py-1 shadow-2xs text-slate-700 dark:text-slate-300">
          <Luggage className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span>Bagagli: <strong className="text-slate-900 dark:text-white text-xs sm:text-[13px]">{totalGamesCount}</strong></span>
        </div>

        {/* Pillola Totale Imbarcato */}
        <div className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full px-3 py-1 shadow-2xs text-slate-700 dark:text-slate-300">
          <Compass className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Totale: <strong className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-[13px]">{totalCartAmount.toFixed(2)} €</strong></span>
        </div>

        {/* Pillola Decolli Pronti */}
        {readyGatesCount > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-amber-500/15 dark:bg-amber-500/20 backdrop-blur-md border border-amber-400/40 rounded-full px-3 py-1 shadow-2xs text-amber-700 dark:text-amber-300 animate-pulse font-bold text-xs sm:text-[13px]">
            <span>✈️ Decolli: <strong>{readyGatesCount}</strong></span>
          </div>
        )}
      </div>
    </header>
  )
}

export default AirportHeader
