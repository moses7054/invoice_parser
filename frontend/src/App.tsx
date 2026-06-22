import { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import QAPage from './pages/QAPage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function App() {
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => console.log('[health check]', data))
      .catch((err) => console.warn('[health check failed]', err))
  }, [])

  return (
    <>
      <nav style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#1d4ed8' }}>Upload</Link>
        <Link to="/invoices" style={{ textDecoration: 'none', color: '#1d4ed8' }}>Invoices</Link>
        <Link to="/qa" style={{ textDecoration: 'none', color: '#1d4ed8' }}>Q&A</Link>
      </nav>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/qa" element={<QAPage />} />
      </Routes>
    </>
  )
}

export default App
