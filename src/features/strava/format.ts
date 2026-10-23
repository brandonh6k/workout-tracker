import { groupBy } from '../../lib/utils'
import type { LoggedSet } from '../../types'
import type { WorkoutSessionWithSets } from '../workouts/api'

/**
 * Plain-text summary for pasting into a manual Strava Weight Training activity.
 * Strava has no sets/reps fields, so the lifts go in the description.
 */
export function formatWorkoutForStrava(workout: WorkoutSessionWithSets): string {
  const exercises = groupBy(workout.logged_sets, (set) => set.exercise_name)

  const lines = Object.entries(exercises).map(
    ([name, sets]) => `${name}: ${formatSets(sets)}`
  )
  const setCount = workout.logged_sets.length
  const totalVolume = workout.logged_sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
  lines.push('', `${setCount} set${setCount !== 1 ? 's' : ''} · ${totalVolume.toLocaleString('en-US')}# volume`)
  if (workout.notes) lines.push('', workout.notes)

  return lines.join('\n')
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
