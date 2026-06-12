import { useState } from 'react'
import { User, Briefcase, CreditCard, Shield, MapPin, Landmark, Users, BadgeCheck, Wallet, ArrowLeftRight, AlertTriangle, FileText, Eye, EyeOff, Wifi } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import Avatar from '../components/Avatar'
import RevealModal from '../components/RevealModal'

const fmtMad = (n) => (n ?? 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD'

function Profil() {
  const clientId = localStorage.getItem('clientId')
  const { data: client, isLoading, isError } = useClient(clientId)

  // Œil sur les cartes : numéro complet + CVV masqués, déverrouillés par le mot de passe (step-up).
  const [revealed, setRevealed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) return <div className="p-8 text-slate-400">Chargement…</div>
  if (isError || !client) return <div className="p-8 text-rose-500">Impossible de charger le profil.</div>

  const { personnel = {}, professionnel = {}, bancaire = {}, risque = {} } = client
  const adresse = personnel.adresse || {}
  const comptes = bancaire.comptes || []
  const cartes = bancaire.cartes || []
  const benefs = bancaire.beneficiaires || []
  const credits = bancaire.creditsEnCours || []
  const plafonds = bancaire.plafonds || {}
  const soldeTotal = comptes.reduce((s, c) => s + (c.solde || 0), 0)

  const riskColor = {
    Faible: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    Moyen: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    'Élevé': 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  }[risque.niveauRisque] || 'bg-slate-100 dark:bg-slate-800 text-slate-600'

  const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6'

  const onEye = () => {
    if (revealed) { setRevealed(false); return }
    if (sessionStorage.getItem('balanceUnlocked') === '1') { setRevealed(true); return }
    setModalOpen(true)
  }
  const onUnlocked = () => { setRevealed(true); setModalOpen(false) }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
        <Avatar photo={client.photo} prenom={personnel.prenom} nom={personnel.nom} size={88} rounded="rounded-3xl" className="shadow-sm" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{personnel.civilite} {personnel.prenom} {personnel.nom}</h1>
          <p className="text-slate-500 dark:text-slate-400">{professionnel.profession} · Client {client.id}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{bancaire.segment}</Badge>
            <Badge className={riskColor}>Risque {risque.niveauRisque}</Badge>
            {personnel.pieceIdentite?.verifiee && (
              <Badge className="bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400"><BadgeCheck size={13} className="inline -mt-0.5 mr-1" />Identité vérifiée</Badge>
            )}
            {risque.fichageBam && (
              <Badge className="bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"><AlertTriangle size={13} className="inline -mt-0.5 mr-1" />Fiché BAM</Badge>
            )}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Solde total</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtMad(soldeTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informations personnelles */}
        <div className={card}>
          <SectionTitle icon={User} title="Informations personnelles" />
          <Field label="CIN" value={personnel.cin} />
          <Field label="Date de naissance" value={`${personnel.dateNaissance}${personnel.age ? ` (${personnel.age} ans)` : ''}`} />
          <Field label="Lieu de naissance" value={personnel.lieuNaissance} />
          <Field label="Nationalité" value={personnel.nationalite} />
          <Field label="Téléphone" value={personnel.telephone} />
          <Field label="Email" value={personnel.email} />
          <Field label="Situation familiale" value={`${personnel.situationFamiliale}${personnel.nombreEnfants ? ` · ${personnel.nombreEnfants} enfant(s)` : ''}`} />
          <Field label="Niveau d'études" value={personnel.niveauEtudes} />
        </div>

        {/* Adresse */}
        <div className={card}>
          <SectionTitle icon={MapPin} title="Adresse" />
          <Field label="Rue" value={adresse.rue} />
          <Field label="Ville" value={adresse.ville || personnel.ville} />
          <Field label="Code postal" value={adresse.codePostal} />
          <Field label="Pays" value={adresse.pays} />
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <SectionTitle icon={FileText} title="Pièce d'identité" small />
            <Field label="Type" value={personnel.pieceIdentite?.type} />
            <Field label="Numéro" value={personnel.pieceIdentite?.numero} />
            <Field label="Valide jusqu'au" value={personnel.pieceIdentite?.validiteJusquau} />
          </div>
        </div>

        {/* Situation professionnelle */}
        <div className={card}>
          <SectionTitle icon={Briefcase} title="Situation professionnelle" />
          <Field label="Profession" value={professionnel.profession} />
          <Field label="Employeur" value={professionnel.employeur} />
          <Field label="Type de contrat" value={professionnel.typeContrat} />
          <Field label="Secteur" value={professionnel.secteur} />
          <Field label="Ancienneté" value={`${professionnel.ancienneteMois} mois`} />
          <Field label="Revenu mensuel net" value={`${(professionnel.revenuMensuel || 0).toLocaleString('fr-MA')} MAD`} />
          <Field label="Revenu annuel" value={`${(professionnel.revenuAnnuel || 0).toLocaleString('fr-MA')} MAD`} />
          {professionnel.autresRevenus > 0 && <Field label="Autres revenus" value={`${professionnel.autresRevenus.toLocaleString('fr-MA')} MAD`} />}
        </div>

        {/* Profil bancaire */}
        <div className={card}>
          <SectionTitle icon={Landmark} title="Profil bancaire" />
          <Field label="Client depuis" value={bancaire.clientDepuis} />
          <Field label="Agence" value={bancaire.agence} />
          <Field label="Conseiller" value={bancaire.conseiller} />
          <Field label="Segment" value={bancaire.segment} />
          <Field label="Score interne" value={`${bancaire.scoreInterne}/100`} />
          <Field label="Comptes" value={comptes.length} />
        </div>

        {/* Comptes */}
        <div className={`${card} md:col-span-2`}>
          <SectionTitle icon={Wallet} title="Comptes" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {comptes.map((c) => (
              <div key={c.rib} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold">{c.intitule || c.type}</p>
                    <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                  </div>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmtMad(c.solde)}</p>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-2">{c.iban || c.rib}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cartes bancaires (carte réaliste + œil sécurisé) */}
        {cartes.length > 0 && (
          <div className={`${card} md:col-span-2`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CreditCard size={18} />
                <h2 className="font-semibold text-slate-900 dark:text-white">Cartes bancaires</h2>
              </div>
              <button
                onClick={onEye}
                title={revealed ? 'Masquer les détails' : 'Afficher le numéro et le CVV'}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
              >
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                {revealed ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cartes.map((c, i) => <BankCard key={i} carte={c} revealed={revealed} />)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1.5">
              <Shield size={12} /> Numéro complet et CVV masqués — affichage protégé par votre mot de passe.
            </p>
          </div>
        )}

        {/* Plafonds + Bénéficiaires */}
        <div className={card}>
          <SectionTitle icon={Shield} title="Plafonds & bénéficiaires" />
          <Field label="Virement / opération" value={`${(plafonds.virementParOperation || 0).toLocaleString('fr-MA')} DH`} />
          <Field label="Virement / jour" value={`${(plafonds.virementQuotidien || 0).toLocaleString('fr-MA')} DH`} />
          <Field label="Retrait / jour" value={`${(plafonds.retraitQuotidien || 0).toLocaleString('fr-MA')} DH`} />
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <SectionTitle icon={Users} title="Bénéficiaires enregistrés" small />
            {benefs.map((b, i) => (
              <div key={i} className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{b.nom}</span>
                <span className="text-xs text-slate-400">{b.banque}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crédits en cours */}
        {credits.length > 0 && (
          <div className={card}>
            <SectionTitle icon={ArrowLeftRight} title="Crédits en cours" />
            {credits.map((cr, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 mb-2 last:mb-0">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">{cr.type}</span>
                  <span className="text-sm font-bold">{(cr.mensualite || 0).toLocaleString('fr-MA')} DH/mois</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Capital restant {(cr.capitalRestant || 0).toLocaleString('fr-MA')} DH</span>
                  <span>Échéance {cr.echeance}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Évaluation du risque */}
        <div className={`${card} md:col-span-2`}>
          <SectionTitle icon={Shield} title="Évaluation du risque" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <RiskTile label="Incidents (12 mois)" value={risque.incidentsPaiement} danger={risque.incidentsPaiement > 0} />
            <RiskTile label="Fichage BAM" value={risque.fichageBam ? 'Oui' : 'Non'} danger={risque.fichageBam} />
            <RiskTile label="Taux d'endettement" value={`${Math.round((risque.tauxEndettement || 0) * 100)} %`} />
            <RiskTile label="Score BAM" value={risque.scoreBam} />
            <RiskTile label="Niveau de risque" value={risque.niveauRisque} danger={risque.niveauRisque === 'Élevé'} />
          </div>
          {risque.derniereRevue && <p className="text-xs text-slate-400 mt-3">Dernière revue du dossier : {risque.derniereRevue}</p>}
        </div>
      </div>

      {modalOpen && (
        <RevealModal
          onClose={() => setModalOpen(false)}
          onSuccess={onUnlocked}
          title="Afficher les cartes"
          subtitle="Saisissez votre mot de passe pour révéler le numéro complet et le CVV."
        />
      )}
    </div>
  )
}

// Carte bancaire réaliste : puce, sans-contact, logo réseau, numéro/CVV révélables.
function BankCard({ carte, revealed }) {
  const isMc = (carte.reseau || '').toLowerCase().includes('mastercard')
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 shadow-md min-h-[190px] flex flex-col justify-between">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-8 top-12 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        {/* Puce + sans-contact + réseau */}
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 border border-amber-300/50 shadow-inner" />
            <Wifi size={18} className="rotate-90 text-white/70" />
          </div>
          {isMc ? (
            <div className="flex items-center -space-x-2.5">
              <span className="w-7 h-7 rounded-full bg-rose-500" />
              <span className="w-7 h-7 rounded-full bg-amber-400 mix-blend-screen" />
            </div>
          ) : (
            <span className="font-bold italic text-xl tracking-wide">VISA</span>
          )}
        </div>

        {/* Numéro */}
        <div className="relative">
          <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">{carte.type} · {carte.reseau}</p>
          <p className="font-mono text-lg sm:text-xl tracking-[0.12em]">{revealed ? carte.numero : carte.numeroMasque}</p>
        </div>

        {/* Titulaire / Expiration / CVV */}
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-white/50">Titulaire</p>
            <p className="text-sm font-medium tracking-wide truncate">{carte.titulaire || '—'}</p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-white/50">Expire</p>
            <p className="text-sm font-mono">{carte.expiration}</p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-white/50">CVV</p>
            <p className="text-sm font-mono">{revealed ? carte.cvv : '•••'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">Plafond {(carte.plafondMensuel || 0).toLocaleString('fr-MA')} DH/mois</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${carte.statut === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}>{carte.statut}</span>
      </div>
    </div>
  )
}

function Badge({ children, className }) {
  return <span className={`text-xs font-medium px-3 py-1 rounded-full ${className}`}>{children}</span>
}

function SectionTitle({ icon: Icon, title, small }) {
  return (
    <div className={`flex items-center gap-2 ${small ? 'mb-2' : 'mb-4'} text-emerald-600 dark:text-emerald-400`}>
      <Icon size={small ? 15 : 18} />
      <h2 className={`font-semibold text-slate-900 dark:text-white ${small ? 'text-sm' : ''}`}>{title}</h2>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

function RiskTile({ label, value, danger }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>{value ?? '—'}</p>
    </div>
  )
}

export default Profil
