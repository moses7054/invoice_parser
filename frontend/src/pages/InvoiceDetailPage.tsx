import React, { useEffect, useState } from 'react'
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

function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null
  const isAnthropic = provider.includes('anthropic') || provider.includes('claude')
  const label = isAnthropic ? 'Claude' : 'GPT-4o'
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isAnthropic ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
      {label}
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 font-semibold text-sm text-slate-700">{title}</div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, value, bold }: { label: string; value?: string | number | null; bold?: boolean }) {
  if (value == null || value === '') return null
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-40 shrink-0">{label}</span>
      <span className={bold ? 'font-bold text-slate-900 text-base' : 'text-slate-700'}>{String(value)}</span>
    </div>
  )
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center bg-slate-50 border-b border-slate-200 px-4 py-2.5 font-semibold text-sm text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`${API_URL}/invoices/${id}`)
      .then((r) => { if (r.status === 404) throw new Error('Invoice not found.'); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data: Invoice) => { setInvoice(data); setLoading(false) })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false) })
  }, [id])

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/invoices')}
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
      >
        ← Back to Invoices
      </button>

      {loading && (
        <div className="flex items-center gap-3 text-slate-500 py-8">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          Loading invoice…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {!loading && !error && invoice && (
        <>
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-5 flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Invoice</p>
              <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number ?? invoice.id}</h1>
              <p className="text-slate-500 mt-1">{invoice.vendor_name}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <ProviderBadge provider={invoice.llm_provider} />
              {invoice.total_amount != null && (
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {invoice.currency} {invoice.total_amount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Vendor Information">
              <Field label="Vendor Name" value={invoice.vendor_name} />
              <Field label="Vendor Address" value={invoice.vendor_address} />
              <Field label="Bill To" value={invoice.bill_to} />
            </Card>
            <Card title="Invoice Details">
              <Field label="Invoice Number" value={invoice.invoice_number} />
              <Field label="PO Number" value={invoice.purchase_order_number} />
              <Field label="Invoice Date" value={invoice.invoice_date} />
              <Field label="Due Date" value={invoice.due_date} />
              <Field label="Payment Terms" value={invoice.payment_terms} />
            </Card>
          </div>

          <Card title="Amounts">
            <Field label="Currency" value={invoice.currency} />
            <Field label="Subtotal" value={invoice.subtotal} />
            <Field label="Tax Rate" value={invoice.tax_rate != null ? `${(invoice.tax_rate * 100).toFixed(1)}%` : null} />
            <Field label="Tax Amount" value={invoice.tax_amount} />
            <Field label="Total Amount" value={invoice.total_amount != null ? `${invoice.currency} ${invoice.total_amount}` : null} bold />
          </Card>

          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 font-semibold text-sm text-slate-700">
                Line Items
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-2.5 font-medium">Description</th>
                    <th className="px-4 py-2.5 font-medium">Qty</th>
                    <th className="px-4 py-2.5 font-medium">Unit Price</th>
                    <th className="px-4 py-2.5 font-medium">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Currency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.line_items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">{item.description ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.quantity ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.unit_price ?? '—'}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{item.amount ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.currency ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invoice.raw_text && (
            <Collapsible title="Raw Extracted Text">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">{invoice.raw_text}</pre>
            </Collapsible>
          )}

          {invoice.metadata && Object.keys(invoice.metadata).length > 0 && (
            <Collapsible title="Metadata (extra fields)">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">{JSON.stringify(invoice.metadata, null, 2)}</pre>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}
