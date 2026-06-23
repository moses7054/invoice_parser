// Resolves the backend API base URL from the build-time env var.
// Self-corrects two common misconfigurations:
//   1. Missing scheme  -> "host.up.railway.app"  becomes "https://host.up.railway.app"
//   2. Trailing slash   -> "https://host/"        becomes "https://host"
// Without a scheme the browser treats the value as a relative path and the
// request wrongly hits the frontend origin (causing 405s from Vercel).
function resolveApiUrl(): string {
  let url = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').trim()
  url = url.replace(/\/+$/, '') // strip trailing slashes
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}

export const API_URL = resolveApiUrl()

// Helps verify what got baked into the production bundle.
if (typeof window !== 'undefined') {
  console.log('[API_URL]', API_URL)
}
