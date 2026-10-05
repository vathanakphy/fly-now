import { mockSeedData, type MockSeedData } from '../../data/mock/seed'

const STORAGE_KEY = 'flynow.mock.safe-state.v4'

const clone = <T>(value: T): T => structuredClone(value)

const readSafeState = (): MockSeedData => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as MockSeedData) : clone(mockSeedData)
  } catch {
    return clone(mockSeedData)
  }
}

class MockStore {
  data = readSafeState()

  persist(): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
  }

  reset(): void {
    this.data = clone(mockSeedData)
    this.persist()
  }
}

export const mockStore = new MockStore()
