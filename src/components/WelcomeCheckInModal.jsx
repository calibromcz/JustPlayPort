import React, { useState, useEffect, useRef } from 'react'
import { Plane, User, ArrowRight, ShieldCheck, Sparkles, Luggage, Ticket } from 'lucide-react'

export function WelcomeCheckInModal({ isOpen, onCompleteCheckIn, initialName = '', isNightMode = false }) {
  const [name, setName] = useState(initialName || '')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '')
      setError('')
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialName])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Inserisci il tuo nome per completare il check-in e salire a bordo.')
      return
    }
    setError('')
    onCompleteCheckIn(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      {/* Elementi Decorativi di Sfondo Aeronautico */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      </div>

      {/* Card Carta d'Imbarco (Boarding Pass) */}
      <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden animate-ticket-pop-in my-auto transition-all duration-300 ${
        isNightMode
          ? 'bg-[#0c1527] border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] text-slate-100'
          : 'bg-white border-slate-200/90 text-slate-800'
      }`}>
        {/* Intestazione Boarding Pass - Navy Aviation */}
        <div className="bg-slate-900 text-white p-5 sm:p-7 relative border-b border-slate-800">
          {/* Badge In Alto: Terminal & Codice Volo */}
          <div className="flex items-center justify-between gap-2 text-xs font-mono-code mb-3">
            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-sky-300 border border-blue-400/30 font-bold flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-sky-400 -rotate-45" />
              <span>TERMINAL 1 • CHECK-IN GATE</span>
            </span>
            <span className="text-amber-300 font-bold tracking-wider">
              VOLO JP-2026
            </span>
          </div>

          <div className="space-y-1">
            <h2 id="welcome-modal-title" className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Just Play Port</span>
              <span className="text-xl sm:text-2xl animate-bounce">✈️</span>
            </h2>
            <p className="text-xs sm:text-sm text-sky-200/90 font-medium leading-relaxed">
              Benvenuto a bordo! Fai il check-in inserendo il tuo nome per sbloccare la dashboard, imbarcare i tuoi giochi e azzerare le spese di spedizione con gli altri soci.
            </p>
          </div>
        </div>

        {/* Notches Decorative Tagliando Boarding Pass sui lati */}
        <div className={`relative flex items-center justify-between px-3 py-1 border-y border-dashed text-[10px] font-mono-code uppercase tracking-widest ${
          isNightMode
            ? 'bg-slate-900/90 border-slate-800 text-slate-400'
            : 'bg-slate-100/80 border-slate-300 text-slate-500'
        }`}>
          <div className="w-5 h-5 rounded-full bg-slate-950/80 absolute -left-2.5 shadow-inner" />
          <div className="w-5 h-5 rounded-full bg-slate-950/80 absolute -right-2.5 shadow-inner" />
          <span className="pl-4">BOARDING PASS • TICKET VALIDO PER TUTTI I GATE</span>
          <span className={`pr-4 font-bold ${isNightMode ? 'text-cyan-400' : 'text-blue-900'}`}>CLASSE SOCI</span>
        </div>

        {/* Corpo del Check-in: Form e Metadati */}
        <div className={`p-5 sm:p-7 space-y-5 transition-colors ${
          isNightMode ? 'bg-[#0c1527]' : 'bg-white'
        }`}>
          {/* Mini Griglia Volo Info */}
          <div className={`grid grid-cols-3 gap-2 p-3 rounded-2xl border text-center text-xs ${
            isNightMode
              ? 'bg-[#050b14] border-slate-800 text-slate-200'
              : 'bg-slate-50 border-slate-200/80 text-slate-800'
          }`}>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono-code font-bold block">Destinazione</span>
              <span className={`font-black text-xs sm:text-sm flex items-center justify-center gap-1 mt-0.5 ${
                isNightMode ? 'text-white' : 'text-slate-800'
              }`}>
                <span>Tavolo 🎲</span>
              </span>
            </div>
            <div className={`border-x ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="text-[10px] text-slate-400 uppercase font-mono-code font-bold block">Spedizione</span>
              <span className={`font-black text-xs sm:text-sm mt-0.5 block ${
                isNightMode ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                0,00 € (Gruppo)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono-code font-bold block">Stato Gate</span>
              <span className={`font-black text-xs sm:text-sm mt-0.5 block ${
                isNightMode ? 'text-cyan-400' : 'text-blue-900'
              }`}>
                Aperto 🟢
              </span>
            </div>
          </div>

          {/* Form di Inserimento Nome Passeggero */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="passenger-name-input"
                className={`block text-xs sm:text-sm font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
                  isNightMode ? 'text-white' : 'text-slate-800'
                }`}
              >
                <User className={`w-4 h-4 ${isNightMode ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span>Nome Passeggero / Nickname Socio</span>
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  id="passenger-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Inserisci il tuo nome"
                  maxLength={40}
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl border text-sm sm:text-base font-bold placeholder:font-normal focus:outline-none transition-all shadow-inner ${
                    isNightMode
                      ? 'bg-[#050b14] border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#07101e]'
                      : 'bg-slate-50/60 focus:bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-600'
                  } ${
                    error
                      ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-200'
                      : isNightMode
                      ? 'focus:ring-2 focus:ring-cyan-500/20'
                      : 'focus:ring-2 focus:ring-blue-500/10'
                  }`}
                  autoComplete="name"
                />
              </div>

              {error && (
                <p className="mt-1.5 text-xs text-rose-500 font-bold flex items-center gap-1 animate-fade-in">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* Pulsante di Conferma Check-in */}
            <button
              type="submit"
              className={`w-full py-3.5 sm:py-4 px-6 rounded-2xl font-black text-sm sm:text-base btn-aviation flex items-center justify-center gap-2.5 transition-all cursor-pointer group shadow-lg ${
                isNightMode
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/30'
              }`}
            >
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-current group-hover:rotate-12 transition-transform" />
              <span>Fai il Check-in</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-current group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Dettaglio Sicurezza / Pronto per Supabase */}
          <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-medium ${
            isNightMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span className="flex items-center gap-1">
              <ShieldCheck className={`w-3.5 h-3.5 ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>Pronto per sincronizzazione Supabase</span>
            </span>
            <span className={`font-mono-code text-[10px] font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              PORT-PASS-2026
            </span>
          </div>

          {/* Barcode Stilizzato Boarding Pass */}
          <div className="pt-2 flex flex-col items-center justify-center opacity-60">
            <div className={`font-mono-code tracking-[0.25em] text-[10px] font-bold ${
              isNightMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              ||| | ||||| || |||||| | |||| ||| |||| | ||
            </div>
            <span className={`text-[9px] font-mono-code mt-0.5 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              AUTORIZZAZIONE AL VOLO • JUST PLAY PORT
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeCheckInModal
