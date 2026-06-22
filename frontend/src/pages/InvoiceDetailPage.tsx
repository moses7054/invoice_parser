import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface LineItem {
  id?: string
  description?: string
  quantity?: number
  unit_price?: number
  amount?: number
  currency?: string
}

interface Invoice {
  id: string
  invoice_number?: string
  vendor_name?: string
  vendor_address?: string
  bill_to?: string
  invoice_date?: string
  due_date?: string
  subtotal?: number
  tax_amount?: number
  tax_rate?: number
  total_amount?: number
  currency?: string
  payment_terms?: string
  purchase_order_number?: string
  raw_text?: string
  metadata?: Record<string, unknown>
  llm_provider?: string
  line_items?: LineItem[]
}

function providerBadge(provider?: string) {
  if (!provider) return null
  const label =
    provider.toLowerCase().includes('anthropic') || provider.toLowerCase().includes('claude')
      ? 'Claude'
      : provider.toLowerCase().includes('openai') || provider.toLowerCase().includes('gpt')
      ? 'GPT-4o'
      : provider

  const bg = label === 'Claude' ? '#d4e8ff' : label === 'GPT-4o' ? '#d4f7d4' : '#eee'
  const color = label === 'Claude' ? '#0044aa' : label === 'GPT-4o' ? '#006600' : '#333'

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        background: bg,
        color,
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {label}
    </span>
  )
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'flex', marginBottom: 8, gap: 8 }}>
      <span style={{ color: '#666', minWidth: 180, flexShrink: 0 }}>{label}:</span>
      <span>{String(value)}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: '#f5f5f5', padding: '10px 16px', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 24, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: '#f5f5f5',
          padding: '10px 16px',
          fontWeight: 600,
          borderBottom: open ? '1px solid #e0e0e0' : 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 14,
        }}
      >
        <span>{title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!id) return
    fetch(`${API_URL}/invoices/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error('Invoice not found.')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: Invoice) => {
        setInvoice(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load invoice.')
        setLoading(false)
      })
  }, [id])

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <button
        onClick={() => navigate('/invoices')}
        style={{ marginBottom: 24, padding: '6px 14px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}
      >
        ← Back to Invoices
      </button>

      {loading && <p style={{ color: '#666' }}>Loading…</p>}

      {error && (
        <div style={{ padding: '16px 20px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8, color: '#cc0000' }}>
          {error}
        </div>
      )}

      {!loading && !error && invoice && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ margin: 0 }}>Invoice {invoice.invoice_number ?? invoice.id}</h1>
            {providerBadge(invoice.llm_provider)}
          </div>

          <Section title="Vendor Information">
            <Field label="Vendor Name" value={invoice.vendor_name} />
            <Field label="Vendor Address" value={invoice.vendor_address} />
            <Field label="Bill To" value={invoice.bill_to} />
          </Section>

          <Section title="Invoice Details">
            <Field label="Invoice Number" value={invoice.invoice_number} />
            <Field label="PO Number" value={invoice.purchase_order_number} />
            <Field label="Invoice Date" value={invoice.invoice_date} />
            <Field label="Due Date" value={invoice.due_date} />
            <Field label="Payment Terms" value={invoice.payment_terms} />
          </Section>

          <Section title="Amounts">
            <Field label="Currency" value={invoice.currency} />
            <Field label="Subtotal" value={invoice.subtotal} />
            <Field label="Tax Rate" value={invoice.tax_rate != null ? `${(invoice.tax_rate * 100).toFixed(1)}%` : undefined} />
            <Field label="Tax Amount" value={invoice.tax_amount} />
            <Field label="Total Amount" value={invoice.total_amount != null ? `${invoice.currency ?? ''} ${invoice.total_amount}` : undefined} />
          </Section>

          {invoice.line_items && invoice.line_items.length > 0 && (
            <Section title="Line Items">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {['Description', 'Qty', 'Unit Price', 'Amount', 'Currency'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 12px' }}>{item.description ?? '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{item.quantity ?? '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{item.unit_price ?? '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{item.amount ?? '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{item.currency ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {invoice.raw_text && (
            <Collapsible title="Raw Extracted Text">
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#333', margin: 0 }}>{invoice.raw_text}</pre>
            </Collapsible>
          )}

          {invoice.metadata && Object.keys(invoice.metadata).length > 0 && (
            <Collapsible title="Metadata (JSON)">
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#333', margin: 0 }}>
                {JSON.stringify(invoice.metadata, null, 2)}
              </pre>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}
