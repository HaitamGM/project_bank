import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Database, Layers, Quote } from 'lucide-react'
import { useDocuments } from '../hooks/useClient'

const TYPE_COLORS = {
  Politique: 'bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400',
  Réglementation: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400',
  Procédure: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400',
  Sécurité: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
}

export default function Documents() {
  const { data: documents, isLoading } = useDocuments()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Tous')

  const categories = useMemo(() => ['Tous', ...new Set((documents || []).map((d) => d.categorie).filter(Boolean))], [documents])
  const filtered = useMemo(() => {
    if (!documents) return []
    const term = q.trim().toLowerCase()
    return documents.filter((d) =>
      (cat === 'Tous' || d.categorie === cat) &&
      (!term || `${d.titre} ${d.extrait || ''}`.toLowerCase().includes(term)),
    )
  }, [documents, q, cat])

  if (isLoading || !documents) return <div className="p-8 text-slate-400">Chargement…</div>
  const totalFragments = documents.reduce((s, d) => s + (d.nombreFragments || 0), 0)

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1"><Database size={18} /><span className="text-xs font-semibold uppercase tracking-wider">Base RAG</span></div>
        <h1 className="text-2xl font-bold tracking-tight">Base documentaire</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{documents.length} documents indexés · {totalFragments.toLocaleString('fr-MA')} fragments vectorisés — les sources que l'IA consulte pour décider.</p>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans la base…"
            className="w-full ps-11 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-500/20 outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${cat === c ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((doc, i) => (
          <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"><FileText size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{doc.titre}</p>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 px-2.5 py-1 rounded-full shrink-0">{doc.statut || 'Indexé'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                  {doc.type && <span className={`px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[doc.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{doc.type}</span>}
                  {doc.categorie && <span>{doc.categorie}</span>}
                  <span className="flex items-center gap-1"><Layers size={12} /> {doc.nombreFragments} fragments</span>
                  {doc.dateIndexation && <span>· indexé le {doc.dateIndexation}</span>}
                </div>
                {doc.extrait && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-3 flex gap-1.5">
                    <Quote size={14} className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" /><span className="italic">{doc.extrait}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Aucun document ne correspond à votre recherche.</p>}
      </div>
    </div>
  )
}
