import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getRecentWorkouts, abandonWorkoutSession, type WorkoutSessionWithSets } from './api'
import { getLoggedExercises, ExerciseHistoryView, type LoggedExerciseInfo } from '../progress'
import type { ExerciseType } from '../../types'
import { formatWorkoutDate, groupBy } from '../../lib/utils'
import { ConfirmDialog } from '../../components/ConfirmDialog'

type ViewMode = { type: 'list' } | { type: 'exercise'; name: string; exerciseType: ExerciseType }

export function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSessionWithSets[]>([])
  const [exercises, setExercises] = useState<LoggedExerciseInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ViewMode>({ type: 'list' })
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutSessionWithSets | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [workoutsData, exercisesData] = await Promise.all([
        getRecentWorkouts(20),
        getLoggedExercises(),
      ])
      setWorkouts(workoutsData)
      setExercises(exercisesData)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDeleteWorkout = async () => {
    if (!deletingWorkout) return
    try {
      await abandonWorkoutSession(deletingWorkout.id)
      toast.success('Workout deleted')
      setDeletingWorkout(null)
      loadData()
    } catch (err) {
      console.error('Failed to delete workout:', err)
      toast.error('Failed to delete workout')
    }
  }

  // Exercise detail view
  if (view.type === 'exercise') {
    return (
      <ExerciseHistoryView
        exerciseName={view.name}
        exerciseType={view.exerciseType}
        onBack={() => setView({ type: 'list' })}
      />
    )
  }

  // Main history list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="text-2xl tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
        >
          HISTORY
        </h1>
        <p 
          className="text-sm mt-1"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div 
            className="text-center"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            <div 
              className="w-8 h-8 mx-auto mb-3 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--color-graphite)', borderTopColor: 'transparent' }}
            />
            Loading history...
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Workouts */}
          <div className="card" style={{ padding: 0 }}>
            <div 
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-steel)' }}
            >
              <h2 
                className="text-sm tracking-wide"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
              >
                RECENT WORKOUTS
              </h2>
              <span 
                className="text-xs tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                {workouts.length}
              </span>
            </div>
            {workouts.length === 0 ? (
              <div 
                className="p-6 text-center"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                No workouts logged yet
              </div>
            ) : (
              <div>
                {workouts.map((workout, i) => (
                  <WorkoutRow
                    key={workout.id}
                    workout={workout}
                    onDelete={() => setDeletingWorkout(workout)}
                    isLast={i === workouts.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Exercise List */}
          <div className="card" style={{ padding: 0 }}>
            <div 
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-steel)' }}
            >
              <h2 
                className="text-sm tracking-wide"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
              >
                EXERCISES
              </h2>
              <p 
                className="text-xs mt-0.5"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                Tap to view history
              </p>
            </div>
            {exercises.length === 0 ? (
              <div 
                className="p-6 text-center"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                No exercises logged yet
              </div>
            ) : (
              <div>
                {exercises.map((ex, i) => (
                  <button
                    key={ex.name}
                    onClick={() => setView({ type: 'exercise', name: ex.name, exerciseType: ex.exerciseType })}
                    className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors hover:bg-[var(--color-steel)]"
                    style={{ 
                      borderBottom: i < exercises.length - 1 ? '1px solid var(--color-steel)' : 'none' 
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-sm"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
                      >
                        {ex.name}
                      </span>
                      {ex.exerciseType !== 'weighted' && (
                        <span 
                          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ 
                            fontFamily: 'var(--font-mono)',
                            background: ex.exerciseType === 'bodyweight' 
                              ? 'var(--color-success-muted)' 
                              : 'var(--color-info)',
                            color: 'var(--color-bone)'
                          }}
                        >
                          {ex.exerciseType === 'bodyweight' ? 'BW' : 'Cardio'}
                        </span>
                      )}
                    </div>
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{ color: 'var(--color-zinc)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingWorkout}
        title="Delete Workout"
        message={`Delete this workout from ${deletingWorkout ? formatWorkoutDate(deletingWorkout.date) : ''}? This will remove all logged sets and cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteWorkout}
        onCancel={() => setDeletingWorkout(null)}
      />
    </div>
  )
}

function WorkoutRow({ 
  workout, 
  onDelete, 
  isLast = false 
}: { 
  workout: WorkoutSessionWithSets
  onDelete: () => void
  isLast?: boolean 
}) {
  const formatted = formatWorkoutDate(workout.date)

  // Group sets by exercise
  const exerciseGroups = groupBy(workout.logged_sets, (set) => set.exercise_name)

  const exerciseCount = Object.keys(exerciseGroups).length
  const totalSets = workout.logged_sets.length
  const totalVolume = workout.logged_sets.reduce((sum, s) => sum + s.weight * s.reps, 0)

  return (
    <div 
      className="px-4 py-3 flex items-start justify-between gap-3 group"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-steel)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span 
            className="text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
          >
            {formatted}
          </span>
          {workout.duration_minutes && (
            <span 
              className="text-xs tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              {workout.duration_minutes}min
            </span>
          )}
        </div>
        <div 
          className="text-xs tabular-nums"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          {exerciseCount} ex · {totalSets} sets · {totalVolume.toLocaleString()}#
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded transition-colors opacity-50 group-hover:opacity-100 hover:bg-[var(--color-danger-muted)]"
        style={{ color: 'var(--color-slate)' }}
        title="Delete workout"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
