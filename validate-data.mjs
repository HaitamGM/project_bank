// Validateur jetable — vérifie l'intégrité du dossier data/ contre le moteur scoring.js réel.
import { readFileSync } from 'node:fs'
import { scoreCredit } from './frontend/src/services/scoring.js'

const read = (f) => JSON.parse(readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8'))

const clients = read('clients.json')
const transactions = read('transactions.json')
const decisions = read('decisions.json')
const documents = read('documents.json')
const xai = read('explainability.json')
const analytics = read('analytics.json')
const agents = read('agents.json')
const pipelines = read('pipeline-runs.json')

const errors = []
const notes = []
const E = (m) => errors.push(m)
const ok = (m) => notes.push(`✓ ${m}`)

const clientById = new Map(clients.map((c) => [c.id, c]))
const docById = new Map(documents.map((d) => [d.id, d]))
const agentIds = new Set([...agents.map((a) => a.id), 'client'])
const decisionById = new Map()
for (const [cid, list] of Object.entries(decisions)) for (const d of list) decisionById.set(d.id, { ...d, _key: cid })

// 1) Unicité des id clients + champs requis
const seenClients = new Set()
for (const c of clients) {
  if (seenClients.has(c.id)) E(`Client en double : ${c.id}`)
  seenClients.add(c.id)
  for (const k of ['personnel', 'professionnel', 'bancaire', 'risque'])
    if (!c[k]) E(`Client ${c.id} : section « ${k} » manquante`)
}
ok(`${clients.length} clients, id uniques`)

// 2) transactions : clés connues
for (const cid of Object.keys(transactions))
  if (!clientById.has(cid)) E(`transactions.json : client inconnu ${cid}`)
ok(`transactions pour ${Object.keys(transactions).length} clients`)

// 3) decisions : clé == clientId, client existant, score recalculé via scoring.js
for (const [cid, list] of Object.entries(decisions)) {
  if (!clientById.has(cid)) { E(`decisions.json : client inconnu ${cid}`); continue }
  const c = clientById.get(cid)
  for (const d of list) {
    if (d.clientId !== cid) E(`${d.id} : clientId ${d.clientId} ≠ clé ${cid}`)
    const isCredit = d.type === 'credit_immobilier' || d.type === 'credit_consommation'
    if (isCredit) {
      const r = scoreCredit({
        revenuMensuel: c.professionnel.revenuMensuel,
        montant: d.montant,
        dureeMois: d.dureeMois,
        autresCharges: d.autresCharges,
        ancienneteMois: c.professionnel.ancienneteMois,
        incidentsPaiement: c.risque.incidentsPaiement,
        fichageBam: c.risque.fichageBam,
      })
      if (Math.abs(r.score - d.score) > 1)
        E(`${d.id} : score déclaré ${d.score} ≠ moteur ${r.score} (écart > 1)`)
      if (r.decision !== d.statut)
        E(`${d.id} : statut « ${d.statut} » ≠ moteur « ${r.decision} » (score ${r.score})`)
      ok(`${d.id} ${c.personnel.prenom} : moteur=${r.score} (${r.decision}, endettement ${(r.tauxEndettement * 100).toFixed(0)} %), déclaré=${d.score} ${d.statut}`)
    } else if (d.type === 'virement') {
      if (!['execute', 'refuse'].includes(d.statut)) E(`${d.id} : statut virement invalide « ${d.statut} »`)
    } else E(`${d.id} : type inconnu « ${d.type} »`)
  }
}

// 4) explainability : decision connue, sources adossées aux documents
for (const [did, x] of Object.entries(xai)) {
  if (!decisionById.has(did)) E(`explainability ${did} : décision inconnue`)
  for (const s of x.sources) {
    const doc = docById.get(s.docId)
    if (!doc) { E(`${did} : source docId inconnu ${s.docId}`); continue }
    if (doc.titre !== s.titre) E(`${did} : titre source ≠ document (${s.docId})`)
    if (!doc.extraits.some((e) => e.texte === s.extrait)) E(`${did} : extrait introuvable dans ${s.docId} : "${s.extrait.slice(0, 40)}…"`)
  }
  const sum = x.scoreBase + x.features.reduce((a, f) => a + f.impact, 0)
  if (sum !== x.score) E(`${did} : Σ(base ${x.scoreBase} + features) = ${sum} ≠ score ${x.score}`)
  ok(`explainability ${did} : Σ features = ${sum} = score, ${x.sources.length} sources adossées`)
}

// 5) pipeline-runs : decision connue, agents connus, offsets croissants
for (const [did, p] of Object.entries(pipelines)) {
  if (!decisionById.has(did)) E(`pipeline ${did} : décision inconnue`)
  let last = -1
  for (const ev of p.events) {
    if (!agentIds.has(ev.from)) E(`pipeline ${did} : agent inconnu (from) ${ev.from}`)
    if (!agentIds.has(ev.to)) E(`pipeline ${did} : agent inconnu (to) ${ev.to}`)
    if (ev.t < last) E(`pipeline ${did} : offset ${ev.t} non croissant`)
    last = ev.t
  }
  if (p.events.at(-1).t > p.totalMs) E(`pipeline ${did} : dernier offset > totalMs`)
  ok(`pipeline ${did} : ${p.events.length} événements, ${agents.length} agents tous connus`)
}

// 6) analytics : les agrégats bouclent
const totApprouve = analytics.parMois.reduce((a, m) => a + m.approuve, 0)
const totRefuse = analytics.parMois.reduce((a, m) => a + m.refuse, 0)
const totMois = totApprouve + totRefuse
const sumType = analytics.parType.reduce((a, t) => a + t.count, 0)
const sumDist = analytics.scoreDistribution.reduce((a, b) => a + b.count, 0)
const sumMotifs = analytics.motifsRefus.reduce((a, b) => a + b.count, 0)
const sumMontant = analytics.parType.reduce((a, t) => a + t.montant, 0)
if (sumType !== analytics.kpis.totalDecisions) E(`analytics : Σ parType ${sumType} ≠ totalDecisions ${analytics.kpis.totalDecisions}`)
if (sumDist !== analytics.kpis.totalDecisions) E(`analytics : Σ scoreDistribution ${sumDist} ≠ totalDecisions`)
if (totMois !== analytics.kpis.totalDecisions) E(`analytics : Σ parMois ${totMois} ≠ totalDecisions`)
if (sumMotifs !== totRefuse) E(`analytics : Σ motifsRefus ${sumMotifs} ≠ refus ${totRefuse}`)
if (sumMontant !== analytics.kpis.montantOctroye) E(`analytics : Σ montants parType ${sumMontant} ≠ montantOctroye`)
if (Math.abs(totApprouve / totMois - analytics.kpis.tauxApprobation) > 0.01) E(`analytics : tauxApprobation ${analytics.kpis.tauxApprobation} ≠ ${(totApprouve / totMois).toFixed(3)}`)
ok(`analytics : parType=${sumType}, distribution=${sumDist}, parMois=${totMois}, motifs=${sumMotifs}=refus, montants=${(sumMontant / 1e6).toFixed(1)}M, approbation=${(totApprouve / totMois).toFixed(2)}`)

console.log('\n' + notes.join('\n'))
console.log('\n' + '─'.repeat(60))
if (errors.length) {
  console.log(`❌ ${errors.length} ERREUR(S) :`)
  for (const e of errors) console.log('   • ' + e)
  process.exit(1)
} else {
  console.log('✅ ZÉRO ERREUR — data/ cohérent avec scoring.js, cross-références et agrégats valides.')
}
