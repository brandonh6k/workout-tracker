import { supabase } from '../../lib/supabase'
import type {
  WorkoutTemplate,
  TemplateExercise,
  TemplateExerciseInsert,
} from '../../types'

// Template with its exercises joined
export type TemplateWithExercises = WorkoutTemplate & {
  template_exercises: TemplateExercise[]
}

export async function getTemplates(): Promise<TemplateWithExercises[]> {
  // Fetch templates
  const { data: templates, error: templatesError } = await supabase
    .from('workout_templates')
    .select('*')
    .order('day_of_week', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (templatesError) throw templatesError
  if (!templates || templates.length === 0) return []

  // Fetch all exercises for these templates
  const templateIds = templates.map((t) => t.id)
  const { data: exercises, error: exercisesError } = await supabase
    .from('template_exercises')
    .select('*')
    .in('template_id', templateIds)
    .order('order_index')

  if (exercisesError) throw exercisesError

  // Group exercises by template
  const exercisesByTemplate = (exercises ?? []).reduce(
    (acc, ex) => {
      if (!acc[ex.template_id]) acc[ex.template_id] = []
      acc[ex.template_id].push(ex)
      return acc
    },
    {} as Record<string, TemplateExercise[]>
  )

  return templates.map((template) => ({
    ...template,
    template_exercises: exercisesByTemplate[template.id] ?? [],
  }))
}

export async function getTemplate(id: string): Promise<TemplateWithExercises | null> {
  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (templateError) {
    if (templateError.code === 'PGRST116') return null // Not found
    throw templateError
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from('template_exercises')
    .select('*')
    .eq('template_id', id)
    .order('order_index')

  if (exercisesError) throw exercisesError

  return {
    ...template,
    template_exercises: exercises ?? [],
  }
}

export async function createTemplate(
  template: { name: string; day_of_week?: number | null; notes?: string | null },
  exercises: Omit<TemplateExerciseInsert, 'template_id'>[]
): Promise<TemplateWithExercises> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Create template
  const { data: newTemplate, error: templateError } = await supabase
    .from('workout_templates')
    .insert({
      user_id: user.id,
      name: template.name,
      day_of_week: template.day_of_week ?? null,
      notes: template.notes ?? null,
    })
    .select()
    .single()

  if (templateError) throw templateError

  // Create exercises if any
  let templateExercises: TemplateExercise[] = []
  if (exercises.length > 0) {
    const exercisesWithTemplateId = exercises.map((ex, index) => ({
      template_id: newTemplate.id,
      exercise_name: ex.exercise_name,
      target_sets: ex.target_sets,
      target_reps_min: ex.target_reps_min,
      target_reps_max: ex.target_reps_max ?? null,
      order_index: ex.order_index ?? index,
      notes: ex.notes ?? null,
    }))

    const { data: newExercises, error: exercisesError } = await supabase
      .from('template_exercises')
      .insert(exercisesWithTemplateId)
      .select()

    if (exercisesError) throw exercisesError
    templateExercises = newExercises ?? []
  }

  return {
    ...newTemplate,
    template_exercises: templateExercises,
  }
}

export async function updateTemplate(
  id: string,
  template: { name?: string; day_of_week?: number | null; notes?: string | null },
  exercises?: Omit<TemplateExerciseInsert, 'template_id'>[]
): Promise<TemplateWithExercises> {
  // Update template
  const { data: updatedTemplate, error: templateError } = await supabase
    .from('workout_templates')
    .update({
      name: template.name,
      day_of_week: template.day_of_week,
      notes: template.notes,
    })
    .eq('id', id)
    .select()
    .single()

  if (templateError) throw templateError

  // If exercises provided, replace all exercises
  let templateExercises: TemplateExercise[] = []
  if (exercises !== undefined) {
    // Delete existing exercises
    const { error: deleteError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', id)

    if (deleteError) throw deleteError

    // Insert new exercises
    if (exercises.length > 0) {
      const exercisesWithTemplateId = exercises.map((ex, index) => ({
        template_id: id,
        exercise_name: ex.exercise_name,
        target_sets: ex.target_sets,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max ?? null,
        order_index: ex.order_index ?? index,
        notes: ex.notes ?? null,
      }))

      const { data: newExercises, error: exercisesError } = await supabase
        .from('template_exercises')
        .insert(exercisesWithTemplateId)
        .select()

      if (exercisesError) throw exercisesError
      templateExercises = newExercises ?? []
    }
  } else {
    // Fetch existing exercises
    const { data: existingExercises } = await supabase
      .from('template_exercises')
      .select('*')
      .eq('template_id', id)
      .order('order_index')

    templateExercises = existingExercises ?? []
  }

  return {
    ...updatedTemplate,
    template_exercises: templateExercises,
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function duplicateTemplate(id: string): Promise<TemplateWithExercises> {
  const original = await getTemplate(id)
  if (!original) throw new Error('Template not found')

  return createTemplate(
    {
      name: `${original.name} (Copy)`,
      day_of_week: original.day_of_week,
      notes: original.notes,
    },
    original.template_exercises.map((ex) => ({
      exercise_name: ex.exercise_name,
      target_sets: ex.target_sets,
      target_reps_min: ex.target_reps_min,
      target_reps_max: ex.target_reps_max,
      order_index: ex.order_index,
      notes: ex.notes,
    }))
  )
}
