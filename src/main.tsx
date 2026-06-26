import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProviders } from './context/providers/AppProviders'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js?v=3').catch((error) => {
        console.warn('Não foi possível ativar o modo offline.', error)
      })
      return
    }

    // Um Service Worker antigo mascarava alterações do Vite no localhost.
    // Em desenvolvimento, remova registros e caches para garantir HMR real.
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('pia-oftalmo-'))
          .map((cacheName) => caches.delete(cacheName))
      )
    }
  })
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
