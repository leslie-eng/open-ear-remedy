import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Reveal-on-scroll styles only hide content when JS (and IntersectionObserver) can reveal it again.
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
