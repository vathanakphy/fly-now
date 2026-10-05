import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { mockStore } from '../services/mock/store'

beforeEach(() => {
  mockStore.reset()
  sessionStorage.removeItem('flynow.mock.user-id')
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
})
