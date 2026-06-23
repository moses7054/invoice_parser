import { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { FileText, List, MessageSquare, ChevronDown } from 'lucide-react'
import UploadPage from './pages/UploadPage'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import QAPage from './pages/QAPage'
import { ProviderProvider, useProvider } from './context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const NAV = [
  { to: '/', label: 'Upload', icon: FileText },
  { to: '/invoices', label: 'Invoices', icon: List },
  { to: '/qa', label: 'Q&A', icon: MessageSquare },
]

function AppHeader() {
  const { provider, setProvider } = useProvider()

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <FileText size={14} className="text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-sm">InvoiceAI</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Provider picker */}
      <div className="relative flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 cursor-pointer group">
          <div className={`w-2 h-2 rounded-full ${provider === 'anthropic' ? 'bg-orange-400' : 'bg-green-400'}`} />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'anthropic' | 'openai')}
            className="appearance-none bg-transparent text-slate-300 text-xs font-medium pr-4 cursor-pointer focus:outline-none"
          >
            <option value="anthropic">Claude Sonnet 4.6</option>
            <option value="openai">GPT-4o</option>
          </select>
          <ChevronDown size={12} className="text-slate-500 absolute right-2.5" />
        </div>
      </div>
    </header>
  )
}

function AppInner() {
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
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

export default function App() {
  return (
    <ProviderProvider>
      <AppInner />
    </ProviderProvider>
  )
}
