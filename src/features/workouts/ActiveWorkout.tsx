import { useState, useEffect, useCallback } from 'react'
import type { ScheduledWorkoutWithDetails } from '../schedule'
import * as api from './api'
import { SetDisplay } from './components'

type SetData = {
  id?: string // DB id once saved
  reps: number
  weight: number
  completed: boolean
}

type ExerciseState = {
  name: string
  targetSets: number
  targetReps: number
  targetWeight: number
  isAmrap: boolean
  restSeconds: number
  sets: SetData[]
}

type WorkoutPhase =
  | { type: 'active-set' }
  | {
      type: 'resting'
      restTimerEnd: number
      lastCompletedExerciseIndex: number
      lastCompletedSetIndex: number
      isAmrap: boolean
    }

type WorkoutState = {
  sessionId: string
  exercises: ExerciseState[]
  currentExerciseIndex: number
  currentSetIndex: number
  startTime: number
  phase: WorkoutPhase
}

type Props = {
  scheduledWorkout: ScheduledWorkoutWithDetails
  onComplete: () => void
  onCancel: () => void
}

export function ActiveWorkout({ scheduledWorkout, onComplete, onCancel }: Props) {
  const [state, setState] = useState<WorkoutState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustMode, setAdjustMode] = useState<'weight' | 'reps' | null>(null)
  const [, setTick] = useState(0)

  // Initialize workout
  useEffect(() => {
    const initWorkout = async () => {
      try {
        const session = await api.startWorkoutSession(scheduledWorkout)

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

        setState({
          sessionId: session.id,
          exercises,
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          startTime: Date.now(),
          phase: { type: 'active-set' },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start workout')
      } finally {
        setIsLoading(false)
      }
    }

    initWorkout()
  }, [scheduledWorkout])

  // Rest timer countdown
  useEffect(() => {
    if (!state || state.phase.type !== 'resting') return
    const restTimerEnd = state.phase.restTimerEnd

    const interval = setInterval(() => {
      setTick((t) => t + 1)
      if (Date.now() >= restTimerEnd) {
        setState((prev) => (prev ? { ...prev, phase: { type: 'active-set' } } : null))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state?.phase])

  const currentExercise = state?.exercises[state.currentExerciseIndex]
  const currentSet = currentExercise?.sets[state?.currentSetIndex ?? 0]

  // Get the last completed set data for AMRAP adjustment (only available during resting phase)
  const lastCompletedSetData =
    state?.phase.type === 'resting'
      ? state.exercises[state.phase.lastCompletedExerciseIndex]?.sets[state.phase.lastCompletedSetIndex]
      : null

  const handleCompleteSet = useCallback(async () => {
    if (!state || !currentExercise || !currentSet) return

    try {
      const loggedSet = await api.logSet(state.sessionId, {
        exercise_name: currentExercise.name,
        set_number: state.currentSetIndex + 1,
        weight: currentSet.weight,
        reps: currentSet.reps,
      })

      setState((prev) => {
        if (!prev) return null

        const newExercises = [...prev.exercises]
        const exercise = { ...newExercises[prev.currentExerciseIndex] }
        const sets = [...exercise.sets]
        const completedReps = sets[prev.currentSetIndex].reps
        sets[prev.currentSetIndex] = { ...sets[prev.currentSetIndex], id: loggedSet.id, completed: true }

        // For AMRAP: pre-fill next set with the reps we just did
        if (exercise.isAmrap && prev.currentSetIndex + 1 < exercise.targetSets) {
          sets[prev.currentSetIndex + 1] = {
            ...sets[prev.currentSetIndex + 1],
            reps: completedReps,
          }
        }

        exercise.sets = sets
        newExercises[prev.currentExerciseIndex] = exercise

        // Advance to next set or exercise
        let nextExerciseIndex = prev.currentExerciseIndex
        let nextSetIndex = prev.currentSetIndex + 1

        if (nextSetIndex >= exercise.targetSets) {
          nextSetIndex = 0
          nextExerciseIndex = prev.currentExerciseIndex + 1
        }

        return {
          ...prev,
          exercises: newExercises,
          currentExerciseIndex: nextExerciseIndex,
          currentSetIndex: nextSetIndex,
          phase: {
            type: 'resting',
            restTimerEnd: Date.now() + exercise.restSeconds * 1000,
            lastCompletedExerciseIndex: prev.currentExerciseIndex,
            lastCompletedSetIndex: prev.currentSetIndex,
            isAmrap: exercise.isAmrap,
          },
        }
      })

      setAdjustMode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log set')
    }
  }, [state, currentExercise, currentSet])

  const handleAdjustWeight = (delta: number) => {
    if (!state) return
    setState((prev) => {
      if (!prev) return null
      const newExercises = [...prev.exercises]
      const exercise = { ...newExercises[prev.currentExerciseIndex] }
      const sets = [...exercise.sets]
      const newWeight = Math.max(0, sets[prev.currentSetIndex].weight + delta)
      
      // Update current set and all remaining uncompleted sets
      for (let i = prev.currentSetIndex; i < sets.length; i++) {
        if (!sets[i].completed) {
          sets[i] = { ...sets[i], weight: newWeight }
        }
      }
      
      exercise.sets = sets
      newExercises[prev.currentExerciseIndex] = exercise
      return { ...prev, exercises: newExercises }
    })
  }

  const handleAdjustReps = (delta: number) => {
    if (!state) return
    setState((prev) => {
      if (!prev) return null
      const newExercises = [...prev.exercises]
      const exercise = { ...newExercises[prev.currentExerciseIndex] }
      const sets = [...exercise.sets]
      sets[prev.currentSetIndex] = {
        ...sets[prev.currentSetIndex],
        reps: Math.max(1, sets[prev.currentSetIndex].reps + delta),
      }
      exercise.sets = sets
      newExercises[prev.currentExerciseIndex] = exercise
      return { ...prev, exercises: newExercises }
    })
  }

  // Adjust the LAST COMPLETED set (for AMRAP during rest)
  const handleAdjustLastCompletedReps = async (delta: number) => {
    if (!state || state.phase.type !== 'resting' || !lastCompletedSetData?.id) return

    const { lastCompletedExerciseIndex, lastCompletedSetIndex } = state.phase
    const newReps = Math.max(1, lastCompletedSetData.reps + delta)

    // Update local state immediately
    setState((prev) => {
      if (!prev || prev.phase.type !== 'resting') return prev
      const newExercises = [...prev.exercises]
      const exercise = { ...newExercises[lastCompletedExerciseIndex] }
      const sets = [...exercise.sets]
      sets[lastCompletedSetIndex] = {
        ...sets[lastCompletedSetIndex],
        reps: newReps,
      }
      exercise.sets = sets
      newExercises[lastCompletedExerciseIndex] = exercise
      return { ...prev, exercises: newExercises }
    })

    // Update in DB
    try {
      await api.updateSet(lastCompletedSetData.id, { reps: newReps })
    } catch (err) {
      // Revert on error
      setState((prev) => {
        if (!prev || prev.phase.type !== 'resting') return prev
        const newExercises = [...prev.exercises]
        const exercise = { ...newExercises[lastCompletedExerciseIndex] }
        const sets = [...exercise.sets]
        sets[lastCompletedSetIndex] = {
          ...sets[lastCompletedSetIndex],
          reps: lastCompletedSetData.reps,
        }
        exercise.sets = sets
        newExercises[lastCompletedExerciseIndex] = exercise
        return { ...prev, exercises: newExercises }
      })
      setError(err instanceof Error ? err.message : 'Failed to update set')
    }
  }

  const handleSkipRest = () => {
    setState((prev) => (prev ? { ...prev, phase: { type: 'active-set' } } : null))
  }

  const handleExtendRest = () => {
    setState((prev) => {
      if (!prev || prev.phase.type !== 'resting') return prev
      return {
        ...prev,
        phase: { ...prev.phase, restTimerEnd: prev.phase.restTimerEnd + 30 * 1000 },
      }
    })
  }

  const handleSkipExercise = () => {
    if (!state || !currentExercise) return
    // Only skip if there are remaining sets (otherwise just complete normally)
    const remainingSets = currentExercise.sets.filter((s, idx) => idx >= state.currentSetIndex && !s.completed)
    if (remainingSets.length === 0) return

    setState((prev) => {
      if (!prev) return null
      return {
        ...prev,
        currentExerciseIndex: prev.currentExerciseIndex + 1,
        currentSetIndex: 0,
        phase: { type: 'active-set' },
      }
    })
  }

  const handleFinishWorkout = async () => {
    if (!state) return
    try {
      const durationMinutes = Math.round((Date.now() - state.startTime) / 60000)
      await api.completeWorkoutSession(state.sessionId, durationMinutes)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete workout')
    }
  }

  const handleAbandon = async () => {
    if (!state) return
    if (!confirm('Abandon this workout? All logged sets will be deleted.')) return
    try {
      await api.abandonWorkoutSession(state.sessionId)
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abandon workout')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Starting workout...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900 text-red-100 p-4 rounded-lg max-w-md">
          <p>{error}</p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-red-700 rounded hover:bg-red-600"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Workout complete
  if (!state || state.currentExerciseIndex >= state.exercises.length) {
    const duration = state ? Math.round((Date.now() - state.startTime) / 60000) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">Done!</div>
          <h1 className="text-3xl font-bold mb-2">Workout Complete!</h1>
          <p className="text-gray-400 mb-8">{duration} minutes</p>
          <button
            onClick={handleFinishWorkout}
            className="px-8 py-4 bg-green-600 rounded-lg text-xl font-bold hover:bg-green-500"
          >
            Save & Finish
          </button>
        </div>
      </div>
    )
  }

  if (!currentExercise || !currentSet) return null

  const totalExercises = state.exercises.length
  const completedExercises = state.exercises.filter((e) => e.sets.every((s) => s.completed)).length
  const elapsedMinutes = Math.round((Date.now() - state.startTime) / 60000)

  // Compute next exercise info for rest screen
  const nextExercise = state.exercises[state.currentExerciseIndex]
  const nextSetNumber = state.currentSetIndex + 1
  const isLastExercise = state.currentExerciseIndex >= state.exercises.length

  // Resting phase - full screen replacement
  if (state.phase.type === 'resting') {
    const restTimeRemaining = Math.max(0, Math.ceil((state.phase.restTimerEnd - Date.now()) / 1000))

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
          <button onClick={handleAbandon} className="text-gray-400 hover:text-white">
            X Cancel
          </button>
          <div className="text-sm text-gray-400">
            {completedExercises}/{totalExercises} exercises
          </div>
          <div className="text-sm text-gray-400">{elapsedMinutes}m</div>
        </header>

        {/* Rest Timer Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-gray-400 text-2xl mb-2">Rest</div>
          <div
            className={`font-bold mb-6 transition-all ${
              restTimeRemaining <= 10 ? 'text-8xl text-sky-400' : 'text-7xl text-white'
            }`}
          >
            {Math.floor(restTimeRemaining / 60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}
          </div>

          {/* AMRAP adjustment */}
          {state.phase.isAmrap && lastCompletedSetData && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="text-gray-400 text-sm mb-2 text-center">Adjust last set reps (AMRAP)</div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleAdjustLastCompletedReps(-1)}
                  className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
                >
                  -1
                </button>
                <div className="w-20 text-center text-3xl font-bold">{lastCompletedSetData.reps}</div>
                <button
                  onClick={() => handleAdjustLastCompletedReps(1)}
                  className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
                >
                  +1
                </button>
              </div>
            </div>
          )}

          {/* Rest control buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleExtendRest}
              className="px-6 py-3 bg-gray-700 rounded-lg text-lg hover:bg-gray-600"
            >
              +30s
            </button>
            <button
              onClick={handleSkipRest}
              className="px-6 py-3 bg-gray-700 rounded-lg text-lg hover:bg-gray-600"
            >
              Skip Rest
            </button>
          </div>

          {/* Up Next - prominently displayed */}
          <div className="w-full max-w-sm bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-2">Up next</div>
            {isLastExercise ? (
              <div className="text-green-400 text-xl font-bold">Workout Complete!</div>
            ) : (
              <>
                <div className="text-xl font-bold">{nextExercise.name}</div>
                <div className="text-gray-400 text-sm">
                  Set {nextSetNumber} of {nextExercise.targetSets} &middot;{' '}
                  {nextExercise.sets[state.currentSetIndex]?.weight}# x {nextExercise.targetReps} reps
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Active set phase
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={handleAbandon} className="text-gray-400 hover:text-white">
          X Cancel
        </button>
        <div className="text-sm text-gray-400">
          {completedExercises}/{totalExercises} exercises
        </div>
        <div className="text-sm text-gray-400">{elapsedMinutes}m</div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Exercise Name */}
        <h1 className="text-3xl font-bold text-center mb-1">{currentExercise.name}</h1>
        {currentExercise.isAmrap && <div className="text-sm text-orange-400 mb-2">AMRAP</div>}

        {/* Set Progress Dots */}
        <div className="flex gap-2 mb-8">
          {currentExercise.sets.map((set, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full ${
                set.completed
                  ? 'bg-green-500'
                  : idx === state.currentSetIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Current Set Display */}
        <SetDisplay
          weight={currentSet.weight}
          reps={currentSet.reps}
          setNumber={state.currentSetIndex + 1}
          totalSets={currentExercise.targetSets}
          adjustMode={adjustMode}
          onAdjustModeChange={setAdjustMode}
          onAdjustWeight={handleAdjustWeight}
          onAdjustReps={handleAdjustReps}
        />

        {/* Complete Set Button */}
        <button
          onClick={handleCompleteSet}
          className="w-full max-w-xs py-6 bg-blue-600 rounded-xl text-2xl font-bold hover:bg-blue-500 active:bg-blue-700"
        >
          Done
        </button>

        {/* Skip to next exercise - only show if there are remaining sets */}
        {state.currentSetIndex < currentExercise.targetSets - 1 && (
          <button
            onClick={handleSkipExercise}
            className="mt-3 text-gray-400 hover:text-gray-200 text-sm"
          >
            Skip to next exercise
          </button>
        )}
      </div>

      {/* Exercise Queue */}
      <div className="bg-gray-800 px-4 py-3">
        <div className="text-xs text-gray-400 mb-2">Coming up:</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {state.exercises.slice(state.currentExerciseIndex + 1).map((ex, idx) => (
            <div key={idx} className="flex-shrink-0 bg-gray-700 px-3 py-2 rounded text-sm">
              {ex.name}
            </div>
          ))}
          {state.currentExerciseIndex >= state.exercises.length - 1 && (
            <div className="text-gray-500 text-sm">Last exercise!</div>
          )}
        </div>
      </div>
    </div>
  )
}
