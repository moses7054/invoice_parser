import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface InvoiceSummary {
  id: string
  vendor_name?: string
  invoice_date?: string
  total_amount?: number
  currency?: string
  llm_provider?: string
}

function providerLabel(p?: string) {
  if (!p) return '—'
  if (p.includes('anthropic') || p.includes('claude')) return 'Claude'
  if (p.includes('openai') || p.includes('gpt')) return 'GPT-4o'
  return p
}

function ProviderBadge({ provider }: { provider?: string }) {
  const label = providerLabel(provider)
  const cls =
    label === 'Claude'
      ? 'bg-blue-100 text-blue-700'
      : label === 'GPT-4o'
      ? 'bg-green-100 text-green-700'
      : 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API_URL}/invoices`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data: InvoiceSummary[]) => { setInvoices(data); setLoading(false) })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false) })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} processed</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Upload New
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-500 py-8">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          Loading invoices…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-600 font-medium">No invoices yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload your first invoice to get started</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Upload Invoice
          </button>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500 font-medium">
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.vendor_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.invoice_date ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {inv.total_amount != null ? inv.total_amount.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{inv.currency ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ProviderBadge provider={inv.llm_provider} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
