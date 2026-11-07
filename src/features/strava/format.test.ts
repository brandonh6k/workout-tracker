import { describe, it, expect } from 'vitest'
import { formatWorkoutForStrava, formatSets } from './format'
import type { LoggedSet } from '../../types'
import type { WorkoutSessionWithSets } from '../workouts/api'

function set(exercise_name: string, weight: number, reps: number): LoggedSet {
  return {
    id: crypto.randomUUID(),
    session_id: 's1',
    exercise_name,
    set_number: 1,
    weight,
    reps,
    rpe: null,
    notes: null,
    duration_seconds: null,
    distance_meters: null,
    created_at: '2026-10-23T13:00:00Z',
  }
}

function workout(overrides: Partial<WorkoutSessionWithSets> = {}): WorkoutSessionWithSets {
  return {
    id: 's1',
    user_id: 'u1',
    template_id: null,
    date: '2026-10-23',
    duration_minutes: 45,
    notes: null,
    completed: true,
    created_at: '2026-10-23T13:00:00Z',
    logged_sets: [],
    ...overrides,
  }
}

describe('formatSets', () => {
  it('collapses identical sets', () => {
    expect(formatSets([set('Lat Pulldown', 160, 10), set('Lat Pulldown', 160, 10), set('Lat Pulldown', 160, 10)]))
      .toBe('3×10 @ 160#')
  })

  it('lists mixed sets individually', () => {
    expect(formatSets([set('Squat', 160, 10), set('Squat', 170, 8)])).toBe('10@160, 8@170')
  })

  it('omits weight for bodyweight sets', () => {
    expect(formatSets([set('Pull-up', 0, 8), set('Pull-up', 0, 8)])).toBe('2×8')
    expect(formatSets([set('Pull-up', 0, 8), set('Pull-up', 0, 6)])).toBe('8, 6')
  })
})

describe('formatWorkoutForStrava', () => {
  it('lists each exercise, totals, and notes', () => {
    const text = formatWorkoutForStrava(
      workout({
        logged_sets: [set('Lat Pulldown', 160, 10), set('Lat Pulldown', 160, 10), set('Squat', 135, 8)],
        notes: 'Felt strong',
      })
    )
    expect(text).toBe('Lat Pulldown: 2×10 @ 160#\nSquat: 1×8 @ 135#\n\n3 sets · 4,280# volume\n\nFelt strong')
  })

  it('leaves out the notes block when there are none', () => {
    expect(formatWorkoutForStrava(workout({ logged_sets: [set('Squat', 135, 8)] })))
      .toBe('Squat: 1×8 @ 135#\n\n1 set · 1,080# volume')
  })
})
