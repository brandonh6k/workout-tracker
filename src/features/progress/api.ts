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

// Comparison data for an exercise
export type ExerciseComparison = {
  exerciseName: string
  currentWeek: { e1rm: number; date: string } | null
  pastWeek: { e1rm: number; date: string } | null
  change: number | null // percentage change
}

// Get comparison data for key lifts (this week vs N weeks ago)
export async function getProgressComparison(weeksAgo = 4): Promise<ExerciseComparison[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const currentWeekStart = new Date(now)
  currentWeekStart.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0)

  const pastWeekStart = new Date(currentWeekStart)
  pastWeekStart.setDate(pastWeekStart.getDate() - weeksAgo * 7)

  const pastWeekEnd = new Date(pastWeekStart)
  pastWeekEnd.setDate(pastWeekEnd.getDate() + 7)

  // Get sessions from current week
  const { data: currentSessions } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .gte('date', currentWeekStart.toISOString().split('T')[0])

  // Get sessions from comparison week
  const { data: pastSessions } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .gte('date', pastWeekStart.toISOString().split('T')[0])
    .lt('date', pastWeekEnd.toISOString().split('T')[0])

  if ((!currentSessions || currentSessions.length === 0) && 
      (!pastSessions || pastSessions.length === 0)) {
    return []
  }

  const allSessionIds = [
    ...(currentSessions ?? []).map((s) => s.id),
    ...(pastSessions ?? []).map((s) => s.id),
  ]

  if (allSessionIds.length === 0) return []

  // Get all sets from these sessions
  const { data: sets } = await supabase
    .from('logged_sets')
    .select('session_id, exercise_name, weight, reps')
    .in('session_id', allSessionIds)

  if (!sets || sets.length === 0) return []

  // Build session -> date map
  const sessionDateMap = new Map<string, { date: string; isCurrent: boolean }>()
  for (const s of currentSessions ?? []) {
    sessionDateMap.set(s.id, { date: s.date, isCurrent: true })
  }
  for (const s of pastSessions ?? []) {
    sessionDateMap.set(s.id, { date: s.date, isCurrent: false })
  }

  // Group by exercise and find best e1RM for each week
  type WeekBest = { e1rm: number; date: string }
  const exerciseData = new Map<string, { current: WeekBest | null; past: WeekBest | null }>()

  for (const set of sets) {
    const sessionInfo = sessionDateMap.get(set.session_id)
    if (!sessionInfo) continue

    const e1rm = calculateEstimated1RM(set.weight, set.reps)
    const entry = exerciseData.get(set.exercise_name) ?? { current: null, past: null }

    if (sessionInfo.isCurrent) {
      if (!entry.current || e1rm > entry.current.e1rm) {
        entry.current = { e1rm, date: sessionInfo.date }
      }
    } else {
      if (!entry.past || e1rm > entry.past.e1rm) {
        entry.past = { e1rm, date: sessionInfo.date }
      }
    }

    exerciseData.set(set.exercise_name, entry)
  }

  // Convert to comparison array, only including exercises with data in both weeks
  const comparisons: ExerciseComparison[] = []

  for (const [exerciseName, data] of exerciseData) {
    // Only include if we have data to compare
    if (data.current || data.past) {
      let change: number | null = null
      if (data.current && data.past && data.past.e1rm > 0) {
        change = Math.round(((data.current.e1rm - data.past.e1rm) / data.past.e1rm) * 100)
      }

      comparisons.push({
        exerciseName,
        currentWeek: data.current,
        pastWeek: data.past,
        change,
      })
    }
  }

  // Sort by current week e1rm (highest first), then by name
  return comparisons.sort((a, b) => {
    const aVal = a.currentWeek?.e1rm ?? 0
    const bVal = b.currentWeek?.e1rm ?? 0
    if (bVal !== aVal) return bVal - aVal
    return a.exerciseName.localeCompare(b.exerciseName)
  })
}

// Get recent workout sessions with summary data
export type RecentWorkout = {
  id: string
  date: string
  templateName: string | null
  exerciseCount: number
  setCount: number
  totalVolume: number
}

export async function getRecentWorkouts(limit = 5): Promise<RecentWorkout[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, date, template_id')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw error
  if (!sessions || sessions.length === 0) return []

  // Get template names
  const templateIds = [...new Set(sessions.map((s) => s.template_id).filter(Boolean))] as string[]
  const templateMap = new Map<string, string>()
  
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from('workout_templates')
      .select('id, name')
      .in('id', templateIds)

    for (const t of templates ?? []) {
      templateMap.set(t.id, t.name)
    }
  }

  const sessionIds = sessions.map((s) => s.id)

  const { data: sets } = await supabase
    .from('logged_sets')
    .select('session_id, exercise_name, weight, reps')
    .in('session_id', sessionIds)

  if (!sets) return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    templateName: s.template_id ? templateMap.get(s.template_id) ?? null : null,
    exerciseCount: 0,
    setCount: 0,
    totalVolume: 0,
  }))

  // Group sets by session
  const sessionSets = new Map<string, typeof sets>()
  for (const set of sets) {
    const existing = sessionSets.get(set.session_id) ?? []
    existing.push(set)
    sessionSets.set(set.session_id, existing)
  }

  return sessions.map((s) => {
    const setsForSession = sessionSets.get(s.id) ?? []
    const exerciseNames = new Set(setsForSession.map((set) => set.exercise_name))
    const totalVolume = setsForSession.reduce((sum, set) => sum + set.weight * set.reps, 0)

    return {
      id: s.id,
      date: s.date,
      templateName: s.template_id ? templateMap.get(s.template_id) ?? null : null,
      exerciseCount: exerciseNames.size,
      setCount: setsForSession.length,
      totalVolume,
    }
  })
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

// Get this week vs last week volume comparison
export type WeeklyVolumeComparison = {
  thisWeek: number
  lastWeek: number
  change: number | null // percentage
  thisWeekSessions: number
  lastWeekSessions: number
}

export async function getWeeklyVolumeComparison(): Promise<WeeklyVolumeComparison> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  
  // Get start of this week (Sunday)
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  // Get start of last week
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  // Get sessions from both weeks
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .gte('date', lastWeekStart.toISOString().split('T')[0])

  if (!sessions || sessions.length === 0) {
    return { thisWeek: 0, lastWeek: 0, change: null, thisWeekSessions: 0, lastWeekSessions: 0 }
  }

  const thisWeekSessions = sessions.filter(
    (s) => new Date(s.date) >= thisWeekStart
  )
  const lastWeekSessions = sessions.filter(
    (s) => new Date(s.date) >= lastWeekStart && new Date(s.date) < thisWeekStart
  )

  const sessionIds = sessions.map((s) => s.id)

  const { data: sets } = await supabase
    .from('logged_sets')
    .select('session_id, weight, reps')
    .in('session_id', sessionIds)

  if (!sets) {
    return { 
      thisWeek: 0, 
      lastWeek: 0, 
      change: null, 
      thisWeekSessions: thisWeekSessions.length, 
      lastWeekSessions: lastWeekSessions.length 
    }
  }

  const thisWeekSessionIds = new Set(thisWeekSessions.map((s) => s.id))
  const lastWeekSessionIds = new Set(lastWeekSessions.map((s) => s.id))

  let thisWeekVolume = 0
  let lastWeekVolume = 0

  for (const set of sets) {
    const volume = set.weight * set.reps
    if (thisWeekSessionIds.has(set.session_id)) {
      thisWeekVolume += volume
    } else if (lastWeekSessionIds.has(set.session_id)) {
      lastWeekVolume += volume
    }
  }

  const change = lastWeekVolume > 0
    ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : null

  return {
    thisWeek: thisWeekVolume,
    lastWeek: lastWeekVolume,
    change,
    thisWeekSessions: thisWeekSessions.length,
    lastWeekSessions: lastWeekSessions.length,
  }
}
