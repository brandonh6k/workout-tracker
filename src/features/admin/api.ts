import { supabase } from '../../lib/supabase'
import type { Exercise, ExerciseType } from '../../types'

// Get all exercises (global + user's custom)
export async function getAllExercises(): Promise<Exercise[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('name')

  if (error) throw error
  return data ?? []
}

// Update exercise type
export async function updateExerciseType(
  exerciseId: string,
  exerciseType: ExerciseType
): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update({ exercise_type: exerciseType })
    .eq('id', exerciseId)

  if (error) throw error
}

// Update exercise category
export async function updateExerciseCategory(
  exerciseId: string,
  category: string | null
): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update({ category })
    .eq('id', exerciseId)

  if (error) throw error
}

// Update exercise (full update)
export async function updateExercise(
  exerciseId: string,
  updates: { name?: string; category?: string | null; exercise_type?: ExerciseType }
): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', exerciseId)

  if (error) throw error
}

// Delete a custom exercise (only user's own)
export async function deleteCustomExercise(exerciseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId)
    .eq('user_id', user.id) // Safety: only delete user's own custom exercises

  if (error) throw error
}

// Merge exercise A into B (move all references from A to B)
export async function mergeExercises(
  sourceExerciseName: string,
  targetExerciseName: string
): Promise<{ loggedSets: number; templateExercises: number; scheduledExercises: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's session IDs for scoping logged_sets updates
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)

  const sessionIds = sessions?.map((s) => s.id) ?? []

  // 1. Update logged_sets
  let loggedSetsCount = 0
  if (sessionIds.length > 0) {
    const { data: updatedSets, error: setsError } = await supabase
      .from('logged_sets')
      .update({ exercise_name: targetExerciseName })
      .eq('exercise_name', sourceExerciseName)
      .in('session_id', sessionIds)
      .select('id')

    if (setsError) throw setsError
    loggedSetsCount = updatedSets?.length ?? 0
  }

  // Get user's template IDs for scoping template_exercises updates
  const { data: templates } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('user_id', user.id)

  const templateIds = templates?.map((t) => t.id) ?? []

  // 2. Update template_exercises
  let templateExercisesCount = 0
  if (templateIds.length > 0) {
    const { data: updatedTemplateEx, error: templateExError } = await supabase
      .from('template_exercises')
      .update({ exercise_name: targetExerciseName })
      .eq('exercise_name', sourceExerciseName)
      .in('template_id', templateIds)
      .select('id')

    if (templateExError) throw templateExError
    templateExercisesCount = updatedTemplateEx?.length ?? 0
  }

  // Get user's scheduled workout IDs
  const { data: scheduledWorkouts } = await supabase
    .from('scheduled_workouts')
    .select('id')
    .eq('user_id', user.id)

  const scheduledWorkoutIds = scheduledWorkouts?.map((sw) => sw.id) ?? []

  // 3. Update scheduled_exercises
  let scheduledExercisesCount = 0
  if (scheduledWorkoutIds.length > 0) {
    const { data: updatedScheduledEx, error: scheduledExError } = await supabase
      .from('scheduled_exercises')
      .update({ exercise_name: targetExerciseName })
      .eq('exercise_name', sourceExerciseName)
      .in('scheduled_workout_id', scheduledWorkoutIds)
      .select('id')

    if (scheduledExError) throw scheduledExError
    scheduledExercisesCount = updatedScheduledEx?.length ?? 0
  }

  return {
    loggedSets: loggedSetsCount,
    templateExercises: templateExercisesCount,
    scheduledExercises: scheduledExercisesCount,
  }
}
