import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, TrendingUp, FileText, DollarSign, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface InvoiceSummary {
  id: string
  vendor_name?: string
  invoice_date?: string
  total_amount?: number
  currency?: string
  llm_provider?: string
}

function providerInfo(p?: string) {
  if (!p) return { label: '—', cls: 'bg-slate-100 text-slate-500' }
  if (p.includes('anthropic') || p.includes('claude'))
    return { label: 'Claude', cls: 'bg-orange-100 text-orange-700' }
  return { label: 'GPT-4o', cls: 'bg-green-100 text-green-700' }
}

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API_URL}/invoices`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d: InvoiceSummary[]) => { setInvoices(d); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Failed to load.'); setLoading(false) })
  }, [])

  const total = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const currencies = [...new Set(invoices.map(i => i.currency).filter(Boolean))]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">All processed invoices</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary">
          <Plus size={15} /> Upload New
        </button>
      </div>

      {/* Stats */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: FileText, label: 'Total Invoices', value: invoices.length.toString(), color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { icon: DollarSign, label: 'Combined Value', value: total.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: TrendingUp, label: 'Currencies', value: currencies.join(', ') || '—', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="card p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <div className="text-xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-slate-500 py-12 justify-center">
          <Loader2 size={18} className="animate-spin text-indigo-500" />
          <span className="text-sm">Loading invoices…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="card text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-700 text-lg">No invoices yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">Upload your first invoice to get started</p>
          <button onClick={() => navigate('/')} className="btn-primary mx-auto">
            <Plus size={15} /> Upload Invoice
          </button>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Currency</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const pi = providerInfo(inv.llm_provider)
                return (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-slate-50 cursor-pointer group transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <FileText size={14} className="text-indigo-400" />
                        </div>
                        <span className="font-medium text-slate-900 text-sm">{inv.vendor_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{inv.invoice_date ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">
                      {inv.total_amount != null ? inv.total_amount.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{inv.currency ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pi.cls}`}>{pi.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
