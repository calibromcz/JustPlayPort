import React, { useState, useEffect } from 'react'
import {
  X,
  Package,
  Calendar,
  Trash2,
  Store,
  User,
  Euro,
  Sparkles,
  Pencil,
  Check,
} from 'lucide-react'

export function HangarPrevenditeModal({
  isOpen,
  onClose,
  prevendite = [],
  onRemovePrevendita,
  onUpdatePrevendita,
  onSpostaNelGate,
  shops = [],
  savedPassengerName = '',
  isNightMode = false,
}) {
  const [editingItemId, setEditingItemId] = useState(null)
  const [editFields, setEditFields] = useState({ id_negozio: '', prezzo: '', data_uscita: '' })

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
      style={{
        overscrollBehavior: 'contain',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}
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
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-start">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-500 shadow-xs shrink-0">
              <Package className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="truncate text-left">
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>Hangar Prevendite</span>
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

        {/* CONTENUTO SCORREVOLE COMPATTO: solo visualizzazione delle prevendite */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-20 sm:pb-16 space-y-2.5 sm:space-y-3.5">
          {/* LISTA DELLE PREVENDITE IN ATTESA */}
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
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                <Package className="w-8 h-8 stroke-[1.5] text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Nessuna prevendita registrata nell'Hangar.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Usa il tasto centrale <span className="font-bold text-amber-500">+</span> in basso per imbarcare nuovi giochi o registrare prevendite!
                </p>
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
                      {/* Checkbox Automazione "Disponibile" (SOLO per il proprietario del gioco) */}
                      {isOwner ? (
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
                      ) : (
                        <div
                          className="flex items-center gap-1.5 shrink-0 select-none opacity-60 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5"
                          title={`In attesa di uscita (prenotato da ${item.nome_utente || 'socio'})`}
                        >
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            ⏳ In attesa
                          </span>
                        </div>
                      )}

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
      </div>
    </div>
  )
}

export default HangarPrevenditeModal

