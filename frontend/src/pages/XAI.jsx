import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gauge, ShieldCheck, TrendingUp, TrendingDown, Scale, Search, Brain,
  Sparkles, FileText, Check, X, Layers, Quote, BadgeCheck, ChevronDown,
} from 'lucide-react'
import { useDecisions, useExplainability } from '../hooks/useClient'
import { fmt } from '../lib/format'

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'
const fmtMontant = (n) => fmt(n) + ' DH'

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

/* Jauge de score circulaire animée */
function ScoreGauge({ score, seuil, statut }) {
  const size = 200, stroke = 15
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const approuve = statut === 'approuve'
  const angleSeuil = (seuil / 100) * 360 - 90
  const rad = (angleSeuil * Math.PI) / 180
  const cx = size / 2 + r * Math.cos(rad)
  const cy = size / 2 + r * Math.sin(rad)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-slate-800" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className={approuve ? 'stroke-primary-500' : 'stroke-rose-500'}
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-slate-900 dark:bg-slate-100 ring-2 ring-white dark:ring-slate-900" style={{ left: cx, top: cy }} title={`Seuil ${seuil}`} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold tracking-tight tabular-nums">{score}</span>
        <span className="text-xs text-slate-400 mt-0.5">/ 100 · seuil {seuil}</span>
        <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${approuve ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {approuve ? <Check size={13} /> : <X size={13} />}{approuve ? 'Approuvé' : 'Refusé'}
        </span>
      </div>
    </div>
  )
}

/* Cascade (waterfall) des contributions : score de base → score final */
function Waterfall({ contributions, score, seuil }) {
  const H = 300, max = 100
  const toY = (v) => H - (v / max) * H
  const steps = []
  let running = 0
  const base = contributions.find((c) => c.kind === 'base')?.impact ?? 50
  const feats = contributions.filter((c) => c.kind !== 'base')
  running = base
  steps.push({ type: 'base', label: 'Base', to: base, from: 0, impact: base })
  feats.forEach((f) => { const from = running; running += f.impact; steps.push({ type: 'feature', label: f.label, from, to: running, impact: f.impact }) })
  steps.push({ type: 'total', label: 'Final', from: 0, to: score, impact: score })
  const ticks = [0, 20, 40, 60, 80, 100]
  const colW = `${100 / steps.length}%`
  return (
    <div>
      <div className="relative" style={{ height: H }}>
        {ticks.map((t) => (
          <div key={t} className="absolute left-0 right-0 flex items-center" style={{ top: toY(t) }}>
            <span className="w-7 -mt-2 text-[10px] tabular-nums text-slate-400 text-end pe-1">{t}</span>
            <div className="flex-1 border-t border-dashed border-slate-100 dark:border-slate-800" />
          </div>
        ))}
        <div className="absolute left-7 right-0 flex items-center pointer-events-none" style={{ top: toY(seuil) }}>
          <div className="flex-1 border-t-2 border-amber-400/70" />
          <span className="ms-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-white/80 dark:bg-slate-900/80 px-1 rounded">seuil {seuil}</span>
        </div>
        <div className="absolute inset-0 left-7 flex items-end">
          {steps.map((s, i) => {
            const top = toY(Math.max(s.from, s.to))
            const height = Math.abs(toY(s.from) - toY(s.to))
            const positive = s.impact >= 0
            const anchor = s.type === 'base' || s.type === 'total'
            const color = anchor ? (s.type === 'total' ? 'bg-primary-600 dark:bg-primary-500' : 'bg-slate-300 dark:bg-slate-700') : positive ? 'bg-primary-500' : 'bg-rose-500'
            return (
              <div key={i} className="relative h-full flex flex-col justify-end items-center" style={{ width: colW }}>
                <motion.span className={`absolute text-[11px] font-bold tabular-nums ${anchor ? 'text-slate-700 dark:text-slate-200' : positive ? 'text-primary-600 dark:text-primary-400' : 'text-rose-600 dark:text-rose-400'}`}
                  style={{ top: top - 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  {anchor ? s.to : `${positive ? '+' : ''}${s.impact}`}
                </motion.span>
                <motion.div className={`rounded-md ${color}`} style={{ width: 40, position: 'absolute', top }}
                  initial={{ height: 0 }} animate={{ height: Math.max(height, anchor ? 4 : 3) }} transition={{ duration: 0.5, delay: 0.25 + i * 0.1, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex mt-3 ps-7">
        {steps.map((s, i) => <div key={i} className="px-1 text-center text-[10px] leading-tight text-slate-500 dark:text-slate-400" style={{ width: colW }}>{s.label}</div>)}
      </div>
    </div>
  )
}

export default function XAI() {
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: decisions } = useDecisions(clientId)
  const { data: xaiList } = useExplainability(clientId)
  const [selId, setSelId] = useState(null)

  // Joint décisions crédit ↔ explications, par decisionId.
  const items = useMemo(() => {
    if (!xaiList || !decisions) return []
    const byId = Object.fromEntries(decisions.map((d) => [d.id, d]))
    return xaiList
      .map((x) => ({ ...x, decision: byId[x.decisionId] }))
      .filter((x) => x.decision)
      .sort((a, b) => (a.decision.date < b.decision.date ? 1 : -1))
  }, [xaiList, decisions])

  const current = items.find((x) => x.decisionId === selId) || items[0]

  if (!xaiList || !decisions) return <div className="p-8 text-slate-400">Chargement…</div>
  if (!current) return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Centre d'explicabilité (XAI)</h1>
      <p className="text-slate-500 dark:text-slate-400">Aucune décision de crédit à expliquer pour ce client. Lancez une demande de crédit depuis l'Assistant ou les Opérations.</p>
    </div>
  )

  const d = current.decision
  const approuve = current.statut === 'approuve'
  const feats = current.facteurs || []

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <motion.div className="mb-5" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1"><Brain size={18} /><span className="text-xs font-semibold uppercase tracking-wider">Explicabilité</span></div>
        <h1 className="text-2xl font-bold tracking-tight">Centre d'explicabilité (XAI)</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Radiographie des décisions de l'IA pour vos demandes de crédit</p>
      </motion.div>

      {/* Sélecteur de décision (interactif) */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Décision à analyser ({items.length} disponibles)</label>
        <div className="relative max-w-xl">
          <select value={current.decisionId} onChange={(e) => setSelId(e.target.value)}
            className="w-full appearance-none ps-4 pe-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-500/20 outline-none">
            {items.map((x) => (
              <option key={x.decisionId} value={x.decisionId}>
                {x.decision.date} · {x.decision.intent} {fmt(x.decision.montant)} DH · {x.statut === 'approuve' ? 'Approuvé' : 'Refusé'} ({x.scoreFinal}/100)
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Bandeau récap */}
      <motion.div key={current.decisionId} className={`${card} p-5 mb-6 flex flex-wrap items-center gap-x-8 gap-y-4`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center"><Scale size={20} /></div>
          <div><p className="text-[11px] uppercase tracking-wider text-slate-400">Décision {current.decisionId}</p><p className="font-semibold">{d.intent}</p></div>
        </div>
        <div><p className="text-[11px] uppercase tracking-wider text-slate-400">Montant</p><p className="font-semibold tabular-nums">{fmtMontant(d.montant)}</p></div>
        {d.dureeMois && <div><p className="text-[11px] uppercase tracking-wider text-slate-400">Durée</p><p className="font-semibold tabular-nums">{d.dureeMois} mois</p></div>}
        <div className="ms-auto">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full ${approuve ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {approuve ? <BadgeCheck size={16} /> : <X size={16} />}{approuve ? 'Approuvé' : 'Refusé'}
          </span>
        </div>
      </motion.div>

      <motion.div key={`body-${current.decisionId}`} variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Score + marge */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-5"><Gauge size={18} className="text-primary-600 dark:text-primary-400" /> Score d'octroi</h2>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreGauge score={current.scoreFinal} seuil={current.seuil} statut={current.statut} />
            <div className="flex-1 w-full space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs text-slate-400 mb-1">Marge par rapport au seuil</p>
                <p className={`text-2xl font-bold tabular-nums ${current.scoreFinal >= current.seuil ? 'text-primary-600 dark:text-primary-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {current.scoreFinal >= current.seuil ? '+' : ''}{current.scoreFinal - current.seuil}
                </p>
                <p className="text-xs text-slate-400 mt-1">{current.scoreFinal} {current.scoreFinal >= current.seuil ? '≥' : '<'} {current.seuil} requis</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 flex gap-3">
                <Sparkles size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{d.explication}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Waterfall */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-1"><Layers size={18} className="text-primary-600 dark:text-primary-400" /> Décomposition du score</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Du score de base au score final, chaque facteur empile sa contribution.</p>
          <Waterfall contributions={current.contributions} score={current.scoreFinal} seuil={current.seuil} />
        </motion.section>

        {/* Poids des facteurs */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-1"><TrendingUp size={18} className="text-primary-600 dark:text-primary-400" /> Poids des facteurs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Importance de chaque critère dans la décision et son sens (favorable / défavorable).</p>
          <div className="space-y-3">
            {[...feats].sort((a, b) => b.poids - a.poids).map((f, i) => {
              const neg = (f.impact || '').toLowerCase().includes('né') || (f.impact || '').toLowerCase().includes('ne')
              const neutre = (f.impact || '').toLowerCase().includes('neutre')
              const colorBar = neutre ? 'bg-slate-400' : neg ? 'bg-rose-500' : 'bg-primary-500'
              const colorTxt = neutre ? 'text-slate-500' : neg ? 'text-rose-600 dark:text-rose-400' : 'text-primary-600 dark:text-primary-400'
              return (
                <motion.div key={f.nom} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.nom}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{f.valeur}{f.seuil ? ` · seuil ${f.seuil}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <motion.div className={`h-full rounded-full ${colorBar}`} initial={{ width: 0 }} animate={{ width: `${f.poids * 100}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: 'easeOut' }} />
                    </div>
                    <span className={`w-24 text-end text-xs font-semibold flex items-center justify-end gap-1 ${colorTxt}`}>
                      {neg ? <TrendingDown size={13} /> : neutre ? null : <TrendingUp size={13} />}
                      {Math.round(f.poids * 100)} % · {neutre ? 'neutre' : neg ? 'défavorable' : 'favorable'}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* Règles + contrefactuel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.section variants={fadeUp} className={`${card} p-6`}>
            <h2 className="flex items-center gap-2 font-semibold mb-5"><ShieldCheck size={18} className="text-primary-600 dark:text-primary-400" /> Règles métier appliquées</h2>
            <div className="space-y-2.5">
              {(current.reglesActivees || []).map((r) => (
                <div key={r.regle} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.respectee ? 'bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'}`}>
                    {r.respectee ? <Check size={15} /> : <X size={15} />}
                  </span>
                  <span className="text-sm font-medium">{r.regle}</span>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={fadeUp} className={`${card} p-6`}>
            <h2 className="flex items-center gap-2 font-semibold mb-1"><Search size={18} className="text-primary-600 dark:text-primary-400" /> Analyse contrefactuelle</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">« Que faudrait-il pour changer la décision ? »</p>
            {current.contrefactuel ? (
              <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/5 p-4 flex gap-3">
                <TrendingUp size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{current.contrefactuel}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-primary-300 dark:border-primary-500/40 bg-primary-50/60 dark:bg-primary-500/5 p-4 flex gap-3">
                <BadgeCheck size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">Décision favorable : tous les critères réglementaires sont respectés.</p>
              </div>
            )}
          </motion.section>
        </div>

        {/* Sources RAG */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-1"><FileText size={18} className="text-primary-600 dark:text-primary-400" /> Sources consultées (RAG)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Les documents réglementaires sur lesquels la décision s'appuie.</p>
          <div className="space-y-3">
            {(current.sourcesRag || []).map((s, i) => (
              <motion.div key={`${s.document}-${i}`} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"><Quote size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.document}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-slate-400 w-16 shrink-0">Pertinence</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div className="h-full bg-primary-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${s.pertinence * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-primary-600 dark:text-primary-400 w-10 text-end">{Math.round(s.pertinence * 100)} %</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
