import { describe, it, expect } from 'vitest'
import { buildStravaActivity, formatSets } from './payload'
import type { LoggedSet } from '../../types'
import type { WorkoutSessionWithSets } from '../workouts'

const at = (hour: number, minute = 0) => new Date(2026, 9, 23, hour, minute).toISOString()

function set(exercise_name: string, weight: number, reps: number, created_at = at(7)): LoggedSet {
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
    created_at,
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
    created_at: at(7, 5),
    strava_activity_id: null,
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

describe('buildStravaActivity', () => {
  it('builds a WeightTraining activity in local wall-clock time', () => {
    const payload = buildStravaActivity(
      workout({
        logged_sets: [set('Lat Pulldown', 160, 10), set('Lat Pulldown', 160, 10), set('Squat', 135, 8)],
        notes: 'Felt strong',
      })
    )

    expect(payload).toEqual({
      name: 'Morning Weight Training',
      sport_type: 'WeightTraining',
      start_date_local: '2026-10-23T07:05:00',
      elapsed_time: 2700,
      description: 'Lat Pulldown: 2×10 @ 160#\nSquat: 1×8 @ 135#\n\n3 sets · 4,280# volume\n\nFelt strong',
    })
  })

  it('names the activity by time of day', () => {
    expect(buildStravaActivity(workout({ created_at: at(13) })).name).toBe('Afternoon Weight Training')
    expect(buildStravaActivity(workout({ created_at: at(19) })).name).toBe('Evening Weight Training')
  })

  it('falls back to the span between sets when duration is missing', () => {
    const payload = buildStravaActivity(
      workout({
        duration_minutes: null,
        logged_sets: [set('Squat', 135, 8, at(7, 10)), set('Squat', 135, 8, at(7, 40))],
      })
    )
    expect(payload.elapsed_time).toBe(1800)
  })

  it('never sends a zero elapsed time', () => {
    expect(buildStravaActivity(workout({ duration_minutes: null })).elapsed_time).toBe(60)
  })
})
