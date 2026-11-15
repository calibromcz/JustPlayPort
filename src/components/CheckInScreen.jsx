import React, { useState } from 'react'

export function CheckInScreen({ onLogin, isNightMode = false }) {
  const [nome, setNome] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanNome = nome.trim()
    if (!cleanNome) return
    if (onLogin) {
      onLogin(cleanNome)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Sfondo decorativo con globi sfocati (Glow Orbs) per risaltare il Liquid Glass */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sky-200/50 dark:bg-sky-600/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-indigo-200/40 dark:bg-indigo-600/20 blur-3xl pointer-events-none" />

      {/* Card centrale (Vetro 3D) */}
      <div className="relative z-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 dark:border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] text-center animate-slide-up">
        {/* Titolo e Sottotitolo */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Just Play Port ✈️
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 font-medium">
          Effettua il check-in per proseguire
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Il tuo nome..."
            autoFocus
            className="w-full bg-white/70 dark:bg-white/5 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-xl px-4 py-3 mt-6 text-center text-lg focus:outline-none focus:ring-2 focus:ring-sky-400/60 shadow-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={!nome.trim()}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 mt-4 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Registrati / Entra
          </button>
        </form>
      </div>
    </div>
  )
}

export default CheckInScreen

