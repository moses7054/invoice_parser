import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Sparkles, FileText, Image, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { useProvider } from '../context/ProviderContext'
import { API_URL } from '../api/config'
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

interface SampleInvoice { filename: string; display_name: string }
type UploadState = 'idle' | 'uploading' | 'error'

const FEATURES = [
  { icon: FileText, label: 'PDF & images', desc: 'Any invoice format' },
  { icon: Sparkles, label: 'AI extraction', desc: 'Claude or GPT-4o' },
  { icon: Zap, label: 'Instant results', desc: 'Structured data in seconds' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const { provider } = useProvider()
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const [samples, setSamples] = useState<SampleInvoice[]>([])
  const [uploadingSample, setUploadingSample] = useState<string | null>(null)
  const [processingFile, setProcessingFile] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/sample-invoices`).then(r => r.json()).then(setSamples).catch(() => {})
  }, [])

  const onSuccess = useCallback((data: { id?: string }) => {
    if (data.id) navigate(`/invoices/${data.id}`)
  }, [navigate])

  const processFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Unsupported format. Upload a PDF, JPEG, or PNG.')
      setState('error')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`)
      setState('error')
      return
    }
    setState('uploading')
    setProcessingFile(file.name)
    const form = new FormData()
    form.append('file', file)
    form.append('llm_provider', provider)
    try {
      const res = await fetch(`${API_URL}/invoices/upload`, { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail ?? `HTTP ${res.status}`) }
      onSuccess(await res.json())
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed.')
      setState('error')
    }
  }, [provider, onSuccess])

  const uploadSample = useCallback(async (filename: string) => {
    setUploadingSample(filename)
    setState('uploading')
    setProcessingFile(filename)
    try {
      const res = await fetch(`${API_URL}/invoices/upload-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_filename: filename, llm_provider: provider }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail ?? `HTTP ${res.status}`) }
      onSuccess(await res.json())
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed.')
      setState('error')
    } finally { setUploadingSample(null) }
  }, [provider, onSuccess])

  const reset = () => { setState('idle'); setErrorMsg(''); setProcessingFile(null) }

  if (state === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-6">
          <Loader2 size={28} className="text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Extracting invoice data…</h2>
        <p className="text-slate-500 text-sm">{processingFile}</p>
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI is reading and structuring your document
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero */}
      <div className="text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <Sparkles size={12} />
          AI-Powered Document Extraction
        </div>
        <h1 className="text-4xl font-bold mb-3">
          <span className="gradient-text">Extract invoice data</span>
          <br />
          <span className="text-slate-800">in seconds</span>
        </h1>
        <p className="text-slate-500 max-w-md mx-auto">
          Upload any PDF or image invoice. Claude or GPT-4o extracts vendor info, line items, totals, and more — automatically.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex justify-center gap-3 flex-wrap">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Icon size={14} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">{label}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-12 text-center ${
          dragging
            ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-indigo-100' : 'bg-slate-100'}`}>
            <Upload size={24} className={dragging ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div>
            <p className="font-semibold text-slate-800">
              Drop your invoice here, or{' '}
              <span className="text-indigo-600">browse files</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">PDF, JPEG, PNG up to 10 MB</p>
          </div>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
      </div>

      {/* Error */}
      {state === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between animate-fade-up">
          <div>
            <p className="text-sm font-semibold text-red-700">Upload failed</p>
            <p className="text-sm text-red-600 mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={reset} className="text-xs text-red-500 underline ml-4 shrink-0">Dismiss</button>
        </div>
      )}

      {/* Sample invoices */}
      {samples.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Or try a sample</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {samples.map((s) => {
              const isImg = s.filename.match(/\.(jpg|jpeg|png)$/i)
              return (
                <button
                  key={s.filename}
                  onClick={() => uploadSample(s.filename)}
                  disabled={!!uploadingSample}
                  className="group text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                      {isImg
                        ? <Image size={16} className="text-slate-400 group-hover:text-indigo-500" />
                        : <FileText size={16} className="text-slate-400 group-hover:text-indigo-500" />}
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>
                  <div className="font-medium text-slate-800 text-sm">{s.display_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.filename}</div>
                  {uploadingSample === s.filename && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-600">
                      <Loader2 size={10} className="animate-spin" /> Processing…
                    </div>
                  )}

                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
