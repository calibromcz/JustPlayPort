import React, { useState } from 'react'
import { X, Plane, Clock, Calendar, Store, CheckCircle2, FileText, Table, Trash2, AlertTriangle } from 'lucide-react'
import { exportGatePdf } from '../utils/pdfExport.js'
import { exportGateExcel } from '../utils/excelExport.js'

export function FlightHistoryModal({
  isOpen,
  onClose,
  flights = [],
  onRemoveFlight,
  onClearHistory,
  savedPassengerName = '',
  isNightMode = false,
}) {
  const [feedback, setFeedback] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Blocco scroll del body con overscroll-behavior quando la modale è aperta
  React.useEffect(() => {
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
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose && onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Handler per download PDF del volo storico
  const handleDownloadPdf = (flight) => {
    try {
      const safeShop = flight.shop || { id: flight.shopId || 'archive', name: flight.shopName || 'Negozio' }
      exportGatePdf(safeShop, flight.items || [], flight.orderNumber, flight.date)
      setFeedback(`📄 PDF del ${flight.orderNumber || ''} (${safeShop.name}) scaricato!`)
      setTimeout(() => setFeedback(''), 3500)
    } catch (err) {
      console.error('Errore download PDF storico:', err)
      alert('Si è verificato un errore durante la generazione del PDF.')
    }
  }

  // Handler per download Foglio Ordine XLSX del volo storico
  const handleDownloadExcel = async (flight) => {
    try {
      const safeShop = flight.shop || { id: flight.shopId || 'archive', name: flight.shopName || 'Negozio' }
      const ok = await exportGateExcel(safeShop, flight.items || [], flight.orderNumber, flight.date)
      if (ok) {
        setFeedback(`📊 Foglio Ordine del ${flight.orderNumber || ''} (${safeShop.name}) scaricato!`)
        setTimeout(() => setFeedback(''), 3500)
      }
    } catch (err) {
      console.error('Errore download Excel storico:', err)
      alert('Si è verificato un errore durante la generazione del Foglio Ordine.')
    }
  }

  const handleClose = () => {
    document.body.style.overflow = ''
    document.body.style.overscrollBehavior = ''
    setShowConfirmModal(false)
    onClose && onClose()
  }

  const handleConfirmClear = async () => {
    setIsClearing(true)
    try {
      if (onClearHistory) {
        await onClearHistory()
      }
      setShowConfirmModal(false)
      setFeedback('✅ Registro svuotato con successo.')
      setTimeout(() => setFeedback(''), 3500)
    } catch (err) {
      console.error('Errore durante lo svuotamento del registro:', err)
      alert('Si è verificato un errore durante lo svuotamento del registro.')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div
      style={{
        overscrollBehavior: 'contain',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}
      className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in touch-none overflow-hidden cursor-pointer"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div
        className={`w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden animate-ticket-pop-in transition-all duration-300 touch-auto cursor-default ${
          isNightMode
            ? 'bg-[#0c1527] border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Intestazione Modale */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-start text-left">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0 ${
              isNightMode ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300' : 'bg-blue-600/20 border border-blue-400/40 text-blue-400'
            }`}>
              📋
            </div>
            <div className="truncate">
              <h2 id="history-modal-title" className="text-base sm:text-lg font-black tracking-tight text-white truncate flex items-center gap-1.5">
                <span>Registro di Volo</span>
                {flights && flights.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono-code font-bold">
                    {flights.length}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tasto compatto "Svuota" in stile distruttivo elegante Liquid Glass (Sempre visibile e cliccabile) */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.16)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                borderRadius: '10px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 700,
              }}
              className="hover:bg-rose-500/25 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              title="Svuota completamente il Registro di Volo"
              aria-label="Svuota Registro"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.2] shrink-0 text-rose-500" />
              <span className="whitespace-nowrap font-bold text-rose-500">Svuota</span>
            </button>

            {/* Pulsante Chiusura (X) */}
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shrink-0"
              title="Chiudi registro di volo"
              aria-label="Chiudi registro di volo"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Notifica Toast di Download */}
        {feedback && (
          <div className="p-2.5 px-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 font-bold text-xs sm:text-sm text-center animate-ticket-pop-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Corpo Modale: Lista degli Ordini Passati (Spaziature verticali ridotte a 8-10px) */}
        <div className={`p-3 sm:p-5 overflow-y-auto space-y-2 sm:space-y-2.5 flex-1 transition-colors ${
          isNightMode ? 'bg-[#070d19]' : 'bg-slate-50/60'
        }`}>
          {!flights || (Array.isArray(flights) && flights.length === 0) ? (
            <div className={`text-center py-14 px-4 rounded-2xl border-2 border-dashed space-y-2.5 ${
              isNightMode ? 'bg-[#0b1426] border-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-500'
            }`}>
              <div className="text-4xl">📭</div>
              <div className={`font-bold text-sm sm:text-base ${isNightMode ? 'text-white' : 'text-slate-800'}`}>
                Nessun volo archiviato nel Registro
              </div>
              <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Quando un Gate raggiunge la soglia e scarichi il PDF o il Foglio Ordine, il volo decolla e viene archiviato automaticamente qui, pronto per essere consultato.
              </p>
            </div>
          ) : (
            (flights || []).map((flight) => {
              if (!flight) return null
              const flightItems = Array.isArray(flight.items) ? flight.items : []
              const itemsCount = flightItems.reduce((acc, it) => acc + (it?.quantita || 1), 0)
              const passengersCount = new Set(flightItems.map((it) => it?.nome_utente || it?.user || 'Socio')).size

              return (
                <div
                  key={flight.id || `flight-${Math.random()}`}
                  className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isNightMode
                      ? 'bg-[#0c1527] border-slate-800/90 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {/* Dati Principali: Data, Negozio, Numero Volo e Dettagli */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Riga Superiore: Data & Negozio + Badge Numero Volo */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono-code shadow-2xs ${
                        isNightMode ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-white'
                      }`}>
                        {flight.orderNumber || 'Ordine'}
                      </span>
                      <span className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                        isNightMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        <span>{flight.date || 'Data N/D'}</span>
                        <span className="text-slate-400">•</span>
                        <span className={isNightMode ? 'text-cyan-300 font-black' : 'text-blue-900 font-black'}>{flight.shop?.name || flight.shopName || 'Negozio'}</span>
                      </span>
                      <span className={`text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded ${
                        isNightMode ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {flight.shop?.flightCode || 'JP'}
                      </span>
                    </div>

                    {/* Informazioni su Giochi e Partecipanti */}
                    <div className={`text-xs font-medium flex items-center gap-2 flex-wrap ${
                      isNightMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <span>👥 {passengersCount} soci partecipanti</span>
                      <span>•</span>
                      <span>🎲 {itemsCount} giochi a bordo</span>
                      <span>•</span>
                      <span className={isNightMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold'}>Spedizione Gratuita ✅</span>
                    </div>
                  </div>

                  {/* Blocco Destro: Totale e Bottoni Documenti */}
                  <div className={`flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 ${
                    isNightMode ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    {/* Totale Volo */}
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Totale Volo
                      </span>
                      <span className={`text-base sm:text-lg font-black font-mono-code ${
                        isNightMode ? 'text-cyan-300' : 'text-blue-900'
                      }`}>
                        € {(Number(flight.totalAmount) || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* I DUE BOTTONI COMPATTI: [ 📄 PDF ] e [ 📊 Foglio Ordine ] + Tasto Cestino */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Bottone 📄 PDF */}
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(flight)}
                        className={`btn-aviation min-h-[44px] px-3.5 py-2 rounded-xl text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                          isNightMode
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                        title={`Scarica il manifesto PDF per ${flight.orderNumber || ''}`}
                      >
                        <span>📄</span>
                        <span className="tracking-tight">PDF</span>
                      </button>

                      {/* Bottone 📊 Foglio Ordine */}
                      <button
                        type="button"
                        onClick={() => handleDownloadExcel(flight)}
                        className={`btn-aviation min-h-[44px] px-3.5 py-2 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                          isNightMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-800/80 hover:border-cyan-400'
                            : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                        }`}
                        title={`Scarica il Foglio Ordine Tracker (Google Sheets / Excel) per ${flight.orderNumber || ''}`}
                      >
                        <span>📊</span>
                        <span className="tracking-tight">Foglio Ordine</span>
                      </button>

                      {/* REQUISITO 4: Tasto Cestino per eliminare l'ordine archiviato (con conferma e controllo proprietario/partecipante) */}
                      {onRemoveFlight && (() => {
                        const cleanLogged = (savedPassengerName || '').trim().toLowerCase()
                        // Verifica se l'utente loggato è tra i partecipanti del volo archiviato (o se non ci sono items registrati)
                        const isParticipant = !cleanLogged || flightItems.some((it) => {
                          const u = (it.nome_utente || it.passenger || it.user || it.nome_passeggero || '').trim().toLowerCase()
                          return u === cleanLogged
                        })

                        if (!isParticipant) return null

                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Vuoi davvero rimuovere questo ordine (${flight.orderNumber || ''} - ${flight.shop?.name || ''}) dal Registro?`)) {
                                onRemoveFlight(flight.id)
                              }
                            }}
                            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                              isNightMode
                                ? 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/50'
                                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                            }`}
                            title="Elimina voce dal Registro"
                            aria-label="Elimina ordine dal Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MODALE DI CONFERMA SICUREZZA (Anti-click involontario) in stile Apple Liquid Glass */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in touch-none cursor-default"
          onClick={(e) => {
            e.stopPropagation()
            if (!isClearing) setShowConfirmModal(false)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border flex flex-col items-center text-center animate-ticket-pop-in transition-all ${
              isNightMode
                ? 'bg-[#1C1C1E]/95 text-slate-100 border-white/10 shadow-black/80 backdrop-blur-2xl'
                : 'bg-white/95 text-slate-900 border-white/80 shadow-slate-300/80 backdrop-blur-2xl'
            }`}
          >
            {/* Icona Attenzione */}
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mb-3 shadow-inner">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight mb-2">
              Svuotare tutto il Registro?
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Sei sicuro di voler svuotare tutto il Registro? Questa azione eliminerà lo storico ordini e non può essere annullata.
            </p>

            <div className="flex items-center gap-3 w-full">
              {/* Tasto Annulla */}
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowConfirmModal(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer border ${
                  isNightMode
                    ? 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                Annulla
              </button>

              {/* Tasto Sì, svuota tutto */}
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClear}
                style={{
                  backgroundColor: '#ef4444',
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black text-white hover:bg-rose-600 transition-all active:scale-95 cursor-pointer shadow-md shadow-rose-500/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
                <span>{isClearing ? 'Svuotamento...' : 'Sì, svuota tutto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FlightHistoryModal
