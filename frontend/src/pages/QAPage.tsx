import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProvider } from '../context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface QAResponse {
  answer: string
  mode: 'sql' | 'vector'
  sources: string[]
}

const EXAMPLE_QUESTIONS = [
  'What is the total amount across all invoices?',
  'How many invoices are in EUR?',
  'Find invoices related to construction services',
  'Show me invoices mentioning VAT',
]

export default function QAPage() {
  const { provider } = useProvider()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QAResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(q: string) {
    if (!q.trim()) return
    setQuestion(q)
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, llm_provider: provider }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Request failed: ${res.status}`)
      }
      setResult(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoice Q&A</h1>
        <p className="text-slate-500 mt-1">Ask anything about your invoices — structured or semantic questions.</p>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(question) }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your invoices…"
          className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {/* Example questions */}
      {!result && !loading && (
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spinner */}
      {loading && (
        <div className="flex flex-col items-center py-12 text-slate-500">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-3" />
          <p className="text-sm">Analysing invoices…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {/* Mode badge */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                result.mode === 'sql'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-violet-100 text-violet-700'
              }`}
            >
              {result.mode === 'sql' ? '🗄 SQL' : '🔍 Vector'}
            </span>
            <span className="text-xs text-slate-400">
              {result.mode === 'sql' ? 'Answered using structured data' : 'Answered using semantic search'}
            </span>
          </div>

          {/* Answer */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Sources</p>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((id) => (
                  <Link
                    key={id}
                    to={`/invoices/${id}`}
                    className="px-3 py-1 bg-white border border-slate-200 text-blue-600 text-xs rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors font-mono"
                  >
                    {id.slice(0, 8)}…
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ask another */}
          <button
            onClick={() => { setResult(null); setQuestion('') }}
            className="text-sm text-slate-400 hover:text-slate-600 underline"
          >
            Ask another question
          </button>
        </div>
      )}
    </div>
  )
}
