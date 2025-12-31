import { useState } from 'react'
import { useSchedule, type ScheduledWorkoutWithDetails } from './index'
import { useTemplates } from '../templates'
import { ScheduleForm } from './ScheduleForm'
import * as api from './api'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

export function SchedulePage() {
  const { scheduledWorkouts, isLoading: scheduleLoading, refresh: refreshSchedule } = useSchedule()
  const { templates, isLoading: templatesLoading } = useTemplates()
  const [editingSchedule, setEditingSchedule] = useState<ScheduledWorkoutWithDetails | null>(null)
  const [addingToDay, setAddingToDay] = useState<number | null>(null)

  const isLoading = scheduleLoading || templatesLoading

  const handleUnschedule = async (id: string) => {
    if (!confirm('Remove this workout from the schedule?')) return
    await api.unscheduleWorkout(id)
    await refreshSchedule()
  }

  const handleScheduleComplete = async () => {
    setAddingToDay(null)
    setEditingSchedule(null)
    await refreshSchedule()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    )
  }

  // If scheduling or editing, show the form
  if (addingToDay !== null || editingSchedule) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {editingSchedule ? 'Edit Scheduled Workout' : `Schedule for ${DAYS_OF_WEEK[addingToDay!].label}`}
        </h1>
        <ScheduleForm
          templates={templates}
          dayOfWeek={editingSchedule?.day_of_week ?? addingToDay!}
          existingSchedule={editingSchedule ?? undefined}
          onComplete={handleScheduleComplete}
          onCancel={() => {
            setAddingToDay(null)
            setEditingSchedule(null)
          }}
        />
      </div>
    )
  }

  // Group scheduled workouts by day
  const scheduleByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    workouts: scheduledWorkouts.filter((s) => s.day_of_week === day.value),
  }))

  const today = new Date().getDay()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Schedule</h1>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Schedule your templates for specific days and set target weights for each exercise.
      </p>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">
            Create some templates first before scheduling workouts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scheduleByDay.map((day) => (
            <div
              key={day.value}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
                day.value === today ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className={`font-semibold ${day.value === today ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day.label}
                  {day.value === today && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Today
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setAddingToDay(day.value)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Workout
                </button>
              </div>

              {day.workouts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Rest day</p>
              ) : (
                <div className="space-y-3">
                  {day.workouts.map((scheduled) => (
                    <div
                      key={scheduled.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {scheduled.template.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            {scheduled.template.template_exercises.length} exercises
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingSchedule(scheduled)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit weights"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleUnschedule(scheduled.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove from schedule"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Show exercises with weights */}
                      <ul className="mt-2 text-sm text-gray-600 space-y-1">
                        {scheduled.template.template_exercises.map((ex) => {
                          const scheduledEx = scheduled.scheduled_exercises.find(
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
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
