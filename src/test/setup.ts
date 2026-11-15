import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// IndexedDB-backed components can be slow under full parallel load (CI).
configure({ asyncUtilTimeout: 3000 })

afterEach(() => cleanup())
