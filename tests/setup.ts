import '@testing-library/jest-dom/vitest'

const localStorageValues = new Map<string, string>()
const localStorage: Storage = {
  get length() { return localStorageValues.size },
  clear: () => localStorageValues.clear(),
  getItem: (key) => localStorageValues.get(key) ?? null,
  key: (index) => [...localStorageValues.keys()][index] ?? null,
  removeItem: (key) => { localStorageValues.delete(key) },
  setItem: (key, value) => { localStorageValues.set(key, String(value)) },
}
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage })
