import React, { useState } from 'react'
import { Sparkles, Dices, Layers } from 'lucide-react'

export function GameHeroCard({ gameTitle, coverImage, availableCount = 0 }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="max-w-4xl mx-auto mb-10 px-4">
      <div className="apple-card rounded-3xl p-6 sm:p-8 bg-white/95 border border-stone-200/80 shadow-lg text-center flex flex-col items-center relative overflow-hidden">
        {/* Glow di sfondo Apple style */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge superiore disponibilità */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-5 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Disponibile in {availableCount} {availableCount === 1 ? 'negozio' : 'negozi'}</span>
        </div>

        {/* Immagine del Gioco Grande e Ben Centrata (con fallback SVG ludico elegante) */}
        <div className="relative mb-6 group">
          <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 border border-stone-200/80 shadow-xl flex items-center justify-center p-3 group-hover:scale-[1.02] transition-transform duration-300">
            {coverImage && !imgError ? (
              <img
                src={coverImage}
                alt={gameTitle}
                className="w-full h-full object-cover rounded-2xl drop-shadow-md"
                onError={() => setImgError(true)}
              />
            ) : (
              /* Fallback: Div colorato moderno con grande icona SVG a tema ludico */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 rounded-2xl border border-amber-300/60 shadow-inner">
                <div className="w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-xs flex items-center justify-center shadow-md mb-3 text-amber-700">
                  <Dices className="w-12 h-12 stroke-[1.8]" />
                </div>
                <span className="chunky-title text-base sm:text-lg font-extrabold text-stone-800 line-clamp-2">
                  {gameTitle}
                </span>
                <span className="text-[11px] font-semibold text-amber-900/70 mt-1 uppercase tracking-wider">
                  Gioco da Tavolo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Titolo del Gioco in font Chunky */}
        <h1 className="chunky-title text-3xl sm:text-4xl font-extrabold text-[#1D1D1F] tracking-tight mb-2">
          {gameTitle}
        </h1>

        <p className="text-sm text-stone-500 max-w-md font-medium">
          Confronta le offerte del sito con gli sconti esclusivi del gruppo di acquisto.
        </p>
      </div>
    </div>
  )
}
