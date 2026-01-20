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
    <div 
      className="rounded overflow-hidden"
      style={{ background: 'var(--color-iron)', border: '1px solid var(--color-steel)' }}
    >
      {/* Mobile: Stacked list */}
      <div className="sm:hidden">
        {workoutsByDay.map((day, i) => (
          <div
            key={day.value}
            className="p-3"
            style={{ 
              borderBottom: i < workoutsByDay.length - 1 ? '1px solid var(--color-steel)' : 'none',
              background: day.value === today ? 'var(--color-steel)' : 'transparent'
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  color: day.value === today ? 'var(--color-ember)' : 'var(--color-ash)'
                }}
              >
                {day.label.toUpperCase()}
                {day.value === today && (
                  <span 
                    className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ 
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--color-ember)',
                      color: 'var(--color-void)'
                    }}
                  >
                    Today
                  </span>
                )}
              </span>
            </div>
            {day.workouts.length === 0 ? (
              <div 
                className="text-xs italic mt-1"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}
              >
                Rest day
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {day.workouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => onSelectWorkout?.(workout)}
                    className="w-full text-left p-2 rounded transition-colors"
                    style={{ 
                      background: 'var(--color-void)',
                      border: '1px solid var(--color-graphite)'
                    }}
                  >
                    <div 
                      className="text-sm truncate"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ember)' }}
                    >
                      {workout.template.name}
                    </div>
                    <div 
                      className="text-xs"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
                    >
                      {workout.template.template_exercises.length} exercises
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden sm:block">
        <div 
          className="grid grid-cols-7"
          style={{ borderBottom: '1px solid var(--color-steel)' }}
        >
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day.value}
              className="px-2 py-3 text-center text-sm"
              style={{ 
                fontFamily: 'var(--font-display)',
                background: day.value === today ? 'var(--color-steel)' : 'transparent',
                color: day.value === today ? 'var(--color-ember)' : 'var(--color-ash)'
              }}
            >
              {day.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[120px]">
          {workoutsByDay.map((day, i) => (
            <div
              key={day.value}
              className="p-2"
              style={{ 
                borderRight: i < 6 ? '1px solid var(--color-steel)' : 'none',
                background: day.value === today ? 'var(--color-steel)' : 'transparent'
              }}
            >
              {day.workouts.length === 0 ? (
                <div 
                  className="text-xs italic text-center mt-4"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}
                >
                  Rest
                </div>
              ) : (
                <div className="space-y-2">
                  {day.workouts.map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() => onSelectWorkout?.(workout)}
                      className="w-full text-left p-2 rounded transition-colors"
                      style={{ 
                        background: 'var(--color-void)',
                        border: '1px solid var(--color-graphite)'
                      }}
                    >
                      <div 
                        className="text-xs truncate"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ember)' }}
                      >
                        {workout.template.name}
                      </div>
                      <div 
                        className="text-xs"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
                      >
                        {workout.template.template_exercises.length} exercises
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {scheduledWorkouts.length === 0 && (
        <div 
          className="p-8 text-center"
          style={{ borderTop: '1px solid var(--color-steel)' }}
        >
          <p 
            className="mb-4"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            No workouts scheduled yet
          </p>
          <Link
            to="/schedule"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ember)' }}
          >
            Schedule your first workout
          </Link>
        </div>
      )}
    </div>
  )
}
