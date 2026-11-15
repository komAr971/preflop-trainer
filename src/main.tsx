import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { createDexieRepo } from './db/repo'
import { useTrainer } from './store/trainerStore'

void useTrainer.getState().init(createDexieRepo()).catch((e) => console.error('Storage unavailable, progress will not be saved', e))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
