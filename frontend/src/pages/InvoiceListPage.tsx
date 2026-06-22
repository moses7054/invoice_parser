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

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API_URL}/invoices`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: InvoiceSummary[]) => {
        setInvoices(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load invoices.')
        setLoading(false)
      })
  }, [])

  const providerLabel = (provider?: string) => {
    if (!provider) return '—'
    if (provider.toLowerCase().includes('anthropic') || provider.toLowerCase().includes('claude')) return 'Claude'
    if (provider.toLowerCase().includes('openai') || provider.toLowerCase().includes('gpt')) return 'GPT-4o'
    return provider
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Invoices</h1>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '8px 18px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}
        >
          Upload New
        </button>
      </div>

      {loading && (
        <p style={{ color: '#666' }}>Loading…</p>
      )}

      {error && (
        <div style={{ padding: '16px 20px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8, color: '#cc0000' }}>
          {error}
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
          <p style={{ fontSize: 16 }}>No invoices yet. Upload one to get started.</p>
          <button
            onClick={() => navigate('/')}
            style={{ marginTop: 12, padding: '8px 20px', cursor: 'pointer', borderRadius: 4, border: '1px solid #0066ff', color: '#0066ff', background: '#fff' }}
          >
            Upload Invoice
          </button>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['Vendor', 'Date', 'Total', 'Currency', 'LLM Provider'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '10px 14px' }}>{inv.vendor_name ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}>{inv.invoice_date ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}>{inv.total_amount != null ? inv.total_amount.toLocaleString() : '—'}</td>
                <td style={{ padding: '10px 14px' }}>{inv.currency ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}>{providerLabel(inv.llm_provider)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
