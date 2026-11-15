import React from 'react'
import { Package, User, Plus, ClipboardList, BookOpen } from 'lucide-react'

export function FloatingBottomBar({
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
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        width: 'calc(100% - 24px)',
        maxWidth: '480px',
        height: '66px',
        borderRadius: '24px',
        padding: '0 8px',
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
      {/* 1. HANGAR */}
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

      {/* 2. PASSAPORTO */}
      <button
        type="button"
        onClick={onOpenPassport}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer transition-transform active:scale-95 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
        title="Apri Passaporto Ludico"
      >
        <User className="w-5 h-5" />
        <span style={{ fontSize: '11px', fontWeight: 600 }}>Passaporto</span>
      </button>

      {/* 3. TASTO CENTRALE '+' (Aggiungi al Gate / Nuovo Imbarco - Elevato FAB con z-index: 45) */}
      <div className="flex items-center justify-center relative -top-3 px-1" style={{ zIndex: 45 }}>
        <button
          type="button"
          onClick={onOpenNewLuggage}
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007AFF, #0051D5)',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0, 122, 255, 0.45)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
          className="cursor-pointer active:scale-90 hover:scale-105"
          title="Aggiungi Gioco al Gate"
          aria-label="Aggiungi al Gate"
        >
          <Plus className="w-7 h-7 stroke-[2.8]" />
        </button>
      </div>

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
  )
}

export default FloatingBottomBar
