import { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import QAPage from './pages/QAPage'
import { ProviderProvider, useProvider } from './context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function AppHeader() {
  const { provider, setProvider } = useProvider()

  return (
    <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-8">
        <span className="font-bold text-lg tracking-tight text-white">
          📄 Invoice Parser
        </span>
        <nav className="flex gap-1">
          {[
            { to: '/', label: 'Upload' },
            { to: '/invoices', label: 'Invoices' },
            { to: '/qa', label: 'Q&A' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="provider-select" className="text-sm text-slate-400 font-medium">
          Model:
        </label>
        <select
          id="provider-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'anthropic' | 'openai')}
          className="text-sm bg-slate-800 border border-slate-600 text-white rounded-md px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="anthropic">Claude (Sonnet 4.6)</option>
          <option value="openai">GPT-4o</option>
        </select>
      </div>
    </header>
  )
}

function AppInner() {
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => console.log('[health]', data))
      .catch((err) => console.warn('[health failed]', err))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/qa" element={<QAPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <ProviderProvider>
      <AppInner />
    </ProviderProvider>
  )
}

export default App
