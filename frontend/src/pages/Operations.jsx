import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftRight, CreditCard, Check, X, Loader2, KeyRound, Send, Cpu, Sparkles, UserPlus,
} from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { pipelineService } from '../services/pipelineService'
import { clientService } from '../services/clientService'
import { errorMessage } from '../services/authService'
import { PipelineView, Metric } from '../components/Pipeline'
import { fmt } from '../lib/format'

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition'

// ───────────────────────── Crédit ─────────────────────────
function CreditPanel() {
  const [montant, setMontant] = useState(600000)
  const [dureeMois, setDureeMois] = useState(240)
  const [objet, setObjet] = useState('immobilier')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setResult(null); setLoading(true)
    try {
      const r = await pipelineService.runCredit({ montant: Number(montant), dureeMois: Number(dureeMois), objet })
      setResult(r)
    } catch (err) {
      setError(errorMessage(err, 'Échec de la pipeline crédit.'))
    } finally {
      setLoading(false)
    }
  }

  const approved = result?.decision === 'approuve'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className={`${card} p-6 h-fit`}>
        <h2 className="font-semibold mb-5 flex items-center gap-2"><CreditCard size={18} className="text-emerald-500" /> Demande de crédit</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Montant (DH)</label>
            <input type="number" min={10000} step={10000} value={montant} onChange={(e) => setMontant(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Durée : {dureeMois} mois ({Math.round(dureeMois / 12)} ans)</label>
            <input type="range" min={12} max={300} step={6} value={dureeMois} onChange={(e) => setDureeMois(Number(e.target.value))} className="w-full accent-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Objet</label>
            <select value={objet} onChange={(e) => setObjet(e.target.value)} className={inputCls}>
              <option value="immobilier">Crédit immobilier</option>
              <option value="consommation">Crédit consommation</option>
              <option value="auto">Crédit auto</option>
              <option value="travaux">Crédit travaux</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400 mt-4">{error}</p>}
        <button type="submit" disabled={loading} className="w-full mt-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          Lancer l'analyse
        </button>
      </form>

      <div className={`${card} p-6`}>
        <h2 className="font-semibold mb-5 flex items-center gap-2"><Cpu size={18} className="text-emerald-500" /> Pipeline de vérification</h2>
        {!result && !loading && <p className="text-sm text-slate-400">Remplissez le formulaire et lancez l'analyse pour voir les agents travailler.</p>}
        {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Orchestration des agents…</div>}
        {result && (
          <>
            <PipelineView steps={result.steps} />
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${approved ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'}`}>
                  {approved ? <Check size={15} /> : <X size={15} />}{approved ? 'Crédit approuvé' : 'Crédit refusé'}
                </span>
                <span className="text-sm text-slate-500">Score {result.score}/100</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <Metric label="Mensualité" value={`${fmt(result.mensualite)} DH`} />
                <Metric label="Endettement" value={`${Math.round(result.tauxEndettement * 100)} %`} danger={result.tauxEndettement > 0.4} />
                <Metric label="Coût total" value={`${fmt(result.coutTotal)} DH`} />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.explication}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Virement ─────────────────────────
function TransferPanel({ client }) {
  const comptes = client?.bancaire?.comptes || []
  const benefs = client?.bancaire?.beneficiaires || []
  const [montant, setMontant] = useState(2000)
  const [beneficiaire, setBeneficiaire] = useState(benefs[0]?.nom || '')
  const [customBenef, setCustomBenef] = useState('')
  const [compteSource, setCompteSource] = useState(comptes[0]?.rib || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  // étape OTP
  const [otp, setOtp] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(null)
  // Ajout d'un bénéficiaire (persisté dans clients.json)
  const [showAddBenef, setShowAddBenef] = useState(false)
  const [newBenef, setNewBenef] = useState({ nom: '', banque: '', rib: '' })
  const [addingBenef, setAddingBenef] = useState(false)
  const [addBenefError, setAddBenefError] = useState(null)
  const queryClient = useQueryClient()

  const benefName = beneficiaire === '__autre__' ? customBenef : beneficiaire

  const saveBeneficiary = async () => {
    const nom = newBenef.nom.trim()
    if (nom.length < 2) { setAddBenefError('Le nom est requis (2 caractères minimum).'); return }
    setAddBenefError(null); setAddingBenef(true)
    try {
      const added = await clientService.addBeneficiary({ nom, banque: newBenef.banque.trim(), rib: newBenef.rib.trim() })
      await queryClient.invalidateQueries({ queryKey: ['client'] }) // rafraîchit la liste déroulante
      setBeneficiaire(added.nom) // sélectionne le bénéficiaire fraîchement ajouté
      setNewBenef({ nom: '', banque: '', rib: '' })
      setShowAddBenef(false)
    } catch (err) {
      setAddBenefError(errorMessage(err, 'Impossible d’enregistrer le bénéficiaire.'))
    } finally {
      setAddingBenef(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setResult(null); setConfirmed(null); setOtp(''); setLoading(true)
    try {
      const r = await pipelineService.runTransfer({ montant: Number(montant), beneficiaire: benefName, compteSource })
      setResult(r)
      if (r.devOtp) setOtp(r.devOtp)
    } catch (err) {
      setError(errorMessage(err, 'Échec de la pipeline virement.'))
    } finally {
      setLoading(false)
    }
  }

  const confirm = async (e) => {
    e.preventDefault()
    setError(null); setConfirming(true)
    try {
      const c = await pipelineService.confirmTransfer(result.challengeId, otp.trim())
      setConfirmed(c)
    } catch (err) {
      setError(errorMessage(err, 'Confirmation OTP échouée.'))
    } finally {
      setConfirming(false)
    }
  }

  const approved = result?.decision === 'approuve'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className={`${card} p-6 h-fit`}>
        <h2 className="font-semibold mb-5 flex items-center gap-2"><Send size={18} className="text-emerald-500" /> Nouveau virement</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Montant (DH)</label>
            <input type="number" min={1} step={100} value={montant} onChange={(e) => setMontant(e.target.value)} className={inputCls} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Bénéficiaire</label>
              <button
                type="button"
                onClick={() => { setShowAddBenef((v) => !v); setAddBenefError(null) }}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
              >
                <UserPlus size={14} /> Ajouter un bénéficiaire
              </button>
            </div>
            <select value={beneficiaire} onChange={(e) => setBeneficiaire(e.target.value)} className={inputCls}>
              {benefs.map((b) => <option key={b.rib} value={b.nom}>{b.nom} · {b.banque}</option>)}
              <option value="__autre__">Autre bénéficiaire…</option>
            </select>
          </div>

          {/* Formulaire d'ajout d'un bénéficiaire persistant */}
          {showAddBenef && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><UserPlus size={15} className="text-emerald-500" /> Nouveau bénéficiaire</p>
              <input
                type="text" value={newBenef.nom} autoFocus
                onChange={(e) => setNewBenef((s) => ({ ...s, nom: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveBeneficiary() } }}
                placeholder="Nom complet *" className={inputCls}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text" value={newBenef.banque}
                  onChange={(e) => setNewBenef((s) => ({ ...s, banque: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveBeneficiary() } }}
                  placeholder="Banque (ex : BMCE)" className={inputCls}
                />
                <input
                  type="text" value={newBenef.rib}
                  onChange={(e) => setNewBenef((s) => ({ ...s, rib: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveBeneficiary() } }}
                  placeholder="RIB / IBAN (optionnel)" className={inputCls}
                />
              </div>
              {addBenefError && <p className="text-sm text-rose-600 dark:text-rose-400">{addBenefError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button" onClick={saveBeneficiary} disabled={addingBenef || newBenef.nom.trim().length < 2}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {addingBenef ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer
                </button>
                <button
                  type="button" onClick={() => { setShowAddBenef(false); setAddBenefError(null) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {beneficiaire === '__autre__' && (
            <input type="text" value={customBenef} onChange={(e) => setCustomBenef(e.target.value)} placeholder="Nom du bénéficiaire" className={inputCls} />
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Compte à débiter</label>
            <select value={compteSource} onChange={(e) => setCompteSource(e.target.value)} className={inputCls}>
              {comptes.map((c) => <option key={c.rib} value={c.rib}>{c.intitule || c.type} · {fmt(c.solde)} DH</option>)}
            </select>
          </div>
        </div>
        {error && !result && <p className="text-sm text-rose-600 dark:text-rose-400 mt-4">{error}</p>}
        <button type="submit" disabled={loading || !benefName} className="w-full mt-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          Vérifier le virement
        </button>
      </form>

      <div className={`${card} p-6`}>
        <h2 className="font-semibold mb-5 flex items-center gap-2"><Cpu size={18} className="text-emerald-500" /> Pipeline de vérification</h2>
        {!result && !loading && <p className="text-sm text-slate-400">Renseignez le virement et lancez la vérification.</p>}
        {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Contrôles en cours…</div>}
        {result && (
          <>
            <PipelineView steps={result.steps} />
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              {confirmed ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3"><Check size={24} /></div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">Virement exécuté</p>
                  <p className="text-sm text-slate-500 mt-1">{fmt(confirmed.montant)} DH → {confirmed.beneficiaire}</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">Réf. {confirmed.reference}</p>
                </div>
              ) : approved ? (
                <form onSubmit={confirm}>
                  <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                    <KeyRound size={16} /> Virement autorisé — signature par OTP requise
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{fmt(result.montant)} DH vers <span className="font-medium">{result.beneficiaire}</span>{result.beneficiaireConnu ? '' : ' (nouveau bénéficiaire)'}.</p>
                  <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Code OTP" className={`${inputCls} text-center text-xl tracking-[0.4em] font-mono`} />
                  {result.devOtp && <p className="text-xs text-center text-slate-400 mt-2">Mode démo — code : <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{result.devOtp}</span></p>}
                  {error && <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">{error}</p>}
                  <button type="submit" disabled={confirming} className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {confirming ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Confirmer et exécuter
                  </button>
                </form>
              ) : (
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <X size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Virement refusé</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{result.motifRefus || 'Contrôles non satisfaits.'}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Operations() {
  const clientId = localStorage.getItem('clientId')
  const { data: client } = useClient(clientId)
  const [tab, setTab] = useState('credit')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ArrowLeftRight className="text-emerald-500" size={24} /> Opérations</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Crédit et virement vérifiés par la pipeline multi-agents en temps réel</p>

      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-6">
        {[{ k: 'credit', l: 'Crédit', i: CreditCard }, { k: 'virement', l: 'Virement', i: Send }].map(({ k, l, i: Icon }) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            <Icon size={16} /> {l}
          </button>
        ))}
      </div>

      {tab === 'credit' ? <CreditPanel /> : <TransferPanel client={client} />}
    </div>
  )
}
