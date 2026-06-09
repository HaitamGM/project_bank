import { useState } from 'react'
import { Mic, Check } from 'lucide-react'

const SCENARIO = {
  transcription: "Je voudrais un crédit immobilier de 600 000 dirhams sur 20 ans pour acheter un appartement à Casablanca.",
  intent: { type: "Crédit", confidence: 98 },
  entities: [
    { label: "Montant", value: "600 000 DH" },
    { label: "Durée", value: "240 mois" },
    { label: "Type", value: "Immobilier" },
  ],
  decision: {
    score: 78,
    explanation: "Profil stable (revenu 18 000 DH/mois), taux d'endettement de 28% sous le seuil de 40%, historique BAM sain, bien respectant le LTV maximal de 80%.",
    details: [
      { label: "Taux", value: "4.85%" },
      { label: "Mensualité", value: "3 920 DH" },
      { label: "Coût total", value: "940 800 DH" },
    ],
  },
}

function Assistant() {
  const [phase, setPhase] = useState('idle')

  const start = () => {
    setPhase('listening')
    setTimeout(() => setPhase('processing'), 2500)
    setTimeout(() => setPhase('done'), 4500)
  }

  const statusText = {
    idle: "Cliquez sur le micro pour parler",
    listening: "En écoute… parlez maintenant",
    processing: "Analyse de votre demande…",
    done: "Décision rendue",
  }[phase]

  const showAnalysis = phase === 'processing' || phase === 'done'
  const card = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Assistant vocal</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Demandez un crédit ou un virement, par la voix</p>

      <div className={`${card} p-6 mb-4 flex items-center gap-5`}>
        <button onClick={phase === 'idle' || phase === 'done' ? start : undefined}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition ${phase === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-orange-500 hover:bg-orange-600'}`}>
          <Mic size={26} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">État du système</p>
          <p className="font-semibold mt-0.5">{statusText}</p>
        </div>
        {phase === 'done' && (
          <button onClick={() => setPhase('idle')} className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">Nouvelle demande</button>
        )}
      </div>

      {showAnalysis && (
        <div className={`${card} p-5 mb-4`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Transcription</p>
          <p className="text-slate-700 dark:text-slate-200">"{SCENARIO.transcription}"</p>
        </div>
      )}

      {showAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className={`${card} p-5`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Intention détectée</p>
            <div className="flex items-center gap-2">
              <span className="bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-medium">{SCENARIO.intent.type}</span>
              <span className="text-sm text-slate-500">{SCENARIO.intent.confidence}%</span>
            </div>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Entités extraites</p>
            <div className="space-y-1.5">
              {SCENARIO.entities.map((e) => (
                <div key={e.label} className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{e.label}</span>
                  <span className="font-medium">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className={`${card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-1.5 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <Check size={15} /> Crédit approuvé
            </span>
            <span className="text-sm text-slate-500">Score {SCENARIO.decision.score}/100</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {SCENARIO.decision.explanation}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SCENARIO.decision.details.map((d) => (
              <div key={d.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">{d.label}</p>
                <p className="font-bold mt-0.5">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Assistant