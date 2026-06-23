import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Building2, Calendar, Receipt, List, Loader2 } from 'lucide-react'

import { API_URL } from '../api/config'

interface LineItem {
  id?: string; description?: string; quantity?: number
  unit_price?: number; amount?: number; currency?: string
}
interface Invoice {
  id: string; invoice_number?: string; vendor_name?: string; vendor_address?: string
  bill_to?: string; invoice_date?: string; due_date?: string; subtotal?: number
  tax_amount?: number; tax_rate?: number; total_amount?: number; currency?: string
  payment_terms?: string; purchase_order_number?: string; raw_text?: string
  metadata?: Record<string, unknown>; llm_provider?: string; line_items?: LineItem[]
}

function ProviderChip({ p }: { p?: string }) {
  if (!p) return null
  const isC = p.includes('anthropic') || p.includes('claude')
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isC ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
      {isC ? 'Claude' : 'GPT-4o'}
    </span>
  )
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header"><Icon size={14} className="text-slate-400" />{title}</div>
      <div className="px-5 py-4 space-y-1">{children}</div>
    </div>
  )
}

function F({ label, value, big }: { label: string; value?: string | number | null; big?: boolean }) {
  if (value == null || value === '') return null
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <span className={big ? 'field-value font-bold text-lg text-slate-900' : 'field-value'}>{String(value)}</span>
    </div>
  )
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card">
      <button
        onClick={() => setOpen(o => !o)}
        className="card-header w-full justify-between hover:bg-slate-100 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
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
      .then(r => { if (r.status === 404) throw new Error('Invoice not found.'); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d: Invoice) => { setInvoice(d); setLoading(false) })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Failed.'); setLoading(false) })
  }, [id])

  return (
    <div className="space-y-5 animate-fade-up">
      <button onClick={() => navigate('/invoices')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back to Invoices
      </button>

      {loading && (
        <div className="flex items-center gap-3 text-slate-500 justify-center py-16">
          <Loader2 size={18} className="animate-spin text-indigo-500" />
          <span className="text-sm">Loading invoice…</span>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

      {!loading && !error && invoice && (
        <>
          {/* Hero card */}
          <div className="relative overflow-hidden card bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400 to-transparent" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">Invoice</p>
                <h1 className="text-2xl font-bold text-white">{invoice.invoice_number ?? id?.slice(0, 8)}</h1>
                <p className="text-slate-300 mt-1 text-sm">{invoice.vendor_name}</p>
                {invoice.invoice_date && (
                  <p className="text-slate-400 text-xs mt-1">Issued {invoice.invoice_date}</p>
                )}
              </div>
              <div className="text-right">
                <ProviderChip p={invoice.llm_provider} />
                {invoice.total_amount != null && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400">Total Due</p>
                    <p className="text-3xl font-bold text-white mt-0.5">
                      {invoice.currency} {invoice.total_amount.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={Building2} title="Vendor">
              <F label="Name" value={invoice.vendor_name} />
              <F label="Address" value={invoice.vendor_address} />
              <F label="Bill To" value={invoice.bill_to} />
            </Card>
            <Card icon={Calendar} title="Dates & Terms">
              <F label="Invoice Date" value={invoice.invoice_date} />
              <F label="Due Date" value={invoice.due_date} />
              <F label="Payment Terms" value={invoice.payment_terms} />
              <F label="PO Number" value={invoice.purchase_order_number} />
            </Card>
          </div>

          <Card icon={Receipt} title="Amounts">
            <F label="Subtotal" value={invoice.subtotal} />
            <F label="Tax Rate" value={invoice.tax_rate != null ? `${(invoice.tax_rate * 100).toFixed(1)}%` : null} />
            <F label="Tax Amount" value={invoice.tax_amount} />
            <F label="Total Amount" value={invoice.total_amount != null ? `${invoice.currency} ${invoice.total_amount.toLocaleString()}` : null} big />
          </Card>

          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="card overflow-hidden">
              <div className="card-header"><List size={14} className="text-slate-400" />Line Items ({invoice.line_items.length})</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoice.line_items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-700">{item.description ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{item.quantity ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{item.unit_price ?? '—'}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{item.amount ?? '—'} {item.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invoice.raw_text && (
            <Collapsible title="Raw Extracted Text">
              <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">{invoice.raw_text}</pre>
            </Collapsible>
          )}

          {invoice.metadata && Object.keys(invoice.metadata).length > 0 && (
            <Collapsible title="Extra Fields (Metadata)">
              <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{JSON.stringify(invoice.metadata, null, 2)}</pre>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}
