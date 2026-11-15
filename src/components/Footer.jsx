import React from 'react'
import { Plane } from 'lucide-react'

export function Footer({ isNightMode = false }) {
  return (
    <footer className={`mt-auto border-t py-6 px-4 text-center text-xs backdrop-blur-md transition-colors duration-300 ${
      isNightMode
        ? 'bg-[#0f172a] border-slate-800 text-slate-400'
        : 'bg-white/70 border-sky-200/80 text-slate-600'
    }`}>
      <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2 font-bold justify-center sm:justify-start">
          <Plane className={`w-4 h-4 ${isNightMode ? 'text-[#f59e0b]' : 'text-blue-600'} shrink-0`} />
          <span className={`font-black text-sm ${isNightMode ? 'text-white' : 'text-slate-900'}`}>Just Play Port</span>
          <span className="text-slate-400">•</span>
          <span className={isNightMode ? 'text-slate-300' : 'text-slate-700'}>Terminal Partenze</span>
        </div>

        <div className={`flex items-center gap-2 font-black text-xs ${
          isNightMode ? 'text-slate-200' : 'text-blue-900'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <span>Spedizione Gratuita Garantita 🎲✈️</span>
        </div>
      </div>

      {/* Credits sviluppatore e avviso acquisti responsabili */}
      <p className="mt-8 pb-6 text-center text-xs text-slate-600 dark:text-slate-400 font-medium tracking-wide">
        Acquista responsabilmente, progetto sviluppato da Hattori Hanto.
      </p>
    </footer>
  )
}

