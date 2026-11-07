import { groupBy } from '../../lib/utils'
import type { LoggedSet } from '../../types'
import type { WorkoutSessionWithSets } from '../workouts'

export type StravaActivityPayload = {
  name: string
  sport_type: 'WeightTraining'
  start_date_local: string
  elapsed_time: number
  description: string
}

/**
 * Builds the manual-activity body for Strava's POST /activities.
 * Strava has no sets/reps fields, so the lifts go in the description.
 */
export function buildStravaActivity(workout: WorkoutSessionWithSets): StravaActivityPayload {
  const start = new Date(workout.created_at)
  const exercises = groupBy(workout.logged_sets, (set) => set.exercise_name)

  const lines = Object.entries(exercises).map(
    ([name, sets]) => `${name}: ${formatSets(sets)}`
  )
  const totalVolume = workout.logged_sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
  lines.push('', `${workout.logged_sets.length} sets · ${totalVolume.toLocaleString('en-US')}# volume`)
  if (workout.notes) lines.push('', workout.notes)

  return {
    name: `${timeOfDay(start)} Weight Training`,
    sport_type: 'WeightTraining',
    start_date_local: toLocalIsoString(start),
    elapsed_time: elapsedSeconds(workout),
    description: lines.join('\n'),
  }
}

/** "3×10 @ 160#" when every set matches, otherwise "10@160, 8@170". Weight 0 drops the "@". */
export function formatSets(sets: LoggedSet[]): string {
  const first = sets[0]
  const allSame = sets.every((s) => s.weight === first.weight && s.reps === first.reps)

  if (allSame) {
    const reps = `${sets.length}×${first.reps}`
    return first.weight > 0 ? `${reps} @ ${first.weight}#` : reps
  }
  return sets.map((s) => (s.weight > 0 ? `${s.reps}@${s.weight}` : `${s.reps}`)).join(', ')
}

function elapsedSeconds(workout: WorkoutSessionWithSets): number {
  if (workout.duration_minutes) return workout.duration_minutes * 60

  const times = workout.logged_sets.map((s) => new Date(s.created_at).getTime())
  const span = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 1000 : 0
  // Strava rejects a zero elapsed_time
  return Math.max(60, Math.round(span))
}

function timeOfDay(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

/** Local wall-clock time with no offset; Strava reads start_date_local as the athlete's local time. */
function toLocalIsoString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
