// Tooltip recharts personnalisé (rendu HTML → respecte le thème clair/sombre via Tailwind).
// La palette et les réglages d'axes vivent dans ../lib/chartTheme.js.

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      {label != null && (
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color || p.fill }} />
            <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
            <span className="ms-auto font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatter ? formatter(p.value, p) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
