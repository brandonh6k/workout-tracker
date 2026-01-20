import { useState } from 'react'
import { useSchedule, type ScheduledWorkoutWithDetails } from './index'
import { useTemplates } from '../templates'
import { ScheduleForm } from './ScheduleForm'
import * as api from './api'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'SUN' },
  { value: 1, label: 'Monday', short: 'MON' },
  { value: 2, label: 'Tuesday', short: 'TUE' },
  { value: 3, label: 'Wednesday', short: 'WED' },
  { value: 4, label: 'Thursday', short: 'THU' },
  { value: 5, label: 'Friday', short: 'FRI' },
  { value: 6, label: 'Saturday', short: 'SAT' },
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
      <div className="flex items-center justify-center py-16">
        <div 
          className="text-center"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          <div 
            className="w-8 h-8 mx-auto mb-3 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-graphite)', borderTopColor: 'transparent' }}
          />
          Loading schedule...
        </div>
      </div>
    )
  }

  // If scheduling or editing, show the form
  if (addingToDay !== null || editingSchedule) {
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="flex items-center gap-4">
          <button
            onClick={() => {
              setAddingToDay(null)
              setEditingSchedule(null)
            }}
            className="p-2 hover:bg-[var(--color-steel)] rounded transition-colors"
            style={{ color: 'var(--color-slate)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 
            className="text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            {editingSchedule ? 'EDIT WORKOUT' : `SCHEDULE · ${DAYS_OF_WEEK[addingToDay!].short}`}
          </h1>
        </header>
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
  const totalWorkouts = scheduledWorkouts.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            WEEKLY SCHEDULE
          </h1>
          <p 
            className="text-sm mt-1"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div 
          className="card text-center py-12"
          style={{ borderStyle: 'dashed', borderColor: 'var(--color-graphite)' }}
        >
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-steel)' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-zinc)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p 
            className="mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)', fontSize: '1.1rem' }}
          >
            CREATE TEMPLATES FIRST
          </p>
          <p 
            className="text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Build workout templates before scheduling
          </p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {scheduleByDay.map((day) => {
            const isToday = day.value === today
            const hasWorkouts = day.workouts.length > 0
            
            return (
              <div
                key={day.value}
                className="card relative overflow-hidden transition-all"
                style={{ 
                  padding: 0,
                  borderColor: isToday ? 'var(--color-ember)' : 'var(--color-steel)'
                }}
              >
                {/* Day indicator bar */}
                {isToday && (
                  <div 
                    className="absolute top-0 left-0 w-full h-0.5"
                    style={{ background: 'linear-gradient(90deg, var(--color-ember), var(--color-flame))' }}
                  />
                )}
                
                <div className="p-4">
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-sm font-semibold tracking-wider"
                        style={{ 
                          fontFamily: 'var(--font-display)', 
                          color: isToday ? 'var(--color-ember)' : 'var(--color-ash)' 
                        }}
                      >
                        {day.short}
                      </span>
                      {isToday && (
                        <span 
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ 
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--color-ember)',
                            color: 'var(--color-void)'
                          }}
                        >
                          Today
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setAddingToDay(day.value)}
                      className="text-xs uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1"
                      style={{ 
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-ember)',
                        background: 'transparent',
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>

                  {/* Workouts or rest indicator */}
                  {!hasWorkouts ? (
                    <p 
                      className="text-sm italic"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}
                    >
                      Rest day
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {day.workouts.map((scheduled) => (
                        <div
                          key={scheduled.id}
                          className="rounded p-3 group"
                          style={{ background: 'var(--color-void)', border: '1px solid var(--color-steel)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 
                                className="text-sm tracking-wide truncate"
                                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
                              >
                                {scheduled.template.name.toUpperCase()}
                              </h3>
                              <p 
                                className="text-xs mt-0.5"
                                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
                              >
                                {scheduled.template.template_exercises.length} exercises
                              </p>
                            </div>
                            <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingSchedule(scheduled)}
                                className="p-1.5 rounded transition-colors hover:bg-[var(--color-steel)]"
                                style={{ color: 'var(--color-slate)' }}
                                title="Edit weights"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleUnschedule(scheduled.id)}
                                className="p-1.5 rounded transition-colors hover:bg-[var(--color-danger-muted)]"
                                style={{ color: 'var(--color-slate)' }}
                                title="Remove"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Exercise list with weights */}
                          <div 
                            className="mt-2 pt-2 space-y-1"
                            style={{ borderTop: '1px solid var(--color-steel)' }}
                          >
                            {scheduled.template.template_exercises.map((ex) => {
                              const scheduledEx = scheduled.scheduled_exercises.find(
                                (se) => se.exercise_name === ex.exercise_name
                              )
                              const weight = scheduledEx?.target_weight ?? 0
                              return (
                                <div 
                                  key={ex.id} 
                                  className="flex justify-between items-center text-xs"
                                  style={{ fontFamily: 'var(--font-mono)' }}
                                >
                                  <span style={{ color: 'var(--color-ash)' }}>{ex.exercise_name}</span>
                                  <span 
                                    className="tabular-nums"
                                    style={{ color: weight > 0 ? 'var(--color-ember)' : 'var(--color-zinc)' }}
                                  >
                                    {weight}# · {ex.target_sets}×{ex.target_reps}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
