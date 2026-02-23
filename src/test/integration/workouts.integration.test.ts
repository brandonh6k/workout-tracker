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
  user = await createTestUser('wkt')
  const { template } = await seedTemplate(user.client)
  templateId = template.id
})

afterAll(async () => {
  await cleanupTestUser(user.id)
})

describe('Workouts', () => {
  it('creates an incomplete session linked to a template', async () => {
    const { data, error } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-15',
        completed: false,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.completed).toBe(false)
    expect(data!.template_id).toBe(templateId)

    // Cleanup this session for subsequent tests
    await user.client.from('workout_sessions').delete().eq('id', data!.id)
  })

  it('logs sets within a session', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-16',
        completed: false,
      })
      .select()
      .single()

    const { data: set, error } = await user.client
      .from('logged_sets')
      .insert({
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 1,
        weight: 185,
        reps: 8,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(set!.weight).toBe(185)
    expect(set!.reps).toBe(8)
    expect(set!.exercise_name).toBe('Bench Press')

    // Cleanup
    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('updates a logged set', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-17',
        completed: false,
      })
      .select()
      .single()

    const { data: set } = await user.client
      .from('logged_sets')
      .insert({
        session_id: session!.id,
        exercise_name: 'Squat',
        set_number: 1,
        weight: 225,
        reps: 5,
      })
      .select()
      .single()

    const { data: updated, error } = await user.client
      .from('logged_sets')
      .update({ weight: 235, reps: 4 })
      .eq('id', set!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.weight).toBe(235)
    expect(updated!.reps).toBe(4)

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('deletes a logged set', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-18',
        completed: false,
      })
      .select()
      .single()

    const { data: set } = await user.client
      .from('logged_sets')
      .insert({
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 1,
        weight: 185,
        reps: 8,
      })
      .select()
      .single()

    await user.client.from('logged_sets').delete().eq('id', set!.id)

    const { data: remaining } = await user.client
      .from('logged_sets')
      .select('*')
      .eq('id', set!.id)

    expect(remaining).toEqual([])

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('completes a session with duration and notes', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-19',
        completed: false,
      })
      .select()
      .single()

    const { data: completed, error } = await user.client
      .from('workout_sessions')
      .update({
        completed: true,
        duration_minutes: 55,
        notes: 'Felt strong today',
      })
      .eq('id', session!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(completed!.completed).toBe(true)
    expect(completed!.duration_minutes).toBe(55)
    expect(completed!.notes).toBe('Felt strong today')

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('deleting a session cascades to logged_sets', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-20',
        completed: false,
      })
      .select()
      .single()

    await user.client.from('logged_sets').insert([
      {
        session_id: session!.id,
        exercise_name: 'Squat',
        set_number: 1,
        weight: 225,
        reps: 5,
      },
      {
        session_id: session!.id,
        exercise_name: 'Squat',
        set_number: 2,
        weight: 225,
        reps: 5,
      },
    ])

    // Delete session
    await user.client.from('workout_sessions').delete().eq('id', session!.id)

    // Verify sets are gone
    const { data: orphanSets } = await user.client
      .from('logged_sets')
      .select('*')
      .eq('session_id', session!.id)

    expect(orphanSets).toEqual([])
  })

  it('logs a set with RPE and notes', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-21',
        completed: false,
      })
      .select()
      .single()

    const { data: set, error } = await user.client
      .from('logged_sets')
      .insert({
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 1,
        weight: 185,
        reps: 8,
        rpe: 8,
        notes: 'Felt strong, good arch',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(set!.rpe).toBe(8)
    expect(set!.notes).toBe('Felt strong, good arch')

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('defaults RPE and notes to null when not provided', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-22',
        completed: false,
      })
      .select()
      .single()

    const { data: set } = await user.client
      .from('logged_sets')
      .insert({
        session_id: session!.id,
        exercise_name: 'Squat',
        set_number: 1,
        weight: 225,
        reps: 5,
      })
      .select()
      .single()

    expect(set!.rpe).toBeNull()
    expect(set!.notes).toBeNull()

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('updates RPE and notes on an existing set', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-23',
        completed: false,
      })
      .select()
      .single()

    const { data: set } = await user.client
      .from('logged_sets')
      .insert({
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 1,
        weight: 185,
        reps: 8,
      })
      .select()
      .single()

    // Add RPE and notes after the fact
    const { data: updated, error } = await user.client
      .from('logged_sets')
      .update({ rpe: 9, notes: 'Grinder rep' })
      .eq('id', set!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.rpe).toBe(9)
    expect(updated!.notes).toBe('Grinder rep')

    // Clear them
    const { data: cleared } = await user.client
      .from('logged_sets')
      .update({ rpe: null, notes: null })
      .eq('id', set!.id)
      .select()
      .single()

    expect(cleared!.rpe).toBeNull()
    expect(cleared!.notes).toBeNull()

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('RPE and notes persist through session completion and retrieval', async () => {
    const { data: session } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-01-24',
        completed: false,
      })
      .select()
      .single()

    // Log sets with varying RPE/notes
    await user.client.from('logged_sets').insert([
      {
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 1,
        weight: 185,
        reps: 8,
        rpe: 7,
        notes: 'Warm-up feel',
      },
      {
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 2,
        weight: 185,
        reps: 8,
        rpe: 9,
      },
      {
        session_id: session!.id,
        exercise_name: 'Bench Press',
        set_number: 3,
        weight: 185,
        reps: 6,
        notes: 'Failed rep 7',
      },
    ])

    // Complete the session
    await user.client
      .from('workout_sessions')
      .update({ completed: true, duration_minutes: 30 })
      .eq('id', session!.id)

    // Retrieve sets the way the history view does
    const { data: sets } = await user.client
      .from('logged_sets')
      .select('*')
      .eq('session_id', session!.id)
      .order('set_number')

    expect(sets).toHaveLength(3)

    expect(sets![0].rpe).toBe(7)
    expect(sets![0].notes).toBe('Warm-up feel')

    expect(sets![1].rpe).toBe(9)
    expect(sets![1].notes).toBeNull()

    expect(sets![2].rpe).toBeNull()
    expect(sets![2].notes).toBe('Failed rep 7')

    await user.client.from('workout_sessions').delete().eq('id', session!.id)
  })

  it('fetches completed sessions ordered by date desc', async () => {
    // Seed two completed sessions with different dates
    const { data: s1 } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-02-01',
        completed: true,
      })
      .select()
      .single()

    const { data: s2 } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-02-05',
        completed: true,
      })
      .select()
      .single()

    // Also an incomplete session that should be excluded
    const { data: s3 } = await user.client
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        date: '2025-02-10',
        completed: false,
      })
      .select()
      .single()

    const { data: sessions } = await user.client
      .from('workout_sessions')
      .select('*')
      .eq('completed', true)
      .order('date', { ascending: false })

    expect(sessions!.length).toBeGreaterThanOrEqual(2)
    // Most recent first
    const dates = sessions!.map((s) => s.date)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] >= dates[i]).toBe(true)
    }
    // Incomplete not included
    expect(sessions!.find((s) => s.id === s3!.id)).toBeUndefined()

    // Cleanup
    await user.client.from('workout_sessions').delete().eq('id', s1!.id)
    await user.client.from('workout_sessions').delete().eq('id', s2!.id)
    await user.client.from('workout_sessions').delete().eq('id', s3!.id)
  })
})
