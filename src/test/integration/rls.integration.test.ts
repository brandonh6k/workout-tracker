import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  cleanupTestUser,
  seedTemplate,
  seedWorkoutSession,
  type TestUser,
} from './helpers'

let userA: TestUser
let userB: TestUser

// User B's data (created in beforeAll)
let userBTemplateId: string
let userBSessionId: string
let userBScheduledId: string
let userBCustomExerciseId: string

beforeAll(async () => {
  userA = await createTestUser('rls-a')
  userB = await createTestUser('rls-b')

  // Seed data for User B
  const { template } = await seedTemplate(userB.client, {
    name: "B's Template",
    exercises: [{ exercise_name: 'Squat' }],
  })
  userBTemplateId = template.id

  const { session } = await seedWorkoutSession(userB.client, template.id, [
    { exercise_name: 'Squat', set_number: 1, weight: 225, reps: 5 },
  ])
  userBSessionId = session.id

  const { data: scheduled } = await userB.client
    .from('scheduled_workouts')
    .insert({
      user_id: userB.id,
      template_id: template.id,
      day_of_week: 1,
    })
    .select()
    .single()
  userBScheduledId = scheduled!.id

  await userB.client.from('scheduled_exercises').insert({
    scheduled_workout_id: scheduled!.id,
    exercise_name: 'Squat',
    target_weight: 225,
    order_index: 0,
  })

  const { data: customEx } = await userB.client
    .from('exercises')
    .insert({
      user_id: userB.id,
      name: "B's Custom Exercise",
      is_custom: true,
      exercise_type: 'weighted',
    })
    .select()
    .single()
  userBCustomExerciseId = customEx!.id
})

afterAll(async () => {
  await cleanupTestUser(userA.id)
  await cleanupTestUser(userB.id)
})

describe('RLS - Cross-user isolation', () => {
  it("User A cannot read User B's templates", async () => {
    const { data } = await userA.client
      .from('workout_templates')
      .select('*')
      .eq('id', userBTemplateId)

    expect(data).toEqual([])
  })

  it("User A cannot read User B's sessions", async () => {
    const { data } = await userA.client
      .from('workout_sessions')
      .select('*')
      .eq('id', userBSessionId)

    expect(data).toEqual([])
  })

  it("User A cannot read User B's schedule", async () => {
    const { data } = await userA.client
      .from('scheduled_workouts')
      .select('*')
      .eq('id', userBScheduledId)

    expect(data).toEqual([])
  })

  it("User A cannot read User B's custom exercises", async () => {
    const { data } = await userA.client
      .from('exercises')
      .select('*')
      .eq('id', userBCustomExerciseId)

    expect(data).toEqual([])
  })

  it("User A cannot insert into User B's session", async () => {
    const { error } = await userA.client.from('logged_sets').insert({
      session_id: userBSessionId,
      exercise_name: 'Malicious Set',
      set_number: 99,
      weight: 999,
      reps: 999,
    })

    // RLS should block this — either an error or the insert silently fails
    if (!error) {
      // If no error, verify the set wasn't actually created
      const { data: sets } = await userB.client
        .from('logged_sets')
        .select('*')
        .eq('session_id', userBSessionId)
        .eq('exercise_name', 'Malicious Set')
      expect(sets).toEqual([])
    } else {
      expect(error).toBeTruthy()
    }
  })

  it("User A cannot update User B's template", async () => {
    const { data } = await userA.client
      .from('workout_templates')
      .update({ name: 'Hacked Template' })
      .eq('id', userBTemplateId)
      .select()

    // RLS filters mean zero rows matched
    expect(data).toEqual([])

    // Verify B's template is unchanged
    const { data: original } = await userB.client
      .from('workout_templates')
      .select('name')
      .eq('id', userBTemplateId)
      .single()

    expect(original!.name).toBe("B's Template")
  })

  it('both users can read global exercises', async () => {
    const { data: aExercises } = await userA.client
      .from('exercises')
      .select('*')
      .is('user_id', null)

    const { data: bExercises } = await userB.client
      .from('exercises')
      .select('*')
      .is('user_id', null)

    expect(aExercises!.length).toBeGreaterThan(0)
    expect(aExercises!.length).toBe(bExercises!.length)
  })
})
