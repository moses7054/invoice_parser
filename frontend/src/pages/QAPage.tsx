import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProvider } from '../context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface QAResponse {
  answer: string
  mode: 'sql' | 'vector'
  sources: string[]
}

export default function QAPage() {
  const { provider } = useProvider()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QAResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, llm_provider: provider }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Request failed: ${res.status}`)
      }
      const data: QAResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Invoice Q&amp;A</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your invoices…"
          style={{
            flex: 1,
            padding: '0.625rem 0.75rem',
            fontSize: '1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
          }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            padding: '0.625rem 1.25rem',
            fontSize: '1rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading || !question.trim() ? 0.6 : 1,
          }}
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {loading && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
          <span
            style={{
              display: 'inline-block',
              width: 32,
              height: 32,
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: '0.75rem' }}>Analysing invoices…</p>
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            padding: '1rem',
            color: '#dc2626',
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div>
          {/* Mode badge */}
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              background: result.mode === 'sql' ? '#dbeafe' : '#ede9fe',
              color: result.mode === 'sql' ? '#1d4ed8' : '#7c3aed',
            }}
          >
            {result.mode === 'sql' ? 'SQL' : 'Vector'}
          </span>

          {/* Answer */}
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '1rem 1.25rem',
              fontSize: '1rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              marginBottom: '1.25rem',
            }}
          >
            {result.answer}
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Sources
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.sources.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/invoices/${id}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '0.375rem',
                        color: '#1d4ed8',
                        fontSize: '0.8125rem',
                        textDecoration: 'none',
                      }}
                    >
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
