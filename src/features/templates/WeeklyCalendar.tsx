import { Link } from 'react-router-dom'
import type { ScheduledWorkoutWithDetails } from '../schedule'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

type Props = {
  scheduledWorkouts: ScheduledWorkoutWithDetails[]
  onSelectWorkout?: (workout: ScheduledWorkoutWithDetails) => void
}

export function WeeklyCalendar({ scheduledWorkouts, onSelectWorkout }: Props) {
  const today = new Date().getDay()

  // Group workouts by day of week
  const workoutsByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    workouts: scheduledWorkouts.filter((w) => w.day_of_week === day.value),
  }))

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.value}
            className={`px-2 py-3 text-center text-sm font-medium ${
              day.value === today
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">{day.short}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 min-h-[120px]">
        {workoutsByDay.map((day) => (
          <div
            key={day.value}
            className={`border-r last:border-r-0 border-gray-100 p-2 ${
              day.value === today ? 'bg-blue-50/50' : ''
            }`}
          >
            {day.workouts.length === 0 ? (
              <div className="text-xs text-gray-400 italic text-center mt-4">
                Rest
              </div>
            ) : (
              <div className="space-y-2">
                {day.workouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => onSelectWorkout?.(workout)}
                    className="w-full text-left p-2 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    <div className="text-xs font-medium text-blue-900 truncate">
                      {workout.template.name}
                    </div>
                    <div className="text-xs text-blue-600">
                      {workout.template.template_exercises.length} exercises
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {scheduledWorkouts.length === 0 && (
        <div className="p-8 text-center border-t border-gray-100">
          <p className="text-gray-500 mb-4">No workouts scheduled yet</p>
          <Link
            to="/schedule"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Schedule your first workout
          </Link>
        </div>
      )}
    </div>
  )
}
