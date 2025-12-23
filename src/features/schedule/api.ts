import { supabase } from '../../lib/supabase'
import type {
  ScheduledWorkout,
  ScheduledExercise,
  ScheduledExerciseInsert,
  WorkoutTemplate,
  TemplateExercise,
} from '../../types'

// Scheduled workout with exercises and template info
export type ScheduledWorkoutWithDetails = ScheduledWorkout & {
  scheduled_exercises: ScheduledExercise[]
  template: WorkoutTemplate & {
    template_exercises: TemplateExercise[]
  }
}

export async function getScheduledWorkouts(): Promise<ScheduledWorkoutWithDetails[]> {
  const { data: scheduled, error: scheduledError } = await supabase
    .from('scheduled_workouts')
    .select('*')
    .order('day_of_week')

  if (scheduledError) throw scheduledError
  if (!scheduled || scheduled.length === 0) return []

  // Get unique template IDs
  const templateIds = [...new Set(scheduled.map((s) => s.template_id))]
  const scheduledIds = scheduled.map((s) => s.id)

  // Fetch templates
  const { data: templates, error: templatesError } = await supabase
    .from('workout_templates')
    .select('*')
    .in('id', templateIds)

  if (templatesError) throw templatesError

  // Fetch template exercises
  const { data: templateExercises, error: templateExError } = await supabase
    .from('template_exercises')
    .select('*')
    .in('template_id', templateIds)
    .order('order_index')

  if (templateExError) throw templateExError

  // Fetch scheduled exercises
  const { data: scheduledExercises, error: scheduledExError } = await supabase
    .from('scheduled_exercises')
    .select('*')
    .in('scheduled_workout_id', scheduledIds)
    .order('order_index')

  if (scheduledExError) throw scheduledExError

  // Build lookup maps
  const templatesById = (templates ?? []).reduce(
    (acc, t) => ({ ...acc, [t.id]: t }),
    {} as Record<string, WorkoutTemplate>
  )

  const templateExercisesByTemplateId = (templateExercises ?? []).reduce(
    (acc, ex) => {
      if (!acc[ex.template_id]) acc[ex.template_id] = []
      acc[ex.template_id].push(ex)
      return acc
    },
    {} as Record<string, TemplateExercise[]>
  )

  const scheduledExercisesByScheduledId = (scheduledExercises ?? []).reduce(
    (acc, ex) => {
      if (!acc[ex.scheduled_workout_id]) acc[ex.scheduled_workout_id] = []
      acc[ex.scheduled_workout_id].push(ex)
      return acc
    },
    {} as Record<string, ScheduledExercise[]>
  )

  return scheduled.map((s) => ({
    ...s,
    scheduled_exercises: scheduledExercisesByScheduledId[s.id] ?? [],
    template: {
      ...templatesById[s.template_id],
      template_exercises: templateExercisesByTemplateId[s.template_id] ?? [],
    },
  }))
}

export async function getScheduledWorkoutsByDay(
  dayOfWeek: number
): Promise<ScheduledWorkoutWithDetails[]> {
  const all = await getScheduledWorkouts()
  return all.filter((s) => s.day_of_week === dayOfWeek)
}

export async function scheduleWorkout(
  templateId: string,
  dayOfWeek: number,
  exercises: Omit<ScheduledExerciseInsert, 'scheduled_workout_id'>[]
): Promise<ScheduledWorkoutWithDetails> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Create scheduled workout
  const { data: scheduled, error: scheduledError } = await supabase
    .from('scheduled_workouts')
    .insert({
      user_id: user.id,
      template_id: templateId,
      day_of_week: dayOfWeek,
    })
    .select()
    .single()

  if (scheduledError) throw scheduledError

  // Create scheduled exercises with weights
  let scheduledExercises: ScheduledExercise[] = []
  if (exercises.length > 0) {
    const exercisesWithScheduleId = exercises.map((ex, index) => ({
      scheduled_workout_id: scheduled.id,
      exercise_name: ex.exercise_name,
      target_weight: ex.target_weight ?? 0,
      order_index: ex.order_index ?? index,
    }))

    const { data: newExercises, error: exercisesError } = await supabase
      .from('scheduled_exercises')
      .insert(exercisesWithScheduleId)
      .select()

    if (exercisesError) throw exercisesError
    scheduledExercises = newExercises ?? []
  }

  // Fetch template for response
  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError) throw templateError

  const { data: templateExercises } = await supabase
    .from('template_exercises')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index')

  return {
    ...scheduled,
    scheduled_exercises: scheduledExercises,
    template: {
      ...template,
      template_exercises: templateExercises ?? [],
    },
  }
}

export async function updateScheduledWorkout(
  id: string,
  exercises: Omit<ScheduledExerciseInsert, 'scheduled_workout_id'>[]
): Promise<void> {
  // Delete existing scheduled exercises
  const { error: deleteError } = await supabase
    .from('scheduled_exercises')
    .delete()
    .eq('scheduled_workout_id', id)

  if (deleteError) throw deleteError

  // Insert new exercises
  if (exercises.length > 0) {
    const exercisesWithScheduleId = exercises.map((ex, index) => ({
      scheduled_workout_id: id,
      exercise_name: ex.exercise_name,
      target_weight: ex.target_weight ?? 0,
      order_index: ex.order_index ?? index,
    }))

    const { error: insertError } = await supabase
      .from('scheduled_exercises')
      .insert(exercisesWithScheduleId)

    if (insertError) throw insertError
  }
}

export async function unscheduleWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_workouts')
    .delete()
    .eq('id', id)

  if (error) throw error
}
