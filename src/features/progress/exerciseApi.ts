import { supabase } from '../../lib/supabase'
import { calculateEstimated1RM } from '../../lib/utils'
import type { LoggedSet, ExerciseType } from '../../types'

export type ExerciseHistoryEntry = {
  date: string
  sessionId: string
  sets: LoggedSet[]
}

export type ExerciseStats = {
  exerciseName: string
  totalSessions: number
  totalSets: number
  totalVolume: number // weight * reps summed
  bestWeight: number
  bestReps: number // most reps at any weight
  bestVolume: number // best single-set volume (weight * reps)
  estimated1RM: number
  lastPerformed: string | null
}

// Get all logged sets for a specific exercise, grouped by session date
export async function getExerciseHistory(exerciseName: string): Promise<ExerciseHistoryEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get all sessions for this user
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })

  if (sessionsError) throw sessionsError
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)

  // Get all sets for this exercise in those sessions
  const { data: sets, error: setsError } = await supabase
    .from('logged_sets')
    .select('*')
    .eq('exercise_name', exerciseName)
    .in('session_id', sessionIds)
    .order('set_number')

  if (setsError) throw setsError
  if (!sets || sets.length === 0) return []

  // Group sets by session
  const sessionMap = new Map<string, { date: string; sets: LoggedSet[] }>()

  for (const session of sessions) {
    const sessionSets = sets.filter((s) => s.session_id === session.id)
    if (sessionSets.length > 0) {
      sessionMap.set(session.id, { date: session.date, sets: sessionSets })
    }
  }

  return Array.from(sessionMap.entries()).map(([sessionId, data]) => ({
    sessionId,
    date: data.date,
    sets: data.sets,
  }))
}

// Get stats for a specific exercise
export async function getExerciseStats(exerciseName: string): Promise<ExerciseStats | null> {
  const history = await getExerciseHistory(exerciseName)

  if (history.length === 0) {
    return null
  }

  const allSets = history.flatMap((h) => h.sets)

  let bestWeight = 0
  let bestReps = 0
  let bestVolume = 0
  let best1RM = 0
  let totalVolume = 0

  for (const set of allSets) {
    const volume = set.weight * set.reps
    totalVolume += volume

    if (set.weight > bestWeight) bestWeight = set.weight
    if (set.reps > bestReps) bestReps = set.reps
    if (volume > bestVolume) bestVolume = volume

    const estimated1RM = calculateEstimated1RM(set.weight, set.reps)
    if (estimated1RM > best1RM) best1RM = estimated1RM
  }

  return {
    exerciseName,
    totalSessions: history.length,
    totalSets: allSets.length,
    totalVolume,
    bestWeight,
    bestReps,
    bestVolume,
    estimated1RM: best1RM,
    lastPerformed: history[0]?.date ?? null,
  }
}

export type LoggedExerciseInfo = {
  name: string
  exerciseType: ExerciseType
}

// Get list of all exercises the user has logged, with their types
export async function getLoggedExercises(): Promise<LoggedExerciseInfo[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get all completed sessions for this user
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('completed', true)

  if (sessionsError) throw sessionsError
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)

  // Get distinct exercise names from logged sets
  const { data: sets, error: setsError } = await supabase
    .from('logged_sets')
    .select('exercise_name')
    .in('session_id', sessionIds)

  if (setsError) throw setsError
  if (!sets) return []

  // Dedupe exercise names
  const exerciseNames = [...new Set(sets.map((s) => s.exercise_name))]

  // Fetch exercise types for these exercises
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('name, exercise_type')
    .in('name', exerciseNames)

  if (exercisesError) throw exercisesError

  // Build map of name -> type (default to 'weighted' if not found)
  const typeMap = new Map<string, ExerciseType>(
    (exercises ?? []).map((e) => [e.name, e.exercise_type as ExerciseType])
  )

  return exerciseNames
    .map((name) => ({
      name,
      exerciseType: typeMap.get(name) ?? 'weighted',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Check if a set is a PR (personal record)
export type PRType = 'weight' | 'reps' | 'volume' | 'e1rm'

export type PRCheck = {
  isWeightPR: boolean
  isRepsPR: boolean
  isVolumePR: boolean
  is1RMPR: boolean
}

export async function checkSetForPRs(
  exerciseName: string,
  weight: number,
  reps: number,
  _excludeSetId?: string // Reserved for future use: exclude current set when checking
): Promise<PRCheck> {
  const stats = await getExerciseStats(exerciseName)

  if (!stats) {
    // First time doing this exercise - everything is a PR!
    return { isWeightPR: true, isRepsPR: true, isVolumePR: true, is1RMPR: true }
  }

  const volume = weight * reps
  const estimated1RM = calculateEstimated1RM(weight, reps)

  return {
    isWeightPR: weight > stats.bestWeight,
    isRepsPR: reps > stats.bestReps,
    isVolumePR: volume > stats.bestVolume,
    is1RMPR: estimated1RM > stats.estimated1RM,
  }
}

// Progress chart data point
export type ProgressDataPoint = {
  date: string
  e1rm: number
  bestWeight: number
  bestVolume: number // best single-set volume that session
  totalVolume: number // total session volume
}

// Get progress data for charting (e1RM, volume over time)
export async function getExerciseProgressData(exerciseName: string): Promise<ProgressDataPoint[]> {
  const history = await getExerciseHistory(exerciseName)

  if (history.length === 0) return []

  // Sort chronologically (oldest first for charts)
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date))

  return sortedHistory.map((entry) => {
    let bestWeight = 0
    let best1RM = 0
    let bestSetVolume = 0
    let totalVolume = 0

    for (const set of entry.sets) {
      const setVolume = set.weight * set.reps
      totalVolume += setVolume

      if (set.weight > bestWeight) bestWeight = set.weight
      if (setVolume > bestSetVolume) bestSetVolume = setVolume

      const e1rm = calculateEstimated1RM(set.weight, set.reps)
      if (e1rm > best1RM) best1RM = e1rm
    }

    return {
      date: entry.date,
      e1rm: best1RM,
      bestWeight,
      bestVolume: bestSetVolume,
      totalVolume,
    }
  })
}
