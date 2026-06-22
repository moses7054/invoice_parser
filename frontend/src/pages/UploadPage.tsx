import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

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

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function UploadPage() {
  const navigate = useNavigate()
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null)
  const [dragging, setDragging] = useState(false)

  const processFile = useCallback(async (file: File) => {
    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg(`Unsupported file type "${file.type}". Please upload a PDF, JPEG, or PNG.`)
      setUploadState('error')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`)
      setUploadState('error')
      return
    }

    setUploadState('uploading')
    setErrorMsg('')
    setInvoice(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('llm_provider', 'anthropic')

    try {
      const res = await fetch(`${API_URL}/invoices/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(errBody.detail ?? `HTTP ${res.status}`)
      }

      const data: InvoiceResult = await res.json()
      setInvoice(data)
      setUploadState('success')
      if (data.id) {
        navigate(`/invoices/${data.id}`)
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploadState('error')
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const reset = () => {
    setUploadState('idle')
    setErrorMsg('')
    setInvoice(null)
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 8 }}>Invoice Parser</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Upload a PDF or image invoice to extract structured data.</p>

      {/* Drop zone */}
      {uploadState !== 'success' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${dragging ? '#0066ff' : '#ccc'}`,
            borderRadius: 8,
            padding: '48px 24px',
            textAlign: 'center',
            background: dragging ? '#f0f5ff' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            Drag &amp; drop an invoice here, or <span style={{ color: '#0066ff', textDecoration: 'underline' }}>click to browse</span>
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#888' }}>PDF, JPEG, PNG — max 10 MB</p>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* Spinner */}
      {uploadState === 'uploading' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '4px solid #eee',
              borderTop: '4px solid #0066ff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#555' }}>Extracting invoice data…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {uploadState === 'error' && (
        <div style={{ marginTop: 24, padding: '16px 20px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8 }}>
          <strong style={{ color: '#cc0000' }}>Error: </strong>
          <span style={{ color: '#cc0000' }}>{errorMsg}</span>
          <br />
          <button
            onClick={reset}
            style={{ marginTop: 12, padding: '6px 16px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Success results */}
      {uploadState === 'success' && invoice && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Extracted Invoice</h2>
            <button
              onClick={reset}
              style={{ padding: '6px 16px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' }}
            >
              Upload another
            </button>
          </div>

          {/* Vendor info */}
          <Section title="Vendor Information">
            <Field label="Vendor" value={invoice.vendor_name} />
            <Field label="Address" value={invoice.vendor_address} />
            <Field label="Bill To" value={invoice.bill_to} />
          </Section>

          {/* Invoice details */}
          <Section title="Invoice Details">
            <Field label="Invoice Number" value={invoice.invoice_number} />
            <Field label="PO Number" value={invoice.purchase_order_number} />
            <Field label="Invoice Date" value={invoice.invoice_date} />
            <Field label="Due Date" value={invoice.due_date} />
            <Field label="Payment Terms" value={invoice.payment_terms} />
          </Section>

          {/* Amounts */}
          <Section title="Amounts">
            <Field label="Currency" value={invoice.currency} />
            <Field label="Subtotal" value={invoice.subtotal != null ? String(invoice.subtotal) : undefined} />
            <Field label="Tax Rate" value={invoice.tax_rate != null ? `${(invoice.tax_rate * 100).toFixed(1)}%` : undefined} />
            <Field label="Tax Amount" value={invoice.tax_amount != null ? String(invoice.tax_amount) : undefined} />
            <Field
              label="Total Amount"
              value={invoice.total_amount != null ? `${invoice.currency ?? ''} ${invoice.total_amount}` : undefined}
              bold
            />
          </Section>

          {/* Line items */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <Section title="Line Items">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {['Description', 'Qty', 'Unit Price', 'Amount', 'Currency'].map((h) => (
                      <th
                        key={h}
                        style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 600 }}
                      >
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
        </div>
      )}
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

function Field({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', marginBottom: 8, gap: 8 }}>
      <span style={{ color: '#666', minWidth: 140, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}
