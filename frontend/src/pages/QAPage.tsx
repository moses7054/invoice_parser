import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Database, Search, ExternalLink, Loader2, Bot, User } from 'lucide-react'
import { useProvider } from '../context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface QAResponse { answer: string; mode: 'sql' | 'vector'; sources: string[] }

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  mode?: 'sql' | 'vector'
  sources?: string[]
}

const EXAMPLES = [
  { q: 'What is the total across all invoices?', tag: 'Aggregate' },
  { q: 'How many invoices are in EUR?', tag: 'Filter' },
  { q: 'Find invoices related to consulting', tag: 'Semantic' },
  { q: 'Show invoices mentioning VAT', tag: 'Search' },
]

let msgId = 0

export default function QAPage() {
  const { provider } = useProvider()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function ask(q: string) {
    if (!q.trim() || loading) return
    const question = q.trim()
    setInput('')
    setMessages(m => [...m, { id: ++msgId, type: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, llm_provider: provider }),
      })
      const data: QAResponse = await res.json()
      if (!res.ok) throw new Error((data as unknown as { detail?: string }).detail ?? `HTTP ${res.status}`)
      setMessages(m => [...m, { id: ++msgId, type: 'assistant', content: data.answer, mode: data.mode, sources: data.sources }])
    } catch (e) {
      setMessages(m => [...m, { id: ++msgId, type: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-up">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Invoice Q&A</h1>
        <p className="text-slate-500 text-sm mt-0.5">Ask anything. Structured questions use SQL, semantic questions use vector search.</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
              <Bot size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Ask about your invoices</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">Questions about totals and counts use SQL. Questions about content use vector search.</p>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {EXAMPLES.map(({ q, tag }) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-xs font-semibold text-indigo-500 mb-1 block">{tag}</span>
                  <span className="text-sm text-slate-700">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot size={14} className="text-white" />
              </div>
            )}

            <div className={`max-w-2xl ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
              {msg.type === 'user' ? (
                <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
                  {msg.mode && (
                    <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs font-semibold ${
                      msg.mode === 'sql'
                        ? 'bg-blue-50 border-blue-100 text-blue-700'
                        : 'bg-violet-50 border-violet-100 text-violet-700'
                    }`}>
                      {msg.mode === 'sql'
                        ? <><Database size={11} /> SQL · Structured data</>
                        : <><Search size={11} /> Vector · Semantic search</>}
                    </div>
                  )}
                  <div className="px-4 py-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      <span className="text-xs text-slate-400 mr-1 self-center">Sources:</span>
                      {msg.sources.map(id => (
                        <Link key={id} to={`/invoices/${id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded text-xs font-mono transition-colors">
                          {id.slice(0, 8)} <ExternalLink size={9} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.type === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-slate-500" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 size={14} className="text-indigo-500 animate-spin" />
              <span className="text-sm text-slate-400">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2 px-4 py-2.5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
          placeholder="Ask a question about your invoices…"
          className="flex-1 text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
        />
        <button
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
        >
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  )
}
