import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSchedule, type ScheduledWorkoutWithDetails } from '../schedule'
import { WeeklyCalendar } from '../templates'
import { ActiveWorkout } from '../workouts'
import {
  getProgressComparison,
  getRecentWorkouts,
  getWeeklyVolumeComparison,
  type ExerciseComparison,
  type RecentWorkout,
  type WeeklyVolumeComparison,
} from '../progress'
import { formatWorkoutDate } from '../../lib/utils'
import { ErrorMessage } from '../../components/ErrorMessage'

export function DashboardPage() {
  const { scheduledWorkouts, isLoading, error, refresh } = useSchedule()
  const navigate = useNavigate()
  const [activeWorkout, setActiveWorkout] = useState<ScheduledWorkoutWithDetails | null>(null)
  const [comparison, setComparison] = useState<ExerciseComparison[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([])
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumeComparison | null>(null)

  const today = new Date().getDay()
  const todaysWorkouts = scheduledWorkouts.filter((w) => w.day_of_week === today)

  // Load comparison and recent workouts data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [comparisonData, recentData, volumeData] = await Promise.all([
          getProgressComparison(4),
          getRecentWorkouts(5),
          getWeeklyVolumeComparison(),
        ])
        setComparison(comparisonData)
        setRecentWorkouts(recentData)
        setWeeklyVolume(volumeData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      }
    }
    loadData()
  }, [])

  const handleStartWorkout = (workout: ScheduledWorkoutWithDetails) => {
    setActiveWorkout(workout)
  }

  const handleWorkoutComplete = () => {
    setActiveWorkout(null)
    refresh()
  }

  const handleWorkoutCancel = () => {
    setActiveWorkout(null)
  }

  // Show active workout in full screen mode
  if (activeWorkout) {
    return (
      <ActiveWorkout
        scheduledWorkout={activeWorkout}
        onComplete={handleWorkoutComplete}
        onCancel={handleWorkoutCancel}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={`Failed to load data: ${error.message}`} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* Today's Workout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today's Workout
        </h2>

        {todaysWorkouts.length > 0 ? (
          <div className="space-y-3">
            {todaysWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{workout.template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {workout.template.template_exercises.length} exercises
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartWorkout(workout)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                  >
                    Start Workout
                  </button>
                </div>

                {workout.template.template_exercises.length > 0 && (
                  <ul className="mt-3 text-sm text-gray-600 space-y-1">
                    {workout.template.template_exercises.slice(0, 5).map((ex) => {
                      const scheduledEx = workout.scheduled_exercises.find(
                        (se) => se.exercise_name === ex.exercise_name
                      )
                      return (
                        <li key={ex.id} className="flex justify-between">
                          <span>{ex.exercise_name}</span>
                          <span className="text-gray-400 dark:text-gray-500">
                            {scheduledEx?.target_weight ?? 0}# - {ex.target_sets}x{ex.target_reps}
                          </span>
                        </li>
                      )
                    })}
                    {workout.template.template_exercises.length > 5 && (
                      <li className="text-gray-400 italic">
                        +{workout.template.template_exercises.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-4">No workout scheduled for today</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/schedule')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
              >
                Schedule a Workout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Volume Stats */}
      {weeklyVolume && (weeklyVolume.thisWeek > 0 || weeklyVolume.lastWeek > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">This Week</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {weeklyVolume.thisWeek.toLocaleString()}#
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {weeklyVolume.thisWeekSessions} session{weeklyVolume.thisWeekSessions !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Last Week</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {weeklyVolume.lastWeek.toLocaleString()}#
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {weeklyVolume.lastWeekSessions} session{weeklyVolume.lastWeekSessions !== 1 ? 's' : ''}
              </span>
              {weeklyVolume.change !== null && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    weeklyVolume.change > 0
                      ? 'bg-green-100 text-green-700'
                      : weeklyVolume.change < 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                  }`}
                >
                  {weeklyVolume.change > 0 && '+'}
                  {weeklyVolume.change}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Calendar */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Weekly Schedule
        </h2>
        <WeeklyCalendar
          scheduledWorkouts={scheduledWorkouts}
          onSelectWorkout={handleStartWorkout}
        />
      </div>

      {/* Progress Comparison */}
      {comparison.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            This Week vs 4 Weeks Ago
          </h2>
          <div className="space-y-3">
            {comparison.slice(0, 5).map((item) => (
              <ComparisonRow key={item.exerciseName} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Workouts
        </h2>
        {recentWorkouts.length > 0 ? (
          <div className="space-y-3">
            {recentWorkouts.map((workout) => (
              <RecentWorkoutRow key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No workouts logged yet</p>
        )}
      </div>
    </div>
  )
}

function ComparisonRow({ item }: { item: ExerciseComparison }) {
  const hasChange = item.change !== null
  const isPositive = hasChange && item.change! > 0
  const isNegative = hasChange && item.change! < 0

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{item.exerciseName}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
          {item.currentWeek ? `${item.currentWeek.e1rm}#` : '—'}
          {item.pastWeek && (
            <span className="text-gray-400 dark:text-gray-500"> vs {item.pastWeek.e1rm}#</span>
          )}
        </div>
      </div>
      {hasChange && (
        <div
          className={`text-sm font-medium px-2 py-1 rounded ${
            isPositive
              ? 'bg-green-100 text-green-700'
              : isNegative
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
          }`}
        >
          {isPositive && '+'}
          {item.change}%
        </div>
      )}
      {!hasChange && item.currentWeek && !item.pastWeek && (
        <div className="text-xs text-gray-400 italic">new</div>
      )}
    </div>
  )
}

function RecentWorkoutRow({ workout }: { workout: RecentWorkout }) {
  const formatted = formatWorkoutDate(workout.date)

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <div className="font-medium text-gray-900 dark:text-white">
          {workout.templateName ?? 'Ad-hoc Workout'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatted}</div>
      </div>
      <div className="text-right text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
        <div>{workout.exerciseCount} exercises</div>
        <div>{workout.totalVolume.toLocaleString()}# volume</div>
      </div>
    </div>
  )
}
