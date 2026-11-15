import React from 'react'
import { FileText, Sparkles } from 'lucide-react'

export function FloatingSummaryButton({ onClick, totalAmount = 0, activeCartsCount = 0 }) {
  return (
    <div
      id="floating-order-btn"
      className="fixed bottom-6 right-6 z-40 no-print print:hidden animate-fade-in"
    >
      <button
        onClick={onClick}
        id="btn-open-summary"
        className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-[#1D1D1F] hover:bg-stone-900 text-white shadow-2xl hover:shadow-black/30 border border-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        {/* Glow indicator se ci sono ordini attivi */}
        {activeCartsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#1D1D1F]"></span>
          </span>
        )}

        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-emerald-500 transition-colors">
          <FileText className="w-4 h-4 stroke-[2.2]" />
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white">
              Riepilogo Ordine
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">
            {activeCartsCount > 0
              ? `${activeCartsCount} negozi • ${totalAmount.toFixed(2)} €`
              : 'Gruppo d\'acquisto'}
          </span>
        </div>
      </button>
    </div>
  )
}
