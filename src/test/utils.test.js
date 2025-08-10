import { describe, it, expect } from 'vitest'

// Test time formatting function
const formatTime = (s) => {
  if (s < 0) s = 0;
  const hours = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

describe('Utility Functions', () => {
  describe('formatTime', () => {
    it('formats minutes and seconds correctly', () => {
      expect(formatTime(1500)).toBe('25:00') // 25 minutes
      expect(formatTime(90)).toBe('01:30')   // 1 minute 30 seconds
      expect(formatTime(45)).toBe('00:45')   // 45 seconds
    })

    it('formats hours, minutes, and seconds correctly', () => {
      expect(formatTime(3661)).toBe('1:01:01') // 1 hour 1 minute 1 second
      expect(formatTime(3600)).toBe('1:00:00') // 1 hour exactly
      expect(formatTime(7200)).toBe('2:00:00') // 2 hours
    })

    it('handles zero and negative values', () => {
      expect(formatTime(0)).toBe('00:00')
      expect(formatTime(-10)).toBe('00:00')
    })

    it('handles edge cases', () => {
      expect(formatTime(59)).toBe('00:59')     // 59 seconds
      expect(formatTime(60)).toBe('01:00')     // 1 minute
      expect(formatTime(3599)).toBe('59:59')   // 59 minutes 59 seconds
    })
  })
})
