import { supabase } from '../../lib/supabase'
import type { Exercise, ExerciseType } from '../../types'

export async function getExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  if (!query.trim()) {
    return getExercises()
  }

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function createCustomExercise(
  name: string,
  exerciseType: ExerciseType = 'weighted',
  category?: string
): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: user.id,
      name: name.trim(),
      category: category ?? null,
      is_custom: true,
      exercise_type: exerciseType,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
