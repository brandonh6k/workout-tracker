import { describe, it, expect } from 'vitest'
import { calculateEstimated1RM } from './api'

describe('calculateEstimated1RM', () => {
  it('returns weight when reps is 1 (actual 1RM)', () => {
    expect(calculateEstimated1RM(225, 1)).toBe(225)
  })

  it('returns 0 when weight is 0', () => {
    expect(calculateEstimated1RM(0, 10)).toBe(0)
  })

  it('returns 0 when reps is 0', () => {
    expect(calculateEstimated1RM(100, 0)).toBe(0)
  })

  it('calculates e1RM using Epley formula', () => {
    // Epley: 1RM = weight * (1 + reps/30)
    // 100 * (1 + 10/30) = 100 * 1.333... = 133.33... rounded to 133
    expect(calculateEstimated1RM(100, 10)).toBe(133)
  })

  it('handles common rep ranges correctly', () => {
    // 5 reps: weight * 1.167 
    expect(calculateEstimated1RM(200, 5)).toBe(233) // 200 * 1.167 = 233.33

    // 8 reps: weight * 1.267
    expect(calculateEstimated1RM(150, 8)).toBe(190) // 150 * 1.267 = 190

    // 12 reps: weight * 1.4
    expect(calculateEstimated1RM(100, 12)).toBe(140) // 100 * 1.4 = 140
  })

  it('handles high rep ranges', () => {
    // 20 reps: weight * 1.667
    expect(calculateEstimated1RM(50, 20)).toBe(83) // 50 * 1.667 = 83.33

    // 30 reps: weight * 2.0
    expect(calculateEstimated1RM(50, 30)).toBe(100) // 50 * 2.0 = 100
  })

  it('rounds to nearest integer', () => {
    // 100 * (1 + 7/30) = 100 * 1.2333... = 123.33...
    expect(calculateEstimated1RM(100, 7)).toBe(123)
  })
})
