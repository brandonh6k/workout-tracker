import { supabase } from '../../lib/supabase'
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

// Epley formula: 1RM = weight * (1 + reps/30)
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps === 0 || weight === 0) return 0
  return Math.round(weight * (1 + reps / 30))
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

// Get the exercise type for a specific exercise
export async function getExerciseType(exerciseName: string): Promise<ExerciseType> {
  const { data, error } = await supabase
    .from('exercises')
    .select('exercise_type')
    .eq('name', exerciseName)
    .single()

  if (error || !data) return 'weighted' // Default fallback
  return data.exercise_type as ExerciseType
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

// Get weekly volume totals for the last N weeks
export async function getWeeklyVolume(weeks = 8): Promise<{ weekStart: string; volume: number }[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date')

  if (sessionsError) throw sessionsError
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)

  const { data: sets, error: setsError } = await supabase
    .from('logged_sets')
    .select('session_id, weight, reps')
    .in('session_id', sessionIds)

  if (setsError) throw setsError
  if (!sets) return []

  // Create session -> date map
  const sessionDateMap = new Map(sessions.map((s) => [s.id, s.date]))

  // Group volume by week
  const weeklyVolume = new Map<string, number>()

  for (const set of sets) {
    const date = new Date(sessionDateMap.get(set.session_id)!)
    // Get Monday of the week
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    const weekStart = monday.toISOString().split('T')[0]

    const volume = set.weight * set.reps
    weeklyVolume.set(weekStart, (weeklyVolume.get(weekStart) ?? 0) + volume)
  }

  return Array.from(weeklyVolume.entries())
    .map(([weekStart, volume]) => ({ weekStart, volume }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
