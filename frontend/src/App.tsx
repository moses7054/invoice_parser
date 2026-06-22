import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function App() {
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => console.log('[health check]', data))
      .catch((err) => console.warn('[health check failed]', err))
  }, [])

  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/invoices" element={<InvoiceListPage />} />
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
    </Routes>
  )
}

export default App
