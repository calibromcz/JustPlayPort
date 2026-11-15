import React from 'react'
import { Package, User, Plus, ClipboardList, Plane } from 'lucide-react'

export function FloatingBottomBar({
  onOpenGates,
  onOpenHangar,
  onOpenPassport,
  onOpenNewLuggage,
  onOpenHistory,
  hangarCount = 0,
  isNightMode = false,
}) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        zIndex: 50,
        background: isNightMode ? 'rgba(22, 22, 26, 0.78)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: isNightMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: isNightMode ? '0 -4px 20px rgba(0, 0, 0, 0.4)' : '0 -4px 20px rgba(0, 0, 0, 0.06)',
      }}
      className="md:hidden"
      aria-label="Barra di navigazione principale"
    >
      {/* 1. GATE */}
      <button
        type="button"
        onClick={onOpenGates}
        className="flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
        title="Tutti i Gate di Partenza"
      >
        <Plane className="w-5 h-5 stroke-[2.2]" />
        <span style={{ fontSize: '11px', fontWeight: 600 }}>Gate</span>
      </button>

      {/* 2. HANGAR */}
      <button
        type="button"
        onClick={onOpenHangar}
        className="flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 relative"
        title="Apri Hangar Prevendite"
      >
        <div className="relative">
          <Package className="w-5 h-5 stroke-[2.2]" />
          {hangarCount > 0 && (
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white leading-tight shadow-xs">
              {hangarCount}
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600 }}>Hangar</span>
      </button>

      {/* 3. '+' CENTRALE IN EVIDENZA (Bottone circolare 46x46px leggermente rialzato) */}
      <div className="flex items-center justify-center h-full">
        <button
          type="button"
          onClick={onOpenNewLuggage}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007AFF, #0051D5)',
            boxShadow: '0 4px 14px rgba(0, 122, 255, 0.42)',
            transform: 'translateY(-6px)',
          }}
          className="flex items-center justify-center text-white border-2 border-white/80 dark:border-slate-800 shadow-md active:scale-90 transition-transform cursor-pointer"
          title="Aggiungi Gioco al Gate"
          aria-label="Aggiungi Gioco al Gate"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* 4. PASSAPORTO */}
      <button
        type="button"
        onClick={onOpenPassport}
        className="flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
        title="Apri Passaporto Ludico"
      >
        <User className="w-5 h-5 stroke-[2.2]" />
        <span style={{ fontSize: '11px', fontWeight: 600 }}>Passaporto</span>
      </button>

      {/* 5. REGISTRO */}
      <button
        type="button"
        onClick={onOpenHistory}
        className="flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
        title="Apri Registro di Volo"
      >
        <ClipboardList className="w-5 h-5 stroke-[2.2]" />
        <span style={{ fontSize: '11px', fontWeight: 600 }}>Registro</span>
      </button>
    </nav>
  )
}

export default FloatingBottomBar
