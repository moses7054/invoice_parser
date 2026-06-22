import { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import QAPage from './pages/QAPage'
import { ProviderProvider, useProvider } from './context/ProviderContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function AppHeader() {
  const { provider, setProvider } = useProvider()

  return (
    <header
      style={{
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
      }}
    >
      {/* Left: app name + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111' }}>Invoice Parser</span>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#1d4ed8' }}>Upload</Link>
          <Link to="/invoices" style={{ textDecoration: 'none', color: '#1d4ed8' }}>Invoices</Link>
          <Link to="/qa" style={{ textDecoration: 'none', color: '#1d4ed8' }}>Q&amp;A</Link>
        </nav>
      </div>

      {/* Right: LLM provider dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label
          htmlFor="provider-select"
          style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}
        >
          LLM Provider:
        </label>
        <select
          id="provider-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'anthropic' | 'openai')}
          style={{
            padding: '0.375rem 0.625rem',
            fontSize: '0.875rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            background: '#f9fafb',
            cursor: 'pointer',
          }}
        >
          <option value="anthropic">Claude (claude-sonnet-4-6)</option>
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
      .then((data) => console.log('[health check]', data))
      .catch((err) => console.warn('[health check failed]', err))
  }, [])

  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/qa" element={<QAPage />} />
      </Routes>
    </>
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
