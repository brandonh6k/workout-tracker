import { useState, useEffect, useCallback } from 'react'
import type { ScheduledWorkoutWithDetails } from '../schedule'
import * as api from './api'

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
  sets: SetData[]
}

type WorkoutState = {
  sessionId: string
  exercises: ExerciseState[]
  currentExerciseIndex: number
  currentSetIndex: number
  startTime: number
  restTimerEnd: number | null
  lastCompletedReps: number | null // For AMRAP: reps from the set we just finished
  lastCompletedIsAmrap: boolean // Was the last completed set an AMRAP?
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
  const [showAdjust, setShowAdjust] = useState(false)

  // Initialize workout
  useEffect(() => {
    const initWorkout = async () => {
      try {
        const session = await api.startWorkoutSession(scheduledWorkout)
        
        // Build exercise state from scheduled workout
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
          restTimerEnd: null,
          lastCompletedReps: null,
          lastCompletedIsAmrap: false,
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
    if (!state?.restTimerEnd) return

    const interval = setInterval(() => {
      if (Date.now() >= state.restTimerEnd!) {
        setState((prev) => prev ? { ...prev, restTimerEnd: null } : null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state?.restTimerEnd])

  const currentExercise = state?.exercises[state.currentExerciseIndex]
  const currentSet = currentExercise?.sets[state?.currentSetIndex ?? 0]

  const handleCompleteSet = useCallback(async () => {
    if (!state || !currentExercise || !currentSet) return

    try {
      // Log set to DB
      const loggedSet = await api.logSet(state.sessionId, {
        exercise_name: currentExercise.name,
        set_number: state.currentSetIndex + 1,
        weight: currentSet.weight,
        reps: currentSet.reps,
      })

      // Update state
      setState((prev) => {
        if (!prev) return null

        const newExercises = [...prev.exercises]
        const exercise = { ...newExercises[prev.currentExerciseIndex] }
        const sets = [...exercise.sets]
        const completedReps = sets[prev.currentSetIndex].reps
        sets[prev.currentSetIndex] = { ...sets[prev.currentSetIndex], id: loggedSet.id, completed: true }
        
        // For AMRAP: if there's a next set in this exercise, default it to the reps we just did
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
          // Move to next exercise
          nextSetIndex = 0
          nextExerciseIndex = prev.currentExerciseIndex + 1
        }

        return {
          ...prev,
          exercises: newExercises,
          currentExerciseIndex: nextExerciseIndex,
          currentSetIndex: nextSetIndex,
          restTimerEnd: Date.now() + 90 * 1000, // 90 second rest
          lastCompletedReps: completedReps,
          lastCompletedIsAmrap: exercise.isAmrap,
        }
      })

      setShowAdjust(false)
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
      sets[prev.currentSetIndex] = {
        ...sets[prev.currentSetIndex],
        weight: Math.max(0, sets[prev.currentSetIndex].weight + delta),
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

  const handleSkipRest = () => {
    setState((prev) => prev ? { ...prev, restTimerEnd: null } : null)
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Starting workout...</div>
      </div>
    )
  }

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

  // Workout complete - all exercises done
  if (!state || state.currentExerciseIndex >= state.exercises.length) {
    const duration = state ? Math.round((Date.now() - state.startTime) / 60000) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">💪</div>
          <h1 className="text-3xl font-bold text-white mb-2">Workout Complete!</h1>
          <p className="text-gray-400 mb-8">{duration} minutes</p>
          <button
            onClick={handleFinishWorkout}
            className="px-8 py-4 bg-green-600 text-white rounded-lg text-xl font-bold hover:bg-green-500"
          >
            Save & Finish
          </button>
        </div>
      </div>
    )
  }

  if (!currentExercise || !currentSet) {
    return null // Shouldn't happen, but type safety
  }

  const restTimeRemaining = state.restTimerEnd
    ? Math.max(0, Math.ceil((state.restTimerEnd - Date.now()) / 1000))
    : 0

  const totalExercises = state.exercises.length
  const completedExercises = state.exercises.filter((e) =>
    e.sets.every((s) => s.completed)
  ).length

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleAbandon}
          className="text-gray-400 hover:text-white"
        >
          ✕ Cancel
        </button>
        <div className="text-sm text-gray-400">
          {completedExercises}/{totalExercises} exercises
        </div>
        <div className="text-sm text-gray-400">
          {Math.round((Date.now() - state.startTime) / 60000)}m
        </div>
      </header>

      {/* Rest Timer Overlay */}
      {restTimeRemaining > 0 && (
        <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-10">
          <div className="text-gray-400 text-lg mb-2">Rest</div>
          <div className="text-8xl font-bold text-white mb-4">
            {Math.floor(restTimeRemaining / 60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}
          </div>
          
          {/* AMRAP rep adjustment during rest */}
          {currentExercise.isAmrap && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="text-gray-400 text-sm mb-2 text-center">
                Next set reps (AMRAP)
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleAdjustReps(-1)}
                  className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
                >
                  -1
                </button>
                <div className="w-20 text-center text-3xl font-bold">
                  {currentSet.reps}
                </div>
                <button
                  onClick={() => handleAdjustReps(1)}
                  className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
                >
                  +1
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={handleSkipRest}
            className="px-6 py-3 bg-gray-700 rounded-lg text-lg hover:bg-gray-600"
          >
            Skip Rest
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Exercise Name */}
        <h1 className="text-2xl font-bold text-center mb-1">
          {currentExercise.name}
        </h1>
        {currentExercise.isAmrap && (
          <div className="text-sm text-orange-400 mb-2">AMRAP</div>
        )}

        {/* Set Progress */}
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
        <div className="text-center mb-8">
          <div className="text-6xl font-bold mb-2">
            {currentSet.weight}<span className="text-3xl text-gray-400">#</span>
          </div>
          <div className="text-4xl text-gray-300">
            {currentSet.reps} reps
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Set {state.currentSetIndex + 1} of {currentExercise.targetSets}
          </div>
        </div>

        {/* Adjust Button */}
        {!showAdjust ? (
          <button
            onClick={() => setShowAdjust(true)}
            className="text-gray-400 hover:text-white mb-4"
          >
            Adjust weight/reps
          </button>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
            {/* Weight Adjustment */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleAdjustWeight(-5)}
                className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
              >
                -5
              </button>
              <button
                onClick={() => handleAdjustWeight(-2.5)}
                className="w-12 h-12 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                -2.5
              </button>
              <div className="w-24 text-center text-xl font-bold">
                {currentSet.weight}#
              </div>
              <button
                onClick={() => handleAdjustWeight(2.5)}
                className="w-12 h-12 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                +2.5
              </button>
              <button
                onClick={() => handleAdjustWeight(5)}
                className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
              >
                +5
              </button>
            </div>

            {/* Reps Adjustment */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleAdjustReps(-1)}
                className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
              >
                -1
              </button>
              <div className="w-24 text-center text-xl font-bold">
                {currentSet.reps} reps
              </div>
              <button
                onClick={() => handleAdjustReps(1)}
                className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
              >
                +1
              </button>
            </div>

            <button
              onClick={() => setShowAdjust(false)}
              className="w-full text-gray-400 hover:text-white text-sm"
            >
              Done adjusting
            </button>
          </div>
        )}

        {/* Complete Set Button */}
        <button
          onClick={handleCompleteSet}
          className="w-full max-w-xs py-6 bg-blue-600 rounded-xl text-2xl font-bold hover:bg-blue-500 active:bg-blue-700"
        >
          Done
        </button>
      </div>

      {/* Exercise List (collapsed) */}
      <div className="bg-gray-800 px-4 py-3">
        <div className="text-xs text-gray-400 mb-2">Coming up:</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {state.exercises.slice(state.currentExerciseIndex + 1).map((ex, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 bg-gray-700 px-3 py-2 rounded text-sm"
            >
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
