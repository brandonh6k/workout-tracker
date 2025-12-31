import { describe, it, expect } from 'vitest'
import { groupBy, formatWorkoutDate, formatShortDate } from './utils'

describe('groupBy', () => {
  it('groups items by the key function', () => {
    const items = [
      { id: 1, category: 'a' },
      { id: 2, category: 'b' },
      { id: 3, category: 'a' },
    ]

    const result = groupBy(items, (item) => item.category)

    expect(result).toEqual({
      a: [
        { id: 1, category: 'a' },
        { id: 3, category: 'a' },
      ],
      b: [{ id: 2, category: 'b' }],
    })
  })

  it('returns empty object for empty array', () => {
    const result = groupBy([], (item: { id: string }) => item.id)
    expect(result).toEqual({})
  })

  it('handles single item', () => {
    const items = [{ id: 1, type: 'foo' }]
    const result = groupBy(items, (item) => item.type)
    expect(result).toEqual({ foo: [{ id: 1, type: 'foo' }] })
  })

  it('handles all items in same group', () => {
    const items = [
      { name: 'a', group: 'x' },
      { name: 'b', group: 'x' },
      { name: 'c', group: 'x' },
    ]
    const result = groupBy(items, (item) => item.group)
    expect(result).toEqual({
      x: [
        { name: 'a', group: 'x' },
        { name: 'b', group: 'x' },
        { name: 'c', group: 'x' },
      ],
    })
  })
})

describe('formatWorkoutDate', () => {
  it('formats Date object correctly', () => {
    // December 30, 2024 is a Monday
    const date = new Date(2024, 11, 30, 12, 0, 0) // Month is 0-indexed
    const result = formatWorkoutDate(date)
    expect(result).toBe('Mon, Dec 30')
  })

  it('formats date string with time correctly', () => {
    // Use ISO string with time to avoid timezone issues
    const result = formatWorkoutDate('2024-12-30T12:00:00')
    expect(result).toBe('Mon, Dec 30')
  })

  it('handles different days of week', () => {
    expect(formatWorkoutDate(new Date(2024, 11, 31, 12))).toBe('Tue, Dec 31') // Tuesday
    expect(formatWorkoutDate(new Date(2025, 0, 1, 12))).toBe('Wed, Jan 1') // Wednesday
  })
})

describe('formatShortDate', () => {
  it('formats without weekday', () => {
    const result = formatShortDate(new Date(2024, 11, 30, 12))
    expect(result).toBe('Dec 30')
  })

  it('formats Date object', () => {
    const date = new Date(2024, 11, 30, 12, 0, 0)
    const result = formatShortDate(date)
    expect(result).toBe('Dec 30')
  })
})
