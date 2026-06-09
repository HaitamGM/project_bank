import { useDocuments } from '../hooks/useClient'
import { FileText } from 'lucide-react'

function Documents() {
  const { data: documents, isLoading } = useDocuments()

  if (isLoading) return <div className="p-8 text-slate-400">Chargement…</div>

  const totalChunks = documents.reduce((s, d) => s + d.chunks, 0)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Base documentaire (RAG)</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {documents.length} documents indexés · {totalChunks} fragments vectorisés
        </p>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{doc.titre}</p>
              <p className="text-sm text-slate-400 mt-0.5">{doc.type} · {doc.chunks} fragments · indexé le {doc.dateIndex}</p>
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 px-2.5 py-1 rounded-full flex-shrink-0">Indexé</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Documents