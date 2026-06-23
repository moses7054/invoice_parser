import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProvider } from '../context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

interface LineItem {
  id?: string
  description?: string
  quantity?: number
  unit_price?: number
  amount?: number
  currency?: string
}

interface InvoiceResult {
  id?: string
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
  llm_provider?: string
  line_items?: LineItem[]
}

interface SampleInvoice {
  filename: string
  display_name: string
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function UploadPage() {
  const navigate = useNavigate()
  const { provider } = useProvider()
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [sampleInvoices, setSampleInvoices] = useState<SampleInvoice[]>([])
  const [uploadingSample, setUploadingSample] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/sample-invoices`)
      .then((r) => r.json())
      .then((data: SampleInvoice[]) => setSampleInvoices(data))
      .catch(() => {})
  }, [])

  const handleInvoiceSuccess = useCallback(
    (data: InvoiceResult) => {
      if (data.id) navigate(`/invoices/${data.id}`)
      else { setInvoice(data); setUploadState('success') }
    },
    [navigate],
  )

  const processFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg(`Unsupported file type. Please upload a PDF, JPEG, or PNG.`)
      setUploadState('error')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`)
      setUploadState('error')
      return
    }
    setUploadState('uploading')
    setErrorMsg('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('llm_provider', provider)
    try {
      const res = await fetch(`${API_URL}/invoices/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? `HTTP ${res.status}`)
      }
      handleInvoiceSuccess(await res.json())
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed.')
      setUploadState('error')
    }
  }, [handleInvoiceSuccess, provider])

  const handleSampleUpload = useCallback(async (filename: string) => {
    setUploadingSample(filename)
    setUploadState('uploading')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/invoices/upload-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_filename: filename, llm_provider: provider }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? `HTTP ${res.status}`)
      }
      handleInvoiceSuccess(await res.json())
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sample upload failed.')
      setUploadState('error')
    } finally {
      setUploadingSample(null)
    }
  }, [handleInvoiceSuccess, provider])

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Invoice</h1>
        <p className="text-slate-500 mt-1">Upload a PDF or image to extract structured data with AI.</p>
      </div>

      {/* Drop zone */}
      {uploadState !== 'success' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById('file-input')?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="font-semibold text-slate-700">
            Drag & drop an invoice, or{' '}
            <span className="text-blue-600 underline">click to browse</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">PDF, JPEG, PNG — max 10 MB</p>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
          />
        </div>
      )}

      {/* Sample invoices */}
      {uploadState !== 'success' && sampleInvoices.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Or try a sample invoice
          </h2>
          <div className="space-y-2">
            {sampleInvoices.map((s) => (
              <div
                key={s.filename}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm"
              >
                <div>
                  <div className="font-medium text-slate-800">{s.display_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.filename}</div>
                </div>
                <button
                  onClick={() => handleSampleUpload(s.filename)}
                  disabled={uploadState === 'uploading'}
                  className="px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingSample === s.filename ? 'Uploading…' : 'Use sample'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spinner */}
      {uploadState === 'uploading' && (
        <div className="flex flex-col items-center py-12 text-slate-500">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p>Extracting invoice data…</p>
        </div>
      )}

      {/* Error */}
      {uploadState === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{errorMsg}</p>
          <button
            onClick={() => { setUploadState('idle'); setErrorMsg('') }}
            className="mt-3 text-sm text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Inline success fallback */}
      {uploadState === 'success' && invoice && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Extracted Invoice</h2>
            <button
              onClick={() => { setUploadState('idle'); setInvoice(null) }}
              className="text-sm text-slate-500 underline"
            >
              Upload another
            </button>
          </div>
          <Card title="Vendor">
            <Field label="Name" value={invoice.vendor_name} />
            <Field label="Address" value={invoice.vendor_address} />
            <Field label="Bill To" value={invoice.bill_to} />
          </Card>
          <Card title="Amounts">
            <Field label="Total" value={invoice.total_amount != null ? `${invoice.currency} ${invoice.total_amount}` : undefined} bold />
            <Field label="Subtotal" value={invoice.subtotal?.toString()} />
            <Field label="Tax" value={invoice.tax_amount?.toString()} />
          </Card>
          {invoice.line_items && invoice.line_items.length > 0 && (
            <Card title="Line Items">
              <LineItemsTable items={invoice.line_items} />
            </Card>
          )}
        </div>
      )}
    </div>
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

function Field({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-32 shrink-0">{label}</span>
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{value}</span>
    </div>
  )
}

function LineItemsTable({ items }: { items: { description?: string; quantity?: number; unit_price?: number; amount?: number; currency?: string }[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500 border-b border-slate-100">
          {['Description', 'Qty', 'Unit Price', 'Amount'].map((h) => (
            <th key={h} className="pb-2 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i} className="border-b border-slate-50 last:border-0">
            <td className="py-2 text-slate-700">{item.description ?? '—'}</td>
            <td className="py-2 text-slate-500">{item.quantity ?? '—'}</td>
            <td className="py-2 text-slate-500">{item.unit_price ?? '—'}</td>
            <td className="py-2 font-medium text-slate-700">{item.amount ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
