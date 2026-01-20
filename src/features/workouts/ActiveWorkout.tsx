import { useReducer, useState, useEffect, useCallback } from 'react'
import type { ScheduledWorkoutWithDetails } from '../schedule'
import * as api from './api'
import { SetDisplay } from './components'
import { workoutReducer, buildInitialState } from './workoutReducer'

type Props = {
  scheduledWorkout: ScheduledWorkoutWithDetails
  onComplete: () => void
  onCancel: () => void
}

export function ActiveWorkout({ scheduledWorkout, onComplete, onCancel }: Props) {
  const [state, dispatch] = useReducer(workoutReducer, null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustMode, setAdjustMode] = useState<'weight' | 'reps' | null>(null)
  const [, setTick] = useState(0)

  // Initialize workout
  useEffect(() => {
    const initWorkout = async () => {
      try {
        const session = await api.startWorkoutSession(scheduledWorkout)
        const initialState = buildInitialState(session.id, scheduledWorkout)
        dispatch({ type: 'INITIALIZE', payload: initialState })
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
        dispatch({ type: 'REST_TIMER_EXPIRED' })
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

      dispatch({ type: 'COMPLETE_SET', payload: { loggedSetId: loggedSet.id } })
      setAdjustMode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log set')
    }
  }, [state, currentExercise, currentSet])

  const handleAdjustWeight = (delta: number) => {
    dispatch({ type: 'ADJUST_WEIGHT', payload: { delta } })
  }

  const handleAdjustReps = (delta: number) => {
    dispatch({ type: 'ADJUST_REPS', payload: { delta } })
  }

  // Adjust the LAST COMPLETED set (for AMRAP during rest)
  const handleAdjustLastCompletedReps = async (delta: number) => {
    if (!state || state.phase.type !== 'resting' || !lastCompletedSetData?.id) return

    const originalReps = lastCompletedSetData.reps

    // Update local state immediately (optimistic update)
    dispatch({ type: 'ADJUST_LAST_COMPLETED_REPS', payload: { delta } })

    // Update in DB
    try {
      const newReps = Math.max(1, originalReps + delta)
      await api.updateSet(lastCompletedSetData.id, { reps: newReps })
    } catch (err) {
      // Revert on error
      dispatch({ type: 'REVERT_LAST_COMPLETED_REPS', payload: { originalReps } })
      setError(err instanceof Error ? err.message : 'Failed to update set')
    }
  }

  const handleSkipRest = () => {
    dispatch({ type: 'SKIP_REST' })
  }

  const handleExtendRest = () => {
    dispatch({ type: 'EXTEND_REST' })
  }

  const handleSkipExercise = () => {
    if (!state || !currentExercise) return
    // Only skip if there are remaining sets (otherwise just complete normally)
    const remainingSets = currentExercise.sets.filter(
      (s, idx) => idx >= state.currentSetIndex && !s.completed
    )
    if (remainingSets.length === 0) return

    dispatch({ type: 'SKIP_EXERCISE' })
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
