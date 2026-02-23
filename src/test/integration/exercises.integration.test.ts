import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  cleanupTestUser,
  seedTemplate,
  seedWorkoutSession,
  type TestUser,
} from './helpers'

let user: TestUser

beforeAll(async () => {
  user = await createTestUser('exer')
})

afterAll(async () => {
  await cleanupTestUser(user.id)
})

describe('Exercises', () => {
  it('global exercises are visible (user_id is null)', async () => {
    const { data, error } = await user.client
      .from('exercises')
      .select('*')
      .is('user_id', null)

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(40) // 46 seeded
  })

  it('creates a custom exercise with user_id', async () => {
    const { data, error } = await user.client
      .from('exercises')
      .insert({
        user_id: user.id,
        name: 'Zercher Squat',
        category: 'Legs',
        is_custom: true,
        exercise_type: 'weighted',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.user_id).toBe(user.id)
    expect(data!.is_custom).toBe(true)
    expect(data!.name).toBe('Zercher Squat')
  })

  it('custom and global exercises appear together', async () => {
    const { data } = await user.client
      .from('exercises')
      .select('*')
      .order('name')

    const custom = data!.filter((e) => e.user_id === user.id)
    const global = data!.filter((e) => e.user_id === null)

    expect(custom.length).toBeGreaterThan(0)
    expect(global.length).toBeGreaterThan(0)
    // Total should include both
    expect(data!.length).toBe(custom.length + global.length)
  })

  it('deletes own custom exercise', async () => {
    const { data: created } = await user.client
      .from('exercises')
      .insert({
        user_id: user.id,
        name: 'To Delete Exercise',
        is_custom: true,
        exercise_type: 'weighted',
      })
      .select()
      .single()

    const { error } = await user.client
      .from('exercises')
      .delete()
      .eq('id', created!.id)

    expect(error).toBeNull()

    const { data: remaining } = await user.client
      .from('exercises')
      .select('*')
      .eq('id', created!.id)

    expect(remaining).toEqual([])
  })

  it('search returns case-insensitive matches', async () => {
    // "Bench Press" is a seeded global exercise
    const { data, error } = await user.client
      .from('exercises')
      .select('*')
      .ilike('name', '%bench%')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect(
      data!.some((e) => e.name.toLowerCase().includes('bench'))
    ).toBe(true)
  })

  it('merge renames exercise across logged_sets, template_exercises, and scheduled_exercises', async () => {
    // Create template with old exercise name
    const { template } = await seedTemplate(user.client, {
      name: 'Merge Test Template',
      exercises: [{ exercise_name: 'Old Exercise Name' }],
    })

    // Create a session with logged sets using old name
    const { session } = await seedWorkoutSession(
      user.client,
      template.id,
      [
        {
          exercise_name: 'Old Exercise Name',
          set_number: 1,
          weight: 100,
          reps: 10,
        },
      ]
    )

    // Schedule with old name
    const { data: scheduled } = await user.client
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id: template.id,
        day_of_week: 2,
      })
      .select()
      .single()

    await user.client.from('scheduled_exercises').insert({
      scheduled_workout_id: scheduled!.id,
      exercise_name: 'Old Exercise Name',
      target_weight: 100,
      order_index: 0,
    })

    // Perform the "merge" (rename across all tables)
    const newName = 'New Exercise Name'

    await user.client
      .from('template_exercises')
      .update({ exercise_name: newName })
      .eq('exercise_name', 'Old Exercise Name')
      .eq('template_id', template.id)

    await user.client
      .from('logged_sets')
      .update({ exercise_name: newName })
      .eq('exercise_name', 'Old Exercise Name')
      .eq('session_id', session.id)

    await user.client
      .from('scheduled_exercises')
      .update({ exercise_name: newName })
      .eq('exercise_name', 'Old Exercise Name')
      .eq('scheduled_workout_id', scheduled!.id)

    // Verify all renamed
    const { data: tExs } = await user.client
      .from('template_exercises')
      .select('*')
      .eq('template_id', template.id)
    expect(tExs!.every((e) => e.exercise_name === newName)).toBe(true)

    const { data: lSets } = await user.client
      .from('logged_sets')
      .select('*')
      .eq('session_id', session.id)
    expect(lSets!.every((s) => s.exercise_name === newName)).toBe(true)

    const { data: sExs } = await user.client
      .from('scheduled_exercises')
      .select('*')
      .eq('scheduled_workout_id', scheduled!.id)
    expect(sExs!.every((e) => e.exercise_name === newName)).toBe(true)
  })
})
