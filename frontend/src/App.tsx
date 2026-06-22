import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function UploadPage() {
  return <div><h1>Upload Invoice</h1><p>Upload functionality coming soon.</p></div>
}

function InvoicesPage() {
  return <div><h1>Invoices</h1><p>Invoice list coming soon.</p></div>
}

function InvoiceDetailPage() {
  return <div><h1>Invoice Detail</h1><p>Invoice detail coming soon.</p></div>
}

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
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
    </Routes>
  )
}

export default App
