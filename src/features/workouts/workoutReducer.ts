// Workout state management with useReducer
// Extracted for testability and cleaner state mutations

export type SetData = {
  id?: string // DB id once saved
  reps: number
  weight: number
  completed: boolean
}

export type ExerciseState = {
  name: string
  targetSets: number
  targetReps: number
  targetWeight: number
  isAmrap: boolean
  restSeconds: number
  sets: SetData[]
}

export type WorkoutPhase =
  | { type: 'active-set' }
  | {
      type: 'resting'
      restTimerEnd: number
      lastCompletedExerciseIndex: number
      lastCompletedSetIndex: number
      isAmrap: boolean
    }

export type WorkoutState = {
  sessionId: string
  exercises: ExerciseState[]
  currentExerciseIndex: number
  currentSetIndex: number
  startTime: number
  phase: WorkoutPhase
}

export type WorkoutAction =
  | { type: 'INITIALIZE'; payload: WorkoutState }
  | { type: 'COMPLETE_SET'; payload: { loggedSetId: string } }
  | { type: 'ADJUST_WEIGHT'; payload: { delta: number } }
  | { type: 'ADJUST_REPS'; payload: { delta: number } }
  | { type: 'ADJUST_LAST_COMPLETED_REPS'; payload: { delta: number } }
  | { type: 'REVERT_LAST_COMPLETED_REPS'; payload: { originalReps: number } }
  | { type: 'SKIP_REST' }
  | { type: 'EXTEND_REST' }
  | { type: 'SKIP_EXERCISE' }
  | { type: 'REST_TIMER_EXPIRED' }

export function workoutReducer(
  state: WorkoutState | null,
  action: WorkoutAction
): WorkoutState | null {
  switch (action.type) {
    case 'INITIALIZE':
      return action.payload

    case 'COMPLETE_SET': {
      if (!state) return null

      const newExercises = [...state.exercises]
      const exercise = { ...newExercises[state.currentExerciseIndex] }
      const sets = [...exercise.sets]
      const completedReps = sets[state.currentSetIndex].reps

      // Mark current set as completed with DB id
      sets[state.currentSetIndex] = {
        ...sets[state.currentSetIndex],
        id: action.payload.loggedSetId,
        completed: true,
      }

      // For AMRAP: pre-fill next set with the reps we just did
      if (exercise.isAmrap && state.currentSetIndex + 1 < exercise.targetSets) {
        sets[state.currentSetIndex + 1] = {
          ...sets[state.currentSetIndex + 1],
          reps: completedReps,
        }
      }

      exercise.sets = sets
      newExercises[state.currentExerciseIndex] = exercise

      // Advance to next set or exercise
      let nextExerciseIndex = state.currentExerciseIndex
      let nextSetIndex = state.currentSetIndex + 1

      if (nextSetIndex >= exercise.targetSets) {
        nextSetIndex = 0
        nextExerciseIndex = state.currentExerciseIndex + 1
      }

      return {
        ...state,
        exercises: newExercises,
        currentExerciseIndex: nextExerciseIndex,
        currentSetIndex: nextSetIndex,
        phase: {
          type: 'resting',
          restTimerEnd: Date.now() + exercise.restSeconds * 1000,
          lastCompletedExerciseIndex: state.currentExerciseIndex,
          lastCompletedSetIndex: state.currentSetIndex,
          isAmrap: exercise.isAmrap,
        },
      }
    }

    case 'ADJUST_WEIGHT': {
      if (!state) return null

      const newExercises = [...state.exercises]
      const exercise = { ...newExercises[state.currentExerciseIndex] }
      const sets = [...exercise.sets]
      const newWeight = Math.max(0, sets[state.currentSetIndex].weight + action.payload.delta)

      // Update current set and all remaining uncompleted sets
      for (let i = state.currentSetIndex; i < sets.length; i++) {
        if (!sets[i].completed) {
          sets[i] = { ...sets[i], weight: newWeight }
        }
      }

      exercise.sets = sets
      newExercises[state.currentExerciseIndex] = exercise
      return { ...state, exercises: newExercises }
    }

    case 'ADJUST_REPS': {
      if (!state) return null

      const newExercises = [...state.exercises]
      const exercise = { ...newExercises[state.currentExerciseIndex] }
      const sets = [...exercise.sets]
      sets[state.currentSetIndex] = {
        ...sets[state.currentSetIndex],
        reps: Math.max(1, sets[state.currentSetIndex].reps + action.payload.delta),
      }
      exercise.sets = sets
      newExercises[state.currentExerciseIndex] = exercise
      return { ...state, exercises: newExercises }
    }

    case 'ADJUST_LAST_COMPLETED_REPS': {
      if (!state || state.phase.type !== 'resting') return state

      const { lastCompletedExerciseIndex, lastCompletedSetIndex } = state.phase
      const currentReps = state.exercises[lastCompletedExerciseIndex].sets[lastCompletedSetIndex].reps
      const newReps = Math.max(1, currentReps + action.payload.delta)

      const newExercises = [...state.exercises]
      const exercise = { ...newExercises[lastCompletedExerciseIndex] }
      const sets = [...exercise.sets]
      sets[lastCompletedSetIndex] = {
        ...sets[lastCompletedSetIndex],
        reps: newReps,
      }
      exercise.sets = sets
      newExercises[lastCompletedExerciseIndex] = exercise
      return { ...state, exercises: newExercises }
    }

    case 'REVERT_LAST_COMPLETED_REPS': {
      if (!state || state.phase.type !== 'resting') return state

      const { lastCompletedExerciseIndex, lastCompletedSetIndex } = state.phase

      const newExercises = [...state.exercises]
      const exercise = { ...newExercises[lastCompletedExerciseIndex] }
      const sets = [...exercise.sets]
      sets[lastCompletedSetIndex] = {
        ...sets[lastCompletedSetIndex],
        reps: action.payload.originalReps,
      }
      exercise.sets = sets
      newExercises[lastCompletedExerciseIndex] = exercise
      return { ...state, exercises: newExercises }
    }

    case 'SKIP_REST':
      if (!state) return null
      return { ...state, phase: { type: 'active-set' } }

    case 'EXTEND_REST': {
      if (!state || state.phase.type !== 'resting') return state
      return {
        ...state,
        phase: { ...state.phase, restTimerEnd: state.phase.restTimerEnd + 30 * 1000 },
      }
    }

    case 'SKIP_EXERCISE': {
      if (!state) return null
      return {
        ...state,
        currentExerciseIndex: state.currentExerciseIndex + 1,
        currentSetIndex: 0,
        phase: { type: 'active-set' },
      }
    }

    case 'REST_TIMER_EXPIRED':
      if (!state) return null
      return { ...state, phase: { type: 'active-set' } }

    default:
      return state
  }
}

// Helper to build initial state from scheduled workout
export function buildInitialState(
  sessionId: string,
  scheduledWorkout: {
    template: {
      template_exercises: Array<{
        exercise_name: string
        target_sets: number
        target_reps: number
        is_amrap: boolean
        rest_seconds?: number
      }>
    }
    scheduled_exercises: Array<{
      exercise_name: string
      target_weight: number
    }>
  }
): WorkoutState {
  const exercises: ExerciseState[] = scheduledWorkout.template.template_exercises.map((ex) => {
    const scheduledEx = scheduledWorkout.scheduled_exercises.find(
      (se) => se.exercise_name === ex.exercise_name
    )
    const targetWeight = scheduledEx?.target_weight ?? 0

    return {
      name: ex.exercise_name,
      targetSets: ex.target_sets,
      targetReps: ex.target_reps,
      targetWeight,
      isAmrap: ex.is_amrap,
      restSeconds: ex.rest_seconds ?? 90,
      sets: Array.from({ length: ex.target_sets }, () => ({
        reps: ex.target_reps,
        weight: targetWeight,
        completed: false,
      })),
    }
  })

  return {
    sessionId,
    exercises,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    startTime: Date.now(),
    phase: { type: 'active-set' },
  }
}
