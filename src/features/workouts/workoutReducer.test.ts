import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  workoutReducer,
  buildInitialState,
  type WorkoutState,
} from './workoutReducer'

// Helper to create a minimal test state
function createTestState(overrides?: Partial<WorkoutState>): WorkoutState {
  return {
    sessionId: 'test-session-id',
    exercises: [
      {
        name: 'Squat',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 135,
        isAmrap: false,
        restSeconds: 90,
        sets: [
          { reps: 8, weight: 135, completed: false },
          { reps: 8, weight: 135, completed: false },
          { reps: 8, weight: 135, completed: false },
        ],
      },
      {
        name: 'Bench Press',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 95,
        isAmrap: false,
        restSeconds: 90,
        sets: [
          { reps: 8, weight: 95, completed: false },
          { reps: 8, weight: 95, completed: false },
          { reps: 8, weight: 95, completed: false },
        ],
      },
    ],
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    startTime: Date.now(),
    phase: { type: 'active-set' },
    ...overrides,
  }
}

describe('workoutReducer', () => {
  // Mock Date.now for consistent rest timer tests
  const mockNow = 1700000000000
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('INITIALIZE', () => {
    it('should set the initial state', () => {
      const initialState = createTestState()
      const result = workoutReducer(null, { type: 'INITIALIZE', payload: initialState })
      expect(result).toEqual(initialState)
    })
  })

  describe('COMPLETE_SET', () => {
    it('should mark the current set as completed', () => {
      const state = createTestState()
      const result = workoutReducer(state, {
        type: 'COMPLETE_SET',
        payload: { loggedSetId: 'set-123' },
      })

      expect(result?.exercises[0].sets[0].completed).toBe(true)
      expect(result?.exercises[0].sets[0].id).toBe('set-123')
    })

    it('should advance to the next set', () => {
      const state = createTestState()
      const result = workoutReducer(state, {
        type: 'COMPLETE_SET',
        payload: { loggedSetId: 'set-123' },
      })

      expect(result?.currentSetIndex).toBe(1)
      expect(result?.currentExerciseIndex).toBe(0)
    })

    it('should advance to next exercise when last set is completed', () => {
      const state = createTestState({ currentSetIndex: 2 })
      const result = workoutReducer(state, {
        type: 'COMPLETE_SET',
        payload: { loggedSetId: 'set-123' },
      })

      expect(result?.currentSetIndex).toBe(0)
      expect(result?.currentExerciseIndex).toBe(1)
    })

    it('should enter resting phase with correct timer', () => {
      const state = createTestState()
      const result = workoutReducer(state, {
        type: 'COMPLETE_SET',
        payload: { loggedSetId: 'set-123' },
      })

      expect(result?.phase.type).toBe('resting')
      if (result?.phase.type === 'resting') {
        expect(result.phase.restTimerEnd).toBe(mockNow + 90 * 1000)
        expect(result.phase.lastCompletedExerciseIndex).toBe(0)
        expect(result.phase.lastCompletedSetIndex).toBe(0)
      }
    })

    it('should pre-fill next set reps for AMRAP exercises', () => {
      const state = createTestState()
      state.exercises[0].isAmrap = true
      state.exercises[0].sets[0].reps = 12 // User did 12 reps

      const result = workoutReducer(state, {
        type: 'COMPLETE_SET',
        payload: { loggedSetId: 'set-123' },
      })

      // Next set should be pre-filled with 12 reps
      expect(result?.exercises[0].sets[1].reps).toBe(12)
    })
  })

  describe('ADJUST_WEIGHT', () => {
    it('should increase weight on current and remaining sets', () => {
      const state = createTestState()
      const result = workoutReducer(state, {
        type: 'ADJUST_WEIGHT',
        payload: { delta: 5 },
      })

      expect(result?.exercises[0].sets[0].weight).toBe(140)
      expect(result?.exercises[0].sets[1].weight).toBe(140)
      expect(result?.exercises[0].sets[2].weight).toBe(140)
    })

    it('should not change completed sets', () => {
      const state = createTestState({ currentSetIndex: 1 })
      state.exercises[0].sets[0].completed = true
      state.exercises[0].sets[0].weight = 135

      const result = workoutReducer(state, {
        type: 'ADJUST_WEIGHT',
        payload: { delta: 5 },
      })

      expect(result?.exercises[0].sets[0].weight).toBe(135) // Unchanged
      expect(result?.exercises[0].sets[1].weight).toBe(140) // Changed
      expect(result?.exercises[0].sets[2].weight).toBe(140) // Changed
    })

    it('should not allow negative weight', () => {
      const state = createTestState()
      state.exercises[0].sets[0].weight = 5

      const result = workoutReducer(state, {
        type: 'ADJUST_WEIGHT',
        payload: { delta: -10 },
      })

      expect(result?.exercises[0].sets[0].weight).toBe(0)
    })
  })

  describe('ADJUST_REPS', () => {
    it('should adjust reps on current set only', () => {
      const state = createTestState()
      const result = workoutReducer(state, {
        type: 'ADJUST_REPS',
        payload: { delta: 2 },
      })

      expect(result?.exercises[0].sets[0].reps).toBe(10)
      expect(result?.exercises[0].sets[1].reps).toBe(8) // Unchanged
    })

    it('should not allow less than 1 rep', () => {
      const state = createTestState()
      state.exercises[0].sets[0].reps = 1

      const result = workoutReducer(state, {
        type: 'ADJUST_REPS',
        payload: { delta: -5 },
      })

      expect(result?.exercises[0].sets[0].reps).toBe(1)
    })
  })

  describe('ADJUST_LAST_COMPLETED_REPS', () => {
    it('should adjust reps on the last completed set during rest', () => {
      const state = createTestState({
        phase: {
          type: 'resting',
          restTimerEnd: mockNow + 90000,
          lastCompletedExerciseIndex: 0,
          lastCompletedSetIndex: 0,
          isAmrap: true,
        },
      })
      state.exercises[0].sets[0].completed = true
      state.exercises[0].sets[0].reps = 10

      const result = workoutReducer(state, {
        type: 'ADJUST_LAST_COMPLETED_REPS',
        payload: { delta: 2 },
      })

      expect(result?.exercises[0].sets[0].reps).toBe(12)
    })

    it('should not adjust if not in resting phase', () => {
      const state = createTestState() // active-set phase
      const result = workoutReducer(state, {
        type: 'ADJUST_LAST_COMPLETED_REPS',
        payload: { delta: 2 },
      })

      expect(result).toEqual(state)
    })
  })

  describe('REVERT_LAST_COMPLETED_REPS', () => {
    it('should revert reps to original value', () => {
      const state = createTestState({
        phase: {
          type: 'resting',
          restTimerEnd: mockNow + 90000,
          lastCompletedExerciseIndex: 0,
          lastCompletedSetIndex: 0,
          isAmrap: true,
        },
      })
      state.exercises[0].sets[0].reps = 15 // Was changed

      const result = workoutReducer(state, {
        type: 'REVERT_LAST_COMPLETED_REPS',
        payload: { originalReps: 10 },
      })

      expect(result?.exercises[0].sets[0].reps).toBe(10)
    })
  })

  describe('SKIP_REST', () => {
    it('should transition to active-set phase', () => {
      const state = createTestState({
        phase: {
          type: 'resting',
          restTimerEnd: mockNow + 90000,
          lastCompletedExerciseIndex: 0,
          lastCompletedSetIndex: 0,
          isAmrap: false,
        },
      })

      const result = workoutReducer(state, { type: 'SKIP_REST' })

      expect(result?.phase.type).toBe('active-set')
    })
  })

  describe('EXTEND_REST', () => {
    it('should add 30 seconds to rest timer', () => {
      const state = createTestState({
        phase: {
          type: 'resting',
          restTimerEnd: mockNow + 60000,
          lastCompletedExerciseIndex: 0,
          lastCompletedSetIndex: 0,
          isAmrap: false,
        },
      })

      const result = workoutReducer(state, { type: 'EXTEND_REST' })

      if (result?.phase.type === 'resting') {
        expect(result.phase.restTimerEnd).toBe(mockNow + 60000 + 30000)
      }
    })

    it('should not change state if not in resting phase', () => {
      const state = createTestState() // active-set phase
      const result = workoutReducer(state, { type: 'EXTEND_REST' })

      expect(result).toEqual(state)
    })
  })

  describe('SKIP_EXERCISE', () => {
    it('should advance to next exercise', () => {
      const state = createTestState({ currentSetIndex: 1 })

      const result = workoutReducer(state, { type: 'SKIP_EXERCISE' })

      expect(result?.currentExerciseIndex).toBe(1)
      expect(result?.currentSetIndex).toBe(0)
      expect(result?.phase.type).toBe('active-set')
    })
  })

  describe('REST_TIMER_EXPIRED', () => {
    it('should transition to active-set phase', () => {
      const state = createTestState({
        phase: {
          type: 'resting',
          restTimerEnd: mockNow - 1000, // Already expired
          lastCompletedExerciseIndex: 0,
          lastCompletedSetIndex: 0,
          isAmrap: false,
        },
      })

      const result = workoutReducer(state, { type: 'REST_TIMER_EXPIRED' })

      expect(result?.phase.type).toBe('active-set')
    })
  })
})

describe('buildInitialState', () => {
  it('should build state from scheduled workout', () => {
    const scheduledWorkout = {
      template: {
        template_exercises: [
          {
            exercise_name: 'Squat',
            target_sets: 3,
            target_reps: 8,
            is_amrap: false,
            rest_seconds: 120,
          },
          {
            exercise_name: 'Deadlift',
            target_sets: 2,
            target_reps: 5,
            is_amrap: true,
          },
        ],
      },
      scheduled_exercises: [
        { exercise_name: 'Squat', target_weight: 185 },
        { exercise_name: 'Deadlift', target_weight: 225 },
      ],
    }

    const result = buildInitialState('session-123', scheduledWorkout)

    expect(result.sessionId).toBe('session-123')
    expect(result.exercises).toHaveLength(2)
    expect(result.exercises[0].name).toBe('Squat')
    expect(result.exercises[0].targetWeight).toBe(185)
    expect(result.exercises[0].restSeconds).toBe(120)
    expect(result.exercises[0].sets).toHaveLength(3)
    expect(result.exercises[0].sets[0].weight).toBe(185)
    expect(result.exercises[1].name).toBe('Deadlift')
    expect(result.exercises[1].isAmrap).toBe(true)
    expect(result.exercises[1].restSeconds).toBe(90) // Default
    expect(result.currentExerciseIndex).toBe(0)
    expect(result.currentSetIndex).toBe(0)
    expect(result.phase.type).toBe('active-set')
  })

  it('should default to 0 weight if no scheduled exercise found', () => {
    const scheduledWorkout = {
      template: {
        template_exercises: [
          {
            exercise_name: 'Pull-ups',
            target_sets: 3,
            target_reps: 10,
            is_amrap: false,
          },
        ],
      },
      scheduled_exercises: [], // No weights scheduled
    }

    const result = buildInitialState('session-123', scheduledWorkout)

    expect(result.exercises[0].targetWeight).toBe(0)
    expect(result.exercises[0].sets[0].weight).toBe(0)
  })
})
