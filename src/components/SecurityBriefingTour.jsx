import React, { useEffect, useState, useRef } from 'react'
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  Plane,
  Target,
  Megaphone,
  CheckCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export function SecurityBriefingTour({
  isOpen = false,
  onFinish,
  onSkip,
  onStepChange,
  isNightMode = false,
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [targetRect, setTargetRect] = useState(null)
  const tooltipRef = useRef(null)

  const stepsData = [
    {
      step: 1,
      targetId: 'tutorial-navbar',
      badge: 'TAPPA 1 DI 4 • PLANCIA DI COMANDO',
      title: 'Plancia di Comando',
      description:
        'Benvenuto a bordo! Da qui puoi accedere al Manuale di Volo, al Passaporto Ludico e allo Storico dei voli passati.',
      icon: Compass,
      position: 'bottom',
    },
    {
      step: 2,
      targetId: 'tutorial-budget',
      badge: 'TAPPA 2 DI 4 • CONTROLLO CAPIENZA',
      title: 'Budget di Volo',
      description:
        'Prima di decollare, imposta il tuo Budget di Volo per non sforare con le spese.',
      icon: Target,
      position: 'bottom',
    },
    {
      step: 3,
      targetId: 'tutorial-gate-actions',
      badge: 'TAPPA 3 DI 4 • COMANDI DI VOLO',
      title: 'Comandi di Decollo',
      description:
        "Questi sono i comandi di decollo. Usa 'Annuncia' per il gruppo Telegram e 'Scarica PDF/Excel' per chiudere il volo.",
      icon: Megaphone,
      position: 'top',
    },
    {
      step: 4,
      targetId: null, // Conclusione centrata a tutto schermo
      badge: 'TAPPA 4 DI 4 • DECOLLO AUTORIZZATO',
      title: 'Briefing Concluso',
      description:
        'Allacciate le cinture, il briefing è terminato. Buon divertimento!',
      icon: Plane,
      position: 'center',
    },
  ]

  const currentStepData = stepsData[currentStep - 1]

  // Notifica al genitore quando cambia il passo (es. per aprire il primo Gate al passo 3)
  useEffect(() => {
    if (isOpen && onStepChange) {
      onStepChange(currentStep)
    }
  }, [currentStep, isOpen, onStepChange])

  // Calcola le coordinate dell'elemento target
  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      if (!currentStepData.targetId) {
        setTargetRect(null)
        return
      }

      const element = document.getElementById(currentStepData.targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          const rect = element.getBoundingClientRect()
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
          })
        }, 120)
      } else {
        setTargetRect(null)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep, isOpen, currentStepData.targetId])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1)
    } else {
      if (onFinish) onFinish()
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSkip = () => {
    if (onSkip) onSkip()
  }

  const StepIcon = currentStepData.icon

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" role="dialog" aria-modal="true">
      {/* Sfondo Oscurato con ritaglio sull'elemento target (Spotlight Overlay) */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Riquadro di Evidenziazione / Spotlight sull'elemento attivo */}
      {targetRect && (
        <div
          className="absolute pointer-events-none transition-all duration-300 ease-out z-[61] rounded-2xl"
          style={{
            top: `${Math.max(8, targetRect.top - 6)}px`,
            left: `${Math.max(8, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78), 0 0 20px rgba(245, 158, 11, 0.55)',
            border: isNightMode ? '2.5px solid #f59e0b' : '2.5px solid #3b82f6',
          }}
        />
      )}

      {/* Card Tooltip Galleggiante del Briefing */}
      <div
        ref={tooltipRef}
        className={`absolute z-[62] w-[92%] max-w-md transition-all duration-300 ${
          currentStepData.position === 'center' || !targetRect
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : currentStepData.position === 'bottom'
            ? 'left-1/2 -translate-x-1/2'
            : 'left-1/2 -translate-x-1/2'
        }`}
        style={
          targetRect && currentStepData.position !== 'center'
            ? {
                top:
                  currentStepData.position === 'bottom'
                    ? `${Math.min(window.innerHeight - 280, targetRect.bottom + 14)}px`
                    : `${Math.max(20, targetRect.top - 240)}px`,
              }
            : undefined
        }
      >
        <div
          className={`rounded-3xl border-2 shadow-2xl p-5 sm:p-6 transition-all duration-300 animate-ticket-pop-in ${
            isNightMode
              ? 'bg-[#1e293b] border-[#f59e0b] text-white shadow-[0_0_25px_rgba(245,158,11,0.3)]'
              : 'bg-white border-blue-600 text-slate-900 shadow-2xl'
          }`}
        >
          {/* Header del Tooltip: Badge Tappa e Tasto Salta / Chiudi */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping inline-block" />
              <span
                className={`text-[10px] sm:text-[11px] font-mono-code font-bold tracking-widest uppercase ${
                  isNightMode ? 'text-[#f59e0b]' : 'text-blue-600'
                }`}
              >
                {currentStepData.badge}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                isNightMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Esci dal tutorial di benvenuto"
            >
              <span>Salta</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Contenuto Principale Tappa */}
          <div className="flex items-start gap-3.5 mb-4">
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                isNightMode
                  ? 'bg-[#0f172a] border-[#f59e0b]/70 text-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}
            >
              <StepIcon className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                  isNightMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {currentStepData.title}
              </h3>
              <p
                className={`text-xs sm:text-sm font-medium mt-1 leading-relaxed ${
                  isNightMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Barre di Progresso a Pallini */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map((stepIdx) => (
              <div
                key={stepIdx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  stepIdx === currentStep
                    ? isNightMode
                      ? 'w-8 bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]'
                      : 'w-8 bg-blue-600'
                    : stepIdx < currentStep
                    ? isNightMode
                      ? 'w-3 bg-[#f59e0b]/60'
                      : 'w-3 bg-blue-400'
                    : isNightMode
                    ? 'w-3 bg-slate-700'
                    : 'w-3 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* REQUISITO 4: Barra di Navigazione Bottoni - "Indietro", "Salta il Briefing" e "Avanti" presenti in ogni tooltip */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/80">
            {/* 1. Pulsante "Indietro" */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`btn-aviation px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentStep === 1
                  ? 'opacity-35 cursor-not-allowed bg-slate-800/20 text-slate-500 border-slate-700/40'
                  : isNightMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Indietro</span>
            </button>

            {/* 2. Pulsante "Salta il Briefing" (sempre presente e visibile) */}
            <button
              type="button"
              onClick={handleSkip}
              className={`text-xs font-bold underline transition-colors cursor-pointer px-2 py-1 ${
                isNightMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Salta il Briefing
            </button>

            {/* 3. Pulsante "Avanti" / "Decollo!" */}
            <button
              type="button"
              onClick={handleNext}
              className={`btn-aviation px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 ${
                currentStep === 4
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : isNightMode
                  ? 'bg-[#f59e0b] hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {currentStep === 4 ? (
                <>
                  <Plane className="w-4 h-4" />
                  <span>Decollo! 🚀</span>
                </>
              ) : (
                <>
                  <span>Avanti</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityBriefingTour
