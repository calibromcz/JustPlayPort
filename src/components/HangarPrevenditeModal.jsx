import React, { useState, useEffect } from 'react'
import {
  X,
  Package,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Store,
  User,
  Euro,
  Sparkles,
  Pencil,
  Check,
  ArrowLeft,
} from 'lucide-react'

export function HangarPrevenditeModal({
  isOpen,
  onClose,
  prevendite = [],
  onAddPrevendita,
  onRemovePrevendita,
  onUpdatePrevendita,
  onSpostaNelGate,
  shops = [],
  savedPassengerName = '',
  isNightMode = false,
}) {
  const [nomePasseggero, setNomePasseggero] = useState(savedPassengerName || '')
  const [nomeGioco, setNomeGioco] = useState('')
  const [url, setUrl] = useState('')
  const [dataUscita, setDataUscita] = useState('')
  const [idNegozio, setIdNegozio] = useState(shops[0]?.id || '')
  const [prezzo, setPrezzo] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editFields, setEditFields] = useState({ id_negozio: '', prezzo: '', data_uscita: '' })

  useEffect(() => {
    if (savedPassengerName && !nomePasseggero) {
      setNomePasseggero(savedPassengerName)
    }
  }, [savedPassengerName])

  useEffect(() => {
    if (shops.length > 0 && !idNegozio) {
      setIdNegozio(shops[0].id)
    }
  }, [shops, idNegozio])

  // Blocco scroll del body quando la modale è aperta
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      const prevOverscroll = document.body.style.overscrollBehavior
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
      return () => {
        document.body.style.overflow = prevOverflow || ''
        document.body.style.overscrollBehavior = prevOverscroll || ''
      }
    }
  }, [isOpen])

  // Chiusura tasto Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose && onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const p = parseFloat(prezzo.toString().replace(',', '.'))
    if (!nomeGioco.trim() || isNaN(p) || p <= 0) {
      alert('Inserisci il nome del gioco e un prezzo valido maggiore di 0€')
      return
    }

    const nuovaPrevendita = {
      id: `prev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome_utente: nomePasseggero.trim() || 'Passeggero',
      nome_gioco: nomeGioco.trim(),
      url: url.trim() || '',
      data_uscita: dataUscita || new Date().toISOString().split('T')[0],
      id_negozio: idNegozio || shops[0]?.id || 'playbazar',
      prezzo: p,
      created_at: new Date().toISOString(),
    }

    if (onAddPrevendita) {
      onAddPrevendita(nuovaPrevendita)
    }

    setNomeGioco('')
    setUrl('')
    setPrezzo('')
    setDataUscita('')
  }

  const getShopName = (shopId) => {
    const s = shops.find((sh) => sh.id === shopId)
    return s ? s.name : shopId
  }

  const handleClose = () => {
    document.body.style.overflow = ''
    document.body.style.overscrollBehavior = ''
    onClose && onClose()
  }

  return (
    <div
      style={{ overscrollBehavior: 'contain' }}
      className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 overflow-hidden touch-none cursor-pointer"
      onClick={handleClose}
    >
      {/* Backdrop Glassmorphism */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-fade-in touch-none"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Contenitore Modale Liquid Glass Apple */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full max-w-xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden border transition-all animate-slide-up touch-auto cursor-default ${
          isNightMode
            ? 'bg-[#1C1C1E]/95 text-slate-100 border-white/10 shadow-black/60 backdrop-blur-2xl'
            : 'bg-white/85 text-slate-900 border-white/80 shadow-slate-300/60 backdrop-blur-2xl'
        }`}
      >
        {/* HEADER MODALE */}
        <div
          className={`px-3.5 sm:px-5 py-3 sm:py-4 border-b flex items-center justify-between gap-2 backdrop-blur-xl ${
            isNightMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200/80 bg-white/40'
          }`}
        >
          {/* Tasto Indietro minimal Liquid Glass a sinistra: pillola compatta e chiara */}
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-full text-xs sm:text-sm font-bold bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white backdrop-blur-xl border border-black/10 dark:border-white/20 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            title="Torna ai Gate"
            aria-label="Torna ai Gate"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Gate</span>
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-500 shadow-xs shrink-0">
              <Package className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="truncate text-center">
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 justify-center">
                <span>Hangar</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                  {prevendite.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs shrink-0 ${
              isNightMode
                ? 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                : 'bg-black/[0.06] hover:bg-black/[0.1] text-slate-700 border border-black/[0.05]'
            }`}
            title="Chiudi"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* CONTENUTO SCORREVOLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-20 sm:pb-16 space-y-5">
          {/* 1. FORM AGGIUNTA PREVENDITA */}
          <form
            onSubmit={handleSubmit}
            className={`p-4 rounded-2xl border space-y-3 shadow-xs ${
              isNightMode
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-white/60 border-sky-100'
            }`}
          >
            <div className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Registra Nuova Prevendita</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Nome Passeggero
                </label>
                <input
                  type="text"
                  placeholder="Es. Marco"
                  value={nomePasseggero}
                  onChange={(e) => setNomePasseggero(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Nome Gioco
                </label>
                <input
                  type="text"
                  placeholder="Es. Slay the Spire"
                  value={nomeGioco}
                  onChange={(e) => setNomeGioco(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Link del negozio (opzionale)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Data d'uscita
                </label>
                <input
                  type="date"
                  value={dataUscita}
                  onChange={(e) => setDataUscita(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Negozio di destinazione
                </label>
                <select
                  value={idNegozio}
                  onChange={(e) => setIdNegozio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-900 bg-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Prezzo Stimato €
                </label>
                <input
                  type="text"
                  placeholder="Es. 49.90"
                  value={prezzo}
                  onChange={(e) => setPrezzo(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Package className="w-4 h-4 stroke-[2.5]" />
              <span>Aggiungi all'Hangar Prevendite</span>
            </button>
          </form>

          {/* 2. LISTA DELLE PREVENDITE IN ATTESA */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Giochi in attesa di uscita ({prevendite.length})</span>
              </span>
              <span className="text-[11px] font-normal lowercase opacity-80">
                Spunta "Disponibile" per imbarcare
              </span>
            </div>

            {prevendite.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                Nessuna prevendita registrata. Usa il form sopra per aggiungere un titolo futuro!
              </div>
            ) : (
              <div className="space-y-2">
                {prevendite.map((item) => {
                  const itemUser = (item.nome_utente || item.nome_passeggero || '').trim().toLowerCase()
                  const loggedUser = (savedPassengerName || '').trim().toLowerCase()
                  const isOwner = loggedUser && itemUser === loggedUser
                  const isEditing = editingItemId === item.id

                  const handleStartEdit = () => {
                    setEditingItemId(item.id)
                    setEditFields({
                      id_negozio: item.id_negozio || shops[0]?.id || '',
                      prezzo: item.prezzo !== undefined ? String(item.prezzo) : '',
                      data_uscita: item.data_uscita || '',
                    })
                  }

                  const handleSaveEdit = () => {
                    if (onUpdatePrevendita) {
                      const updatePayload = {
                        id_negozio: editFields.id_negozio,
                        prezzo: parseFloat(String(editFields.prezzo).replace(',', '.')) || item.prezzo,
                      }
                      // Includi data_uscita solo se modificata o valida; se vuota usa null
                      if (editFields.data_uscita !== undefined) {
                        updatePayload.data_uscita = editFields.data_uscita.trim() ? editFields.data_uscita.trim() : null
                      }
                      onUpdatePrevendita(item.id, updatePayload)
                    }
                    setEditingItemId(null)
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isNightMode
                          ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                          : 'bg-white/70 border-gray-200/80 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Checkbox Automazione "Disponibile" */}
                      <label
                        className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group/check"
                        title="Spunta se il gioco è uscito per spostarlo automaticamente nel Gate!"
                      >
                        <input
                          type="checkbox"
                          onChange={() => onSpostaNelGate && onSpostaNelGate(item)}
                          className="w-5 h-5 rounded-lg border-2 border-amber-400 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer transition-all"
                        />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover/check:underline hidden sm:inline">
                          Disponibile?
                        </span>
                      </label>

                      {/* Dettagli Prevendita (con Modalità Modifica se proprietario) */}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 truncate"
                              title="Apri link negozio"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate">{item.nome_gioco}</span>
                              <span className="text-xs shrink-0 select-none">🔗</span>
                            </a>
                          ) : (
                            <span className="truncate">{item.nome_gioco}</span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-500">Store:</span>
                              <select
                                value={editFields.id_negozio}
                                onChange={(e) => setEditFields((prev) => ({ ...prev, id_negozio: e.target.value }))}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                              >
                                {shops.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-500">Prezzo:</span>
                              <input
                                type="text"
                                value={editFields.prezzo}
                                onChange={(e) => setEditFields((prev) => ({ ...prev, prezzo: e.target.value }))}
                                placeholder="€"
                                className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white font-mono-code"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                                title="Salva modifiche"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Salva</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>👤 {item.nome_utente}</span>
                            <span>•</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              🏪 {getShopName(item.id_negozio)}
                            </span>
                            {item.data_uscita && (
                              <>
                                <span>•</span>
                                <span>📅 {item.data_uscita}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Prezzo e Azioni (Modifica & Elimina SOLO per il proprietario + conferma) */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="font-mono-code font-black text-sm text-slate-900 dark:text-white">
                          {(Number(item.prezzo) || 0).toFixed(2)} €
                        </span>

                        {isOwner && !isEditing && (
                          <button
                            type="button"
                            onClick={handleStartEdit}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Modifica store / prezzo prevendita"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isOwner && onRemovePrevendita && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Vuoi davvero rimuovere "${item.nome_gioco}" dalle prevendite?`)) {
                                onRemovePrevendita(item.id)
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Elimina la tua prevendita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. PULSANTE IN BASSO A SINISTRA (SEMPRE RAGGIUNGIBILE COL POLLICE, z-index 9999) */}
        <div className="absolute bottom-4 left-4 z-[9999] pointer-events-auto">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white backdrop-blur-xl border border-black/10 dark:border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.18)] active:scale-95 transition-all cursor-pointer"
            title="Torna ai Gate"
            aria-label="Torna ai Gate"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Gate</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default HangarPrevenditeModal

