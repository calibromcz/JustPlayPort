import React, { useState, useEffect } from 'react'
import { X, Calendar, Trash2, Plus, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { SHOPS_DATA } from '../data/stores.js'

export function HangarModal({
  isOpen,
  onClose,
  savedPassengerName = '',
  isNightMode = false,
  onAddToCart,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Form states
  const [nomeSocio, setNomeSocio] = useState('')
  const [nomeGioco, setNomeGioco] = useState('')
  const [negozio, setNegozio] = useState(SHOPS_DATA[0]?.name || '')
  const [dataUscita, setDataUscita] = useState('')

  // Inline edit state for "Slittato" (storing item id being edited and new date)
  const [postponingId, setPostponingId] = useState(null)
  const [newDate, setNewDate] = useState('')

  // Sync saved passenger name to form
  useEffect(() => {
    if (savedPassengerName) {
      setNomeSocio(savedPassengerName)
    }
  }, [savedPassengerName])

  // Fetch items from Supabase
  const fetchHangarItems = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      console.log('[HangarModal] Inizio SELECT hangar_prevendite...')
      const { data, error } = await supabase
        .from('hangar_prevendite')
        .select('*')
        .order('data_uscita', { ascending: true })

      if (error) {
        console.error('ERRORE SUPABASE SELECT hangar_prevendite:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
        })
        throw error
      }
      console.log('[HangarModal] SELECT success, record trovati:', data?.length)
      setItems(data || [])
    } catch (err) {
      console.error('ERRORE SUPABASE CATCH (fetchHangarItems):', err)
      setErrorMsg(err.message || 'Errore nel caricamento delle prevendite')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchHangarItems()
    }
  }, [isOpen])

  // Handle Form Submit (INSERT)
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!nomeSocio.trim() || !nomeGioco.trim() || !dataUscita) {
      alert('Compila tutti i campi obbligatori!')
      return
    }

    setSubmitting(true)
    const payload = {
      nome_socio: nomeSocio.trim(),
      nome_gioco: nomeGioco.trim(),
      negozio: negozio || SHOPS_DATA[0]?.name,
      data_uscita: dataUscita,
    }

    console.log('[HangarModal] Tentativo INSERT hangar_prevendite:', payload)

    try {
      const { data, error } = await supabase
        .from('hangar_prevendite')
        .insert([payload])
        .select()

      if (error) {
        console.error('ERRORE SUPABASE INSERT hangar_prevendite:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
          payload,
        })
        alert(
          `ERRORE SUPABASE:\nMessaggio: ${error.message}\nCodice: ${error.code || 'N/D'}\nDettagli: ${error.details || 'N/D'}\nSuggerimento: ${error.hint || 'Verifica RLS o permessi su Supabase'}`
        )
        throw error
      }

      console.log('[HangarModal] INSERT completata con successo:', data)
      setNomeGioco('')
      setDataUscita('')
      await fetchHangarItems()
    } catch (err) {
      console.error('ERRORE SUPABASE CATCH (handleAddItem):', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Vuoi eliminare questa prevendita dall'Hangar?")) return

    console.log('[HangarModal] Tentativo DELETE hangar_prevendite id:', id)
    try {
      const { error } = await supabase
        .from('hangar_prevendite')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('ERRORE SUPABASE DELETE hangar_prevendite:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
          id,
        })
        alert(`ERRORE SUPABASE DELETE: ${error.message}`)
        throw error
      }

      console.log('[HangarModal] DELETE completata id:', id)
      setItems((prev) => prev.filter((it) => it.id !== id))
    } catch (err) {
      console.error('ERRORE SUPABASE CATCH (handleDeleteItem):', err)
    }
  }

  // Handle Slittato (UPDATE data_uscita)
  const handleUpdateDate = async (id) => {
    if (!newDate) {
      alert('Seleziona una nuova data!')
      return
    }

    console.log('[HangarModal] Tentativo UPDATE hangar_prevendite:', { id, newDate })
    try {
      const { error } = await supabase
        .from('hangar_prevendite')
        .update({ data_uscita: newDate })
        .eq('id', id)

      if (error) {
        console.error('ERRORE SUPABASE UPDATE hangar_prevendite:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
        })
        alert(`ERRORE SUPABASE UPDATE: ${error.message}`)
        throw error
      }

      console.log('[HangarModal] UPDATE completata id:', id)
      setPostponingId(null)
      setNewDate('')
      await fetchHangarItems()
    } catch (err) {
      console.error('ERRORE SUPABASE CATCH (handleUpdateDate):', err)
    }
  }

  // Handle Aggiungi al Gate
  const handleAddToGate = async (item) => {
    try {
      const matchingShop = SHOPS_DATA.find(
        (s) => s.name.toLowerCase() === (item.negozio || '').toLowerCase()
      )
      const shopId = matchingShop ? matchingShop.id : (item.negozio || 'playbazar')

      // 1. Esegui INSERT del gioco nella tabella 'giochi_carrello' di Supabase
      const payloadSupabase = {
        id_negozio: shopId,
        negozio: item.negozio,
        nome_utente: item.nome_socio,
        nome_socio: item.nome_socio,
        nome_gioco: item.nome_gioco,
        prezzo: 0,
        quantita: 1,
        metodo_pagamento: 'Contanti',
        created_at: new Date().toISOString(),
      }

      console.log('[HangarModal] Tentativo INSERT giochi_carrello:', payloadSupabase)
      const { error: insertErr } = await supabase
        .from('giochi_carrello')
        .insert([payloadSupabase])

      if (insertErr) {
        console.error('ERRORE SUPABASE INSERT giochi_carrello:', {
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint,
          code: insertErr.code,
          fullError: insertErr,
        })
      } else {
        console.log('[HangarModal] INSERT giochi_carrello completata')
      }

      // 2. Se onAddToCart è fornito, aggiorna contestualmente lo stato locale dell'app
      if (onAddToCart) {
        onAddToCart({
          id_negozio: shopId,
          nome_utente: item.nome_socio,
          nome_gioco: item.nome_gioco,
          prezzo: 0,
          quantita: 1,
          metodo_pagamento: 'Contanti',
        })
      }

      // 3. Esegui DELETE dalla tabella 'hangar_prevendite' su Supabase
      console.log('[HangarModal] Tentativo DELETE hangar_prevendite dopo spostamento al Gate:', item.id)
      const { error: deleteErr } = await supabase
        .from('hangar_prevendite')
        .delete()
        .eq('id', item.id)

      if (deleteErr) {
        console.error('ERRORE SUPABASE DELETE hangar_prevendite:', {
          message: deleteErr.message,
          details: deleteErr.details,
          hint: deleteErr.hint,
          code: deleteErr.code,
          fullError: deleteErr,
        })
        throw deleteErr
      }

      setItems((prev) => prev.filter((it) => it.id !== item.id))
      alert(`🎲 "${item.nome_gioco}" aggiunto al Gate con successo!`)
    } catch (err) {
      console.error('ERRORE SUPABASE CATCH (handleAddToGate):', err)
      alert(`Errore: ${err.message || err}`)
    }
  }

  // Helper Google Calendar Link
  const getGoogleCalendarUrl = (item) => {
    const title = encodeURIComponent(`Uscita Gioco: ${item.nome_gioco} (${item.negozio})`)
    const details = encodeURIComponent(
      `Prevendita per ${item.nome_socio} su JustPlay Port.\nNegozio: ${item.negozio}`
    )
    const cleanDate = (item.data_uscita || '').replace(/-/g, '')
    const dates = `${cleanDate}/${cleanDate}`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`
  }

  // Format date IT
  const formatDateIt = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  // Check if date is Today or Past
  const isTodayOrPast = (dateStr) => {
    if (!dateStr) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return target <= today
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl z-10 overflow-hidden transition-all ${
          isNightMode
            ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-[0_0_30px_rgba(15,23,42,0.9)]'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b shrink-0 ${
            isNightMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl leading-none">🗓️</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Hangar Prevendite</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                Monitora le uscite future e imbarchale al Gate al decollo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Chiudi Modale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* SEZIONE 1: Plancia di Comando (Form di inserimento) */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
              isNightMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Plus className="w-4 h-4 text-cyan-500 font-bold" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Nuova Segnalazione Prevendita
              </h3>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nome Socio */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nome Socio:
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeSocio}
                    onChange={(e) => setNomeSocio(e.target.value)}
                    placeholder="Es. Marco"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Nome Gioco */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nome Gioco:
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeGioco}
                    onChange={(e) => setNomeGioco(e.target.value)}
                    placeholder="Es. Slay the Spire"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Negozio / Gate */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Negozio / Gate:
                  </label>
                  <select
                    value={negozio}
                    onChange={(e) => setNegozio(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  >
                    {SHOPS_DATA.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.gate})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data di Uscita */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Data Uscita Prevista:
                  </label>
                  <input
                    type="date"
                    required
                    value={dataUscita}
                    onChange={(e) => setDataUscita(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Bottone Invio */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvataggio su Supabase...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi all'Hangar</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* SEZIONE 2: Lista d'Attesa */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Lista d'Attesa Prevendite ({items.length})</span>
              </h3>
              <button
                type="button"
                onClick={fetchHangarItems}
                disabled={loading}
                className="text-[11px] font-bold text-cyan-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Aggiorna</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {loading && items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse font-medium">
                Caricamento hangar prevendite in corso...
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Nessuna prevendita registrata nell'Hangar. Aggiungine una sopra!
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((item) => {
                  const passed = isTodayOrPast(item.data_uscita)

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        passed
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-xs'
                          : isNightMode
                          ? 'bg-slate-800/80 border-slate-700/80 text-slate-100 hover:border-slate-600'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Info Prevendita */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm sm:text-base break-words">
                              🎲 {item.nome_gioco}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                passed
                                  ? 'bg-amber-200/80 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              📍 {item.negozio}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 flex-wrap">
                            <span>👤 Segnalato da: <strong className="text-slate-900 dark:text-slate-200">{item.nome_socio}</strong></span>
                            <span>•</span>
                            <span>
                              Data prevista:{' '}
                              <strong className={passed ? 'text-amber-700 dark:text-amber-300 font-bold' : ''}>
                                {formatDateIt(item.data_uscita)}
                              </strong>
                            </span>
                          </div>

                          {/* Se Oggi o Passata: Mostra Banner Giorno X */}
                          {passed && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                              <span>📅 Giorno X: è uscito?</span>
                            </div>
                          )}
                        </div>

                        {/* Azioni */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {passed ? (
                            /* Azioni Giorno X (Slittato & Aggiungi al Gate) */
                            <div className="flex items-center gap-2 flex-wrap">
                              {postponingId === item.id ? (
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                                  <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDate(item.id)}
                                    className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer"
                                  >
                                    Conferma
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPostponingId(null)}
                                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPostponingId(item.id)
                                    setNewDate(item.data_uscita || '')
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-400/50 cursor-pointer transition-colors"
                                >
                                  ⏳ Slittato
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleAddToGate(item)}
                                className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-all flex items-center gap-1"
                              >
                                <span>🚀 Aggiungi al Gate</span>
                              </button>
                            </div>
                          ) : (
                            /* Azioni Data Futura (Google Calendar + Elimina) */
                            <div className="flex items-center gap-1">
                              <a
                                href={getGoogleCalendarUrl(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Aggiungi promemoria su Google Calendar"
                                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-400 transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                title="Elimina prevendita"
                                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
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

export default HangarModal
