import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Add custom jest matchers from jest-dom
expect.extend(matchers)

// Clean up after each test case
afterEach(() => {
  cleanup()
})

// Mock localStorage with more complete implementation
const localStorageMock = {
  getItem: vi.fn((key) => {
    // Default returns for common keys
    if (key === 'focus_todos_v2') return JSON.stringify([])
    if (key === 'focus_history_v2') return JSON.stringify([])
    if (key === 'focus_settings_v2') return null
    return null
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock navigator.vibrate
global.navigator.vibrate = vi.fn()

// Mock AudioContext for chime testing
global.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => ({
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(() => ({ connect: vi.fn() })),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(() => ({ connect: vi.fn() })),
  })),
  destination: {},
  currentTime: 0,
}))

// Mock webkitAudioContext as fallback
global.webkitAudioContext = global.AudioContext

// Simple framer-motion mock - no React reference needed
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }) => children,
}))

// Mock requestFullscreen APIs
Object.defineProperty(document, 'documentElement', {
  value: {
    requestFullscreen: vi.fn(),
    webkitRequestFullscreen: vi.fn(),
    msRequestFullscreen: vi.fn(),
  },
  writable: true,
})

// Silence console warnings during tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}
