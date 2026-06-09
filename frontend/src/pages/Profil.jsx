import { User, Briefcase, CreditCard, Shield } from 'lucide-react'
import { useClient } from '../hooks/useClient'

function Profil() {
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: client, isLoading } = useClient(clientId)

  if (isLoading) return <div className="p-8 text-slate-400">Chargement…</div>

  const { personnel, professionnel, bancaire, risque } = client
  const card = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold">
          {personnel.prenom[0]}{personnel.nom[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{personnel.prenom} {personnel.nom}</h1>
          <p className="text-slate-500 dark:text-slate-400">Client {client.id} · {bancaire.segment}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={card}>
          <SectionTitle icon={User} title="Informations personnelles" />
          <Field label="CIN" value={personnel.cin} />
          <Field label="Date de naissance" value={personnel.dateNaissance} />
          <Field label="Téléphone" value={personnel.telephone} />
          <Field label="Email" value={personnel.email} />
          <Field label="Ville" value={personnel.ville} />
          <Field label="Situation" value={personnel.situationFamiliale} />
        </div>

        <div className={card}>
          <SectionTitle icon={Briefcase} title="Situation professionnelle" />
          <Field label="Profession" value={professionnel.profession} />
          <Field label="Employeur" value={professionnel.employeur} />
          <Field label="Contrat" value={professionnel.typeContrat} />
          <Field label="Ancienneté" value={`${professionnel.ancienneteMois} mois`} />
          <Field label="Revenu mensuel" value={`${professionnel.revenuMensuel.toLocaleString('fr-MA')} MAD`} />
          <Field label="Secteur" value={professionnel.secteur} />
        </div>

        <div className={card}>
          <SectionTitle icon={CreditCard} title="Profil bancaire" />
          <Field label="Client depuis" value={bancaire.clientDepuis} />
          <Field label="Segment" value={bancaire.segment} />
          <Field label="Score interne" value={`${bancaire.scoreInterne}/100`} />
          <Field label="Nombre de comptes" value={bancaire.comptes.length} />
        </div>

        <div className={card}>
          <SectionTitle icon={Shield} title="Évaluation du risque" />
          <Field label="Incidents de paiement (12 mois)" value={risque.incidentsPaiement} />
          <Field label="Fichage BAM" value={risque.fichageBam ? 'Oui' : 'Non'} />
          <Field label="Taux d'endettement" value={`${(risque.tauxEndettement * 100).toFixed(0)}%`} />
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
      <Icon size={18} />
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default Profil