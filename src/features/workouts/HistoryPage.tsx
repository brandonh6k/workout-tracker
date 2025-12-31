import { useState, useEffect } from 'react'
import { getRecentWorkouts, type WorkoutSessionWithSets } from './api'
import { getLoggedExercises, ExerciseHistoryView, type LoggedExerciseInfo } from '../progress'
import type { ExerciseType } from '../../types'
import { formatWorkoutDate, groupBy } from '../../lib/utils'

type ViewMode = { type: 'list' } | { type: 'exercise'; name: string; exerciseType: ExerciseType }

export function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSessionWithSets[]>([])
  const [exercises, setExercises] = useState<LoggedExerciseInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ViewMode>({ type: 'list' })

  useEffect(() => {
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
    loadData()
  }, [])

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workout History</h1>

      {isLoading ? (
        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Workouts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Recent Workouts</h2>
            </div>
            {workouts.length === 0 ? (
              <div className="p-4 text-gray-500 italic">No workouts logged yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {workouts.map((workout) => (
                  <WorkoutRow key={workout.id} workout={workout} />
                ))}
              </div>
            )}
          </div>

          {/* Exercise List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Exercises</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Tap to view history</p>
            </div>
            {exercises.length === 0 ? (
              <div className="p-4 text-gray-500 italic">No exercises logged yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {exercises.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => setView({ type: 'exercise', name: ex.name, exerciseType: ex.exerciseType })}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:bg-gray-900 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white">{ex.name}</span>
                      {ex.exerciseType !== 'weighted' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          ex.exerciseType === 'bodyweight' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ex.exerciseType === 'bodyweight' ? 'BW' : 'Cardio'}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function WorkoutRow({ workout }: { workout: WorkoutSessionWithSets }) {
  const formatted = formatWorkoutDate(workout.date)

  // Group sets by exercise
  const exerciseGroups = groupBy(workout.logged_sets, (set) => set.exercise_name)

  const exerciseCount = Object.keys(exerciseGroups).length
  const totalSets = workout.logged_sets.length
  const totalVolume = workout.logged_sets.reduce((sum, s) => sum + s.weight * s.reps, 0)

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-gray-900 dark:text-white">{formatted}</span>
        {workout.duration_minutes && (
          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{workout.duration_minutes}min</span>
        )}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
        {exerciseCount} exercises, {totalSets} sets, {totalVolume.toLocaleString()}# volume
      </div>
    </div>
  )
}
