import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApp } from './composition.ts'
import App from './ui/App.tsx'
import './ui/App.css'

const app = createApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App stepImport={app.stepImport} />
  </StrictMode>,
)
