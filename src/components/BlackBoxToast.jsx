import React, { useEffect, useState } from 'react'
import { RotateCcw, X, AlertOctagon, ArchiveRestore } from 'lucide-react'

export function BlackBoxToast({
  data,
  onUndo,
  onDismiss,
  duration = 5000,
  isNightMode = false,
}) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!data) return

    setProgress(100)
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remainingPercent)

      if (elapsed >= duration) {
        clearInterval(interval)
        onDismiss()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [data, duration, onDismiss])

  if (!data) return null

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-ticket-pop-in"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`rounded-2xl border-2 shadow-2xl overflow-hidden transition-all duration-300 ${
          isNightMode
            ? 'bg-[#090f1d] border-amber-500/90 shadow-[0_0_25px_rgba(245,158,11,0.35)] text-white'
            : 'bg-slate-900 border-amber-500 shadow-2xl text-white'
        }`}
      >
        {/* Barra di caricamento visiva (Timeout 5 secondi) */}
        <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
          {/* Icona Scatola Nera Aeronautica */}
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/60 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
            <ArchiveRestore className="w-5 h-5 stroke-[2.5] text-amber-400" />
          </div>

          {/* Testi Toast: "Bagaglio smarrito." + Dettaglio */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono-code uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                SCATOLA NERA
              </span>
              <span className="text-[10px] font-mono-code text-slate-400">
                ({Math.ceil((progress / 100) * (duration / 1000))}s)
              </span>
            </div>
            <div className="font-black text-sm text-white truncate leading-tight mt-0.5">
              Bagaglio smarrito.
            </div>
            <p className="text-xs text-slate-300 truncate font-medium">
              {data.message || 'Elemento rimosso dal Gate.'}
            </p>
          </div>

          {/* Azioni: Pulsante "RECUPERA" e Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onUndo}
              className="btn-aviation px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-95"
              title="Annulla eliminazione e ripristina il carrello"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
              <span>RECUPERA</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors cursor-pointer"
              title="Conferma eliminazione immediata"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlackBoxToast
