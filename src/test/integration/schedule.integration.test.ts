import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  cleanupTestUser,
  seedTemplate,
  type TestUser,
} from './helpers'

let user: TestUser
let templateId: string

beforeAll(async () => {
  user = await createTestUser('sched')
  const { template } = await seedTemplate(user.client)
  templateId = template.id
})

afterAll(async () => {
  await cleanupTestUser(user.id)
})

describe('Schedule', () => {
  it('schedules a template on a day of week with target weights', async () => {
    const { data: scheduled, error } = await user.client
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id: templateId,
        day_of_week: 1, // Monday
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(scheduled!.day_of_week).toBe(1)
    expect(scheduled!.template_id).toBe(templateId)

    // Add target weights
    const { data: exercises, error: exErr } = await user.client
      .from('scheduled_exercises')
      .insert([
        {
          scheduled_workout_id: scheduled!.id,
          exercise_name: 'Bench Press',
          target_weight: 185,
          order_index: 0,
        },
        {
          scheduled_workout_id: scheduled!.id,
          exercise_name: 'Squat',
          target_weight: 225,
          order_index: 1,
        },
      ])
      .select()

    expect(exErr).toBeNull()
    expect(exercises).toHaveLength(2)
    expect(exercises![0].target_weight).toBe(185)

    // Cleanup
    await user.client
      .from('scheduled_workouts')
      .delete()
      .eq('id', scheduled!.id)
  })

  it('rejects duplicate schedule (same template + same day)', async () => {
    const { data: first } = await user.client
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id: templateId,
        day_of_week: 3, // Wednesday
      })
      .select()
      .single()

    const { error } = await user.client.from('scheduled_workouts').insert({
      user_id: user.id,
      template_id: templateId,
      day_of_week: 3,
    })

    expect(error).toBeTruthy()
    expect(error!.code).toBe('23505') // unique_violation

    await user.client
      .from('scheduled_workouts')
      .delete()
      .eq('id', first!.id)
  })

  it('updates scheduled exercises (replace target weights)', async () => {
    const { data: scheduled } = await user.client
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id: templateId,
        day_of_week: 5,
      })
      .select()
      .single()

    await user.client.from('scheduled_exercises').insert({
      scheduled_workout_id: scheduled!.id,
      exercise_name: 'Bench Press',
      target_weight: 185,
      order_index: 0,
    })

    // Replace exercises
    await user.client
      .from('scheduled_exercises')
      .delete()
      .eq('scheduled_workout_id', scheduled!.id)

    const { data: updated, error } = await user.client
      .from('scheduled_exercises')
      .insert({
        scheduled_workout_id: scheduled!.id,
        exercise_name: 'Bench Press',
        target_weight: 195,
        order_index: 0,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.target_weight).toBe(195)

    await user.client
      .from('scheduled_workouts')
      .delete()
      .eq('id', scheduled!.id)
  })

  it('unschedule cascades to scheduled_exercises', async () => {
    const { data: scheduled } = await user.client
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id: templateId,
        day_of_week: 6,
      })
      .select()
      .single()

    await user.client.from('scheduled_exercises').insert([
      {
        scheduled_workout_id: scheduled!.id,
        exercise_name: 'Squat',
        target_weight: 225,
        order_index: 0,
      },
      {
        scheduled_workout_id: scheduled!.id,
        exercise_name: 'Deadlift',
        target_weight: 315,
        order_index: 1,
      },
    ])

    // Delete the scheduled workout
    await user.client
      .from('scheduled_workouts')
      .delete()
      .eq('id', scheduled!.id)

    // Exercises should be gone (cascade)
    const { data: orphans } = await user.client
      .from('scheduled_exercises')
      .select('*')
      .eq('scheduled_workout_id', scheduled!.id)

    expect(orphans).toEqual([])
  })

  it('getScheduledWorkouts returns full details', async () => {
    const { data: scheduled } = await user.client
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id: templateId,
        day_of_week: 0, // Sunday
      })
      .select()
      .single()

    await user.client.from('scheduled_exercises').insert([
      {
        scheduled_workout_id: scheduled!.id,
        exercise_name: 'Bench Press',
        target_weight: 185,
        order_index: 0,
      },
    ])

    // Query the way the app does
    const { data: workouts } = await user.client
      .from('scheduled_workouts')
      .select('*')
      .order('day_of_week')

    expect(workouts!.length).toBeGreaterThan(0)

    const sunday = workouts!.find((w) => w.day_of_week === 0)
    expect(sunday).toBeTruthy()

    const { data: exercises } = await user.client
      .from('scheduled_exercises')
      .select('*')
      .eq('scheduled_workout_id', sunday!.id)
      .order('order_index')

    expect(exercises).toHaveLength(1)
    expect(exercises![0].exercise_name).toBe('Bench Press')
    expect(exercises![0].target_weight).toBe(185)

    await user.client
      .from('scheduled_workouts')
      .delete()
      .eq('id', scheduled!.id)
  })
})
