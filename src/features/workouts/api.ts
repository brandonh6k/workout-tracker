import { supabase } from '../../lib/supabase'
import type { WorkoutSession, LoggedSet, LoggedSetInsert } from '../../types'

export type WorkoutSessionWithSets = WorkoutSession & {
  logged_sets: LoggedSet[]
}

// Inserts take client-generated ids and ignore conflicts, so a retry after a lost response is a no-op
export async function insertWorkoutSession(session: {
  id: string
  template_id: string | null
  date: string
}): Promise<void> {
  // getSession reads the stored session; getUser would cost a round trip
  const { data: { session: auth } } = await supabase.auth.getSession()
  if (!auth) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('workout_sessions')
    .upsert({ ...session, user_id: auth.user.id, completed: false }, { onConflict: 'id', ignoreDuplicates: true })

  if (error) throw error
}

export async function logSet(set: LoggedSetInsert & { id: string }): Promise<void> {
  const { error } = await supabase
    .from('logged_sets')
    .upsert(set, { onConflict: 'id', ignoreDuplicates: true })

  if (error) throw error
}

export async function updateSet(
  setId: string,
  updates: { weight?: number; reps?: number; rpe?: number | null; notes?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('logged_sets')
    .update(updates)
    .eq('id', setId)

  if (error) throw error
}

export async function deleteSet(setId: string): Promise<void> {
  const { error } = await supabase
    .from('logged_sets')
    .delete()
    .eq('id', setId)

  if (error) throw error
}

export async function completeWorkoutSession(
  sessionId: string,
  durationMinutes?: number,
  notes?: string
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      completed: true,
      duration_minutes: durationMinutes ?? null,
      notes: notes ?? null,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function abandonWorkoutSession(sessionId: string): Promise<void> {
  // Delete the session and all its sets (cascade)
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

export async function getWorkoutSession(sessionId: string): Promise<WorkoutSessionWithSets | null> {
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError) {
    if (sessionError.code === 'PGRST116') return null
    throw sessionError
  }

  const { data: sets, error: setsError } = await supabase
    .from('logged_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')

  if (setsError) throw setsError

  return {
    ...session,
    logged_sets: sets ?? [],
  }
}

export async function getWorkoutSessionsWithSets(limit = 10): Promise<WorkoutSessionWithSets[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(limit)

  if (sessionsError) throw sessionsError
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: sets, error: setsError } = await supabase
    .from('logged_sets')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at')

  if (setsError) throw setsError

  const setsBySession = (sets ?? []).reduce(
    (acc, set) => {
      if (!acc[set.session_id]) acc[set.session_id] = []
      acc[set.session_id].push(set)
      return acc
    },
    {} as Record<string, LoggedSet[]>
  )

  return sessions.map((session) => ({
    ...session,
    logged_sets: setsBySession[session.id] ?? [],
  }))
}
