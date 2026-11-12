import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Cursor from './components/Cursor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* the red presentation cursor is for recording locally; visitors keep their own */}
    {import.meta.env.DEV && <Cursor />}
  </StrictMode>,
)
