import React from 'react'
import { Package, User, Plus, ClipboardList, BookOpen, Plane } from 'lucide-react'

export function FloatingBottomBar({
  onOpenGates,
  onOpenHangar,
  onOpenPassport,
  onOpenNewLuggage,
  onOpenHistory,
  onOpenManuals,
  hangarCount = 0,
  isNightMode = false,
}) {
  return (
    <>
      {/* =========================================================================
          REQUISITO 4: PULSANTE FLUTTUANTE (FAB / CTA) "Aggiungi al Gate" SU MOBILE
          - Posizionato nettamente sopra la bottom bar: bottom: calc(85px + env(safe-area-inset-bottom))
          - z-index: 45
          - Ombra marcata, visibile e facilmente cliccabile con il pollice
         ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(85px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 45,
        }}
        className="flex items-center justify-center pointer-events-auto md:hidden"
      >
        <button
          type="button"
          onClick={onOpenNewLuggage}
          style={{
            background: 'linear-gradient(135deg, #007AFF, #0051D5)',
            boxShadow: '0 8px 24px rgba(0, 122, 255, 0.45)',
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-sm tracking-tight border border-white/40 shadow-xl active:scale-95 transition-all cursor-pointer hover:brightness-105"
          title="Aggiungi Gioco al Gate"
          aria-label="Aggiungi al Gate"
        >
          <Plus className="w-5 h-5 stroke-[2.8]" />
          <span>Aggiungi al Gate</span>
        </button>
      </div>

      {/* =========================================================================
          REQUISITO 3: BARRA DI NAVIGAZIONE INFERIORE IN STILE "APPLE LIQUID GLASS"
          - Sfondo semitrasparente: rgba(255, 255, 255, 0.72) / rgba(25, 25, 28, 0.75)
          - backdrop-filter: blur(20px) saturate(180%)
          - Pillola flottante con border-radius: 24px e box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12)
          - padding-bottom: env(safe-area-inset-bottom)
          - z-index: 40 ben calibrato
         ========================================================================= */}
      <nav
        style={{
          position: 'fixed',
          bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          width: 'calc(100% - 24px)',
          maxWidth: '480px',
          height: '64px',
          borderRadius: '24px',
          padding: '0 6px',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          alignItems: 'center',
          justifyContent: 'space-around',
          background: isNightMode ? 'rgba(25, 25, 28, 0.75)' : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isNightMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
        className="flex md:hidden"
        aria-label="Barra di navigazione principale"
      >
        {/* 1. GATE / HOME */}
        <button
          type="button"
          onClick={onOpenGates}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
          title="Tutti i Gate di Partenza"
        >
          <Plane className="w-5 h-5" />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Gate</span>
        </button>

        {/* 2. HANGAR */}
        <button
          type="button"
          onClick={onOpenHangar}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 relative"
          title="Apri Hangar Prevendite"
        >
          <div className="relative">
            <Package className="w-5 h-5" />
            {hangarCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white leading-tight shadow-xs">
                {hangarCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Hangar</span>
        </button>

        {/* 3. PASSAPORTO */}
        <button
          type="button"
          onClick={onOpenPassport}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
          title="Apri Passaporto Ludico"
        >
          <User className="w-5 h-5" />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Passaporto</span>
        </button>

        {/* 4. REGISTRO */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
          title="Apri Registro di Volo"
        >
          <ClipboardList className="w-5 h-5" />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Registro</span>
        </button>

        {/* 5. MANUALI */}
        <a
          href="https://boardrulesit.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
          title="Consulta i Manuali e Regolamenti"
        >
          <BookOpen className="w-5 h-5" />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Manuali</span>
        </a>
      </nav>
    </>
  )
}

export default FloatingBottomBar
