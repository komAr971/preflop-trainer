import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { TrainerDb, createDexieRepo } from './db/repo'
import { useTrainer } from './store/trainerStore'
import { useAccount } from './sync/account'
import { firebaseConfig } from './sync/firebaseConfig'

const db = new TrainerDb()
const repo = createDexieRepo(db, { onLocalChange: () => useAccount.getState().scheduleSync() })

void useTrainer
  .getState()
  .init(repo)
  .then(() =>
    useAccount.getState().init({
      db,
      configured: firebaseConfig !== null,
      loadCloud: async () =>
        firebaseConfig ? (await import('./sync/firebaseCloud')).createFirebaseCloud(firebaseConfig) : null,
      onApplied: (applied) => void useTrainer.getState().refreshFromStorage(applied),
    }),
  )
  .catch((e) => console.error('Storage unavailable, progress will not be saved', e))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
