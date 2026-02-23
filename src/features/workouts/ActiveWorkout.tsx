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
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-void)' }}
      >
        <div 
          className="text-center"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          <div 
            className="w-12 h-12 mx-auto mb-4"
            style={{ 
              border: '3px solid var(--color-steel)',
              borderTopColor: 'var(--color-ember)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          INITIALIZING...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--color-void)' }}
      >
        <div 
          className="max-w-md p-6 text-center"
          style={{ 
            background: 'var(--color-danger-muted)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div 
            className="text-4xl mb-4"
            style={{ color: 'var(--color-danger)' }}
          >
            ⚠
          </div>
          <p 
            className="mb-6"
            style={{ color: 'var(--color-chalk)', fontFamily: 'var(--font-mono)' }}
          >
            {error}
          </p>
          <button onClick={onCancel} className="btn-danger">
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
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'var(--color-void)' }}
      >
        <div className="text-center animate-slide-up">
          <div 
            className="text-8xl mb-6"
            style={{ 
              fontFamily: 'var(--font-display)',
              color: 'var(--color-ember)',
              textShadow: '0 0 40px rgba(245, 158, 11, 0.5)'
            }}
          >
            DONE
          </div>
          <h1 
            className="text-3xl mb-2"
            style={{ 
              fontFamily: 'var(--font-display)',
              color: 'var(--color-chalk)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            Workout Complete
          </h1>
          <p 
            className="mb-8"
            style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
          >
            {duration} minutes
          </p>
          <button
            onClick={handleFinishWorkout}
            className="btn-primary text-lg px-8 py-4"
            style={{ boxShadow: 'var(--shadow-glow)' }}
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
    const isUrgent = restTimeRemaining <= 10

    return (
      <div 
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--color-void)' }}
      >
        {/* Header */}
        <WorkoutHeader
          onAbandon={handleAbandon}
          completedExercises={completedExercises}
          totalExercises={totalExercises}
          elapsedMinutes={elapsedMinutes}
        />

        {/* Rest Timer Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div 
            className="text-xl uppercase tracking-widest mb-4"
            style={{ 
              fontFamily: 'var(--font-display)',
              color: 'var(--color-zinc)'
            }}
          >
            Rest
          </div>
          
          {/* Big timer */}
          <div 
            className="mb-12 transition-all duration-300"
            style={{ 
              fontFamily: 'var(--font-display)',
              fontSize: isUrgent ? '8rem' : '6rem',
              fontWeight: 700,
              color: isUrgent ? 'var(--color-ember)' : 'var(--color-chalk)',
              textShadow: isUrgent ? '0 0 40px rgba(245, 158, 11, 0.6)' : 'none',
              lineHeight: 1
            }}
          >
            {Math.floor(restTimeRemaining / 60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}
          </div>

          {/* AMRAP adjustment */}
          {state.phase.isAmrap && lastCompletedSetData && (
            <div 
              className="p-4 mb-6"
              style={{ 
                background: 'var(--color-steel)',
                border: '1px solid var(--color-concrete)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div 
                className="text-sm text-center mb-3 uppercase tracking-wider"
                style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-display)' }}
              >
                Adjust AMRAP Reps
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleAdjustLastCompletedReps(-1)}
                  className="btn-control w-14 h-14 text-2xl"
                >
                  −
                </button>
                <div 
                  className="w-24 text-center text-4xl"
                  style={{ 
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: 'var(--color-ember)'
                  }}
                >
                  {lastCompletedSetData.reps}
                </div>
                <button
                  onClick={() => handleAdjustLastCompletedReps(1)}
                  className="btn-control w-14 h-14 text-2xl"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Rest control buttons */}
          <div className="flex gap-3 mb-8">
            <button onClick={handleExtendRest} className="btn-control">
              +30s
            </button>
            <button onClick={handleSkipRest} className="btn-control">
              Skip Rest
            </button>
          </div>

          {/* Up Next */}
          <div 
            className="w-full max-w-sm p-4"
            style={{ 
              background: 'var(--color-iron)',
              border: '1px solid var(--color-steel)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div 
              className="text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-display)' }}
            >
              Up Next
            </div>
            {isLastExercise ? (
              <div 
                className="text-xl"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-success)',
                  textTransform: 'uppercase'
                }}
              >
                Workout Complete!
              </div>
            ) : (
              <>
                <div 
                  className="text-xl"
                  style={{ 
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-chalk)',
                    textTransform: 'uppercase'
                  }}
                >
                  {nextExercise.name}
                </div>
                <div 
                  className="mt-1"
                  style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                >
                  Set {nextSetNumber}/{nextExercise.targetSets} · {nextExercise.sets[state.currentSetIndex]?.weight}# × {nextExercise.targetReps}
                </div>
              </>
            )}
          </div>

          {/* Skip Exercise - placed below Up Next, away from other buttons */}
          {!isLastExercise && (
            <button
              onClick={handleSkipExercise}
              className="mt-6 text-sm transition-colors"
              style={{ 
                color: 'var(--color-graphite)',
                fontFamily: 'var(--font-mono)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-zinc)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-graphite)'}
            >
              Skip remaining sets →
            </button>
          )}
        </div>
      </div>
    )
  }

  // Active set phase
  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-void)' }}
    >
      {/* Header */}
      <WorkoutHeader
        onAbandon={handleAbandon}
        completedExercises={completedExercises}
        totalExercises={totalExercises}
        elapsedMinutes={elapsedMinutes}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Exercise Name */}
        <h1 
          className="text-3xl text-center mb-1"
          style={{ 
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--color-chalk)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {currentExercise.name}
        </h1>
        {currentExercise.isAmrap && (
          <div 
            className="text-sm mb-2 px-2 py-0.5"
            style={{ 
              background: 'var(--color-flame)',
              color: 'var(--color-void)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase'
            }}
          >
            AMRAP
          </div>
        )}

        {/* Set Progress */}
        <div className="flex gap-2 my-6">
          {currentExercise.sets.map((set, idx) => (
            <div
              key={idx}
              className="w-4 h-4 transition-all"
              style={{ 
                background: set.completed 
                  ? 'var(--color-success)' 
                  : idx === state.currentSetIndex 
                    ? 'var(--color-ember)'
                    : 'var(--color-graphite)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: idx === state.currentSetIndex ? 'var(--shadow-glow)' : 'none'
              }}
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
          className="w-full max-w-xs py-6 text-2xl animate-pulse-glow"
          style={{ 
            background: 'linear-gradient(135deg, var(--color-ember) 0%, var(--color-flame) 100%)',
            color: 'var(--color-void)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg), var(--shadow-glow)'
          }}
        >
          Done
        </button>
      </div>

      {/* Exercise Queue */}
      <div 
        className="px-4 py-3"
        style={{ 
          background: 'var(--color-iron)',
          borderTop: '1px solid var(--color-steel)'
        }}
      >
        <div 
          className="text-xs uppercase tracking-wider mb-2"
          style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-display)' }}
        >
          Coming Up
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {state.exercises.slice(state.currentExerciseIndex + 1).map((ex, idx) => (
            <div 
              key={idx} 
              className="flex-shrink-0 px-3 py-2 text-sm"
              style={{ 
                background: 'var(--color-steel)',
                color: 'var(--color-ash)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {ex.name}
            </div>
          ))}
          {state.currentExerciseIndex >= state.exercises.length - 1 && (
            <div 
              className="text-sm"
              style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
            >
              Last exercise!
            </div>
          )}
        </div>
      </div>

      {/* Skip to next exercise - separate from Coming Up, away from Done button */}
      {state.currentExerciseIndex < state.exercises.length - 1 && (
        <div 
          className="px-4 py-3"
          style={{ borderTop: '1px solid var(--color-steel)' }}
        >
          <button
            onClick={handleSkipExercise}
            className="text-sm transition-colors"
            style={{ 
              color: 'var(--color-graphite)',
              fontFamily: 'var(--font-mono)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-zinc)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-graphite)'}
          >
            Skip remaining sets →
          </button>
        </div>
      )}
    </div>
  )
}

function WorkoutHeader({ 
  onAbandon, 
  completedExercises, 
  totalExercises, 
  elapsedMinutes 
}: { 
  onAbandon: () => void
  completedExercises: number
  totalExercises: number
  elapsedMinutes: number
}) {
  return (
    <header 
      className="px-4 py-3 flex items-center justify-between"
      style={{ 
        background: 'var(--color-iron)',
        borderBottom: '1px solid var(--color-steel)'
      }}
    >
      <button 
        onClick={onAbandon} 
        className="transition-colors"
        style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-zinc)'}
      >
        ✕ CANCEL
      </button>
      
      {/* Progress ring */}
      <ProgressRing completed={completedExercises} total={totalExercises} />
      
      <div 
        style={{ 
          color: 'var(--color-ember)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}
      >
        {elapsedMinutes}m
      </div>
    </header>
  )
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const size = 36
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-steel)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {/* Center text */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
          fontWeight: 600,
          color: 'var(--color-ash)'
        }}
      >
        {completed}/{total}
      </div>
    </div>
  )
}
