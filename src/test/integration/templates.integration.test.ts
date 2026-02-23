import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  cleanupTestUser,
  seedTemplate,
  type TestUser,
} from './helpers'

let user: TestUser

beforeAll(async () => {
  user = await createTestUser('tmpl')
})

afterAll(async () => {
  await cleanupTestUser(user.id)
})

describe('Templates', () => {
  it('creates a template with exercises and correct defaults', async () => {
    const { template, exercises } = await seedTemplate(user.client, {
      name: 'Upper Body',
      exercises: [
        { exercise_name: 'Bench Press', target_sets: 4, target_reps: 6 },
        { exercise_name: 'Overhead Press' },
      ],
    })

    expect(template.name).toBe('Upper Body')
    expect(template.user_id).toBe(user.id)
    expect(exercises).toHaveLength(2)

    // Check defaults
    const ohp = exercises.find((e) => e.exercise_name === 'Overhead Press')!
    expect(ohp.is_amrap).toBe(false)
    expect(ohp.rest_seconds).toBe(90)
    expect(ohp.target_sets).toBe(3)
    expect(ohp.target_reps).toBe(8)
  })

  it('reads all templates for the user with exercises', async () => {
    // Seed a second template
    await seedTemplate(user.client, { name: 'Lower Body' })

    const { data: templates } = await user.client
      .from('workout_templates')
      .select('*')
      .order('name')

    expect(templates!.length).toBeGreaterThanOrEqual(2)
    expect(templates!.some((t) => t.name === 'Upper Body')).toBe(true)
    expect(templates!.some((t) => t.name === 'Lower Body')).toBe(true)

    // Verify exercises load for first template
    const first = templates![0]
    const { data: exercises } = await user.client
      .from('template_exercises')
      .select('*')
      .eq('template_id', first.id)
      .order('order_index')

    expect(exercises!.length).toBeGreaterThan(0)
  })

  it('reads a single template by ID', async () => {
    const { template } = await seedTemplate(user.client, {
      name: 'Single Read',
    })

    const { data, error } = await user.client
      .from('workout_templates')
      .select('*')
      .eq('id', template.id)
      .single()

    expect(error).toBeNull()
    expect(data!.id).toBe(template.id)
    expect(data!.name).toBe('Single Read')
  })

  it('updates template name and notes', async () => {
    const { template } = await seedTemplate(user.client, {
      name: 'Before Update',
    })

    const { data, error } = await user.client
      .from('workout_templates')
      .update({ name: 'After Update', notes: 'Added notes' })
      .eq('id', template.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.name).toBe('After Update')
    expect(data!.notes).toBe('Added notes')
  })

  it('replaces exercises on update', async () => {
    const { template } = await seedTemplate(user.client, {
      exercises: [{ exercise_name: 'Squat' }],
    })

    // Delete old exercises
    await user.client
      .from('template_exercises')
      .delete()
      .eq('template_id', template.id)

    // Insert new exercises
    const { data: newExercises, error } = await user.client
      .from('template_exercises')
      .insert([
        {
          template_id: template.id,
          exercise_name: 'Deadlift',
          target_sets: 5,
          target_reps: 5,
          order_index: 0,
        },
        {
          template_id: template.id,
          exercise_name: 'Barbell Row',
          target_sets: 3,
          target_reps: 10,
          order_index: 1,
        },
      ])
      .select()

    expect(error).toBeNull()
    expect(newExercises).toHaveLength(2)
    expect(newExercises![0].exercise_name).toBe('Deadlift')
  })

  it('deletes a template and cascades to template_exercises', async () => {
    const { template } = await seedTemplate(user.client)

    await user.client
      .from('workout_templates')
      .delete()
      .eq('id', template.id)

    // Template gone
    const { data: tmpl } = await user.client
      .from('workout_templates')
      .select('*')
      .eq('id', template.id)
    expect(tmpl).toEqual([])

    // Exercises gone too (cascade)
    const { data: exs } = await user.client
      .from('template_exercises')
      .select('*')
      .eq('template_id', template.id)
    expect(exs).toEqual([])
  })

  it('duplicates a template with (Copy) suffix and same exercises', async () => {
    const { template, exercises: sourceExercises } = await seedTemplate(
      user.client,
      {
        name: 'Original',
        exercises: [
          {
            exercise_name: 'Bench Press',
            target_sets: 3,
            target_reps: 8,
            is_amrap: true,
            rest_seconds: 120,
          },
        ],
      }
    )

    // Duplicate by creating a new template + copying exercises
    const { data: copy, error: cErr } = await user.client
      .from('workout_templates')
      .insert({
        user_id: user.id,
        name: `${template.name} (Copy)`,
        notes: template.notes,
      })
      .select()
      .single()
    expect(cErr).toBeNull()
    expect(copy!.name).toBe('Original (Copy)')

    const copyExercises = sourceExercises.map((ex) => ({
      template_id: copy!.id,
      exercise_name: ex.exercise_name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      is_amrap: ex.is_amrap,
      rest_seconds: ex.rest_seconds,
      order_index: ex.order_index,
    }))

    const { data: inserted } = await user.client
      .from('template_exercises')
      .insert(copyExercises)
      .select()

    expect(inserted).toHaveLength(sourceExercises.length)
    expect(inserted![0].exercise_name).toBe('Bench Press')
    expect(inserted![0].is_amrap).toBe(true)
    expect(inserted![0].rest_seconds).toBe(120)
  })
})
