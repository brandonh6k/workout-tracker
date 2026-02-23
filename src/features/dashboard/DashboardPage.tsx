import { useState, useEffect, useCallback } from 'react'
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
import { useWorkoutMode } from '../../lib/WorkoutModeContext'

export function DashboardPage() {
  const { scheduledWorkouts, isLoading, error, refresh } = useSchedule()
  const navigate = useNavigate()
  const [activeWorkout, setActiveWorkout] = useState<ScheduledWorkoutWithDetails | null>(null)
  const [comparison, setComparison] = useState<ExerciseComparison[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([])
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumeComparison | null>(null)
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set())

  const today = new Date().getDay()
  const todaysWorkouts = scheduledWorkouts.filter((w) => w.day_of_week === today)

  // Check which templates were completed today (use local date, not UTC)
  const now = new Date()
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const completedTodayTemplateIds = new Set(
    recentWorkouts
      .filter((w) => w.date === todayDateStr && w.templateId)
      .map((w) => w.templateId)
  )

  // Load comparison and recent workouts data
  const loadDashboardData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const { setWorkoutActive } = useWorkoutMode()

  const handleStartWorkout = (workout: ScheduledWorkoutWithDetails) => {
    setActiveWorkout(workout)
    setWorkoutActive(true)
  }

  const handleWorkoutComplete = async () => {
    setActiveWorkout(null)
    setWorkoutActive(false)
    refresh()
    await loadDashboardData()
  }

  const handleWorkoutCancel = () => {
    setActiveWorkout(null)
    setWorkoutActive(false)
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
        <div style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={`Failed to load data: ${error.message}`} />
  }

  return (
    <div className="space-y-6 stagger-children">
      {/* Hero Section - Today's Workout */}
      <section 
        className="relative overflow-hidden"
        style={{ 
          background: 'var(--color-iron)',
          border: '1px solid var(--color-steel)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {/* Decorative corner accent */}
        <div 
          className="absolute top-0 right-0 w-32 h-32 opacity-10"
          style={{
            background: 'linear-gradient(135deg, var(--color-ember) 0%, transparent 70%)'
          }}
        />
        
        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-2 h-8"
              style={{ background: 'var(--color-ember)', borderRadius: 'var(--radius-sm)' }}
            />
            <h1 
              className="text-2xl"
              style={{ 
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                color: 'var(--color-chalk)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Today's Workout
            </h1>
          </div>

          {todaysWorkouts.length > 0 ? (
            <div className="space-y-4">
              {todaysWorkouts.map((workout) => {
                const isCompleted = completedTodayTemplateIds.has(workout.template_id)
                return (
                  <div
                    key={workout.id}
                    className="p-4"
                    style={{ 
                      background: 'var(--color-steel)',
                      border: `1px solid ${isCompleted ? 'var(--color-success-muted)' : 'var(--color-concrete)'}`,
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <h3
                        className="text-lg"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          color: 'var(--color-chalk)',
                          textTransform: 'uppercase'
                        }}
                      >
                        {workout.template.name}
                      </h3>
                      <div className="flex items-center justify-between gap-4 mt-2">
                        <p
                          className="text-sm"
                          style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
                        >
                          {workout.template.template_exercises.length} exercises
                        </p>
                        {isCompleted ? (
                          <div
                            className="flex items-center gap-2 px-4 py-2"
                            style={{
                              background: 'var(--color-success-muted)',
                              color: 'var(--color-success)',
                              borderRadius: 'var(--radius-sm)',
                              fontFamily: 'var(--font-display)',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '0.875rem'
                            }}
                          >
                            <span>✓</span>
                            <span>Completed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartWorkout(workout)}
                            className="btn-primary animate-pulse-glow"
                            style={{
                              padding: '0.75rem 1.5rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            Start Workout
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Exercise list */}
                    {workout.template.template_exercises.length > 0 && (
                      <ul className="mt-4 space-y-1">
                        {(expandedWorkouts.has(workout.id)
                          ? workout.template.template_exercises
                          : workout.template.template_exercises.slice(0, 5)
                        ).map((ex) => {
                          const scheduledEx = workout.scheduled_exercises.find(
                            (se) => se.exercise_name === ex.exercise_name
                          )
                          return (
                            <li 
                              key={ex.id} 
                              className="flex justify-between py-1 border-b"
                              style={{ 
                                borderColor: 'var(--color-concrete)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.8125rem'
                              }}
                            >
                              <span style={{ color: 'var(--color-ash)' }}>{ex.exercise_name}</span>
                              <span style={{ color: 'var(--color-zinc)' }}>
                                {scheduledEx?.target_weight ?? 0}# · {ex.target_sets}×{ex.target_reps}
                              </span>
                            </li>
                          )
                        })}
                        {workout.template.template_exercises.length > 5 && !expandedWorkouts.has(workout.id) && (
                          <li>
                            <button
                              onClick={() => setExpandedWorkouts((prev) => new Set(prev).add(workout.id))}
                              className="text-sm mt-2"
                              style={{ color: 'var(--color-ember)', fontFamily: 'var(--font-mono)' }}
                            >
                              +{workout.template.template_exercises.length - 5} more exercises
                            </button>
                          </li>
                        )}
                        {workout.template.template_exercises.length > 5 && expandedWorkouts.has(workout.id) && (
                          <li>
                            <button
                              onClick={() => setExpandedWorkouts((prev) => {
                                const next = new Set(prev)
                                next.delete(workout.id)
                                return next
                              })}
                              className="text-sm mt-2"
                              style={{ color: 'var(--color-ember)', fontFamily: 'var(--font-mono)' }}
                            >
                              Show less
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-4">
              <p style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}>
                Rest day — no workout scheduled
              </p>
              <button
                onClick={() => navigate('/schedule')}
                className="btn-secondary mt-4"
              >
                Schedule a Workout
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Volume Stats */}
      {weeklyVolume && (weeklyVolume.thisWeek > 0 || weeklyVolume.lastWeek > 0) && (
        <section className="grid grid-cols-2 gap-4">
          <VolumeCard
            label="This Week"
            volume={weeklyVolume.thisWeek}
            sessions={weeklyVolume.thisWeekSessions}
            isHighlighted
          />
          <VolumeCard
            label="Last Week"
            volume={weeklyVolume.lastWeek}
            sessions={weeklyVolume.lastWeekSessions}
            change={weeklyVolume.change}
          />
        </section>
      )}

      {/* Weekly Calendar */}
      <section>
        <SectionHeader title="Weekly Schedule" icon="▦" />
        <WeeklyCalendar
          scheduledWorkouts={scheduledWorkouts}
          onSelectWorkout={handleStartWorkout}
        />
      </section>

      {/* Progress Comparison */}
      {comparison.length > 0 && (
        <section 
          style={{ 
            background: 'var(--color-iron)',
            border: '1px solid var(--color-steel)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem'
          }}
        >
          <SectionHeader title="Progress vs 4 Weeks Ago" icon="↗" />
          <div className="space-y-2 mt-4">
            {comparison.slice(0, 5).map((item) => (
              <ComparisonRow key={item.exerciseName} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Workouts */}
      <section 
        style={{ 
          background: 'var(--color-iron)',
          border: '1px solid var(--color-steel)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem'
        }}
      >
        <SectionHeader title="Recent Workouts" icon="◷" />
        {recentWorkouts.length > 0 ? (
          <div className="space-y-2 mt-4">
            {recentWorkouts.map((workout) => (
              <RecentWorkoutRow key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          <p 
            className="mt-4"
            style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)', fontStyle: 'italic' }}
          >
            No workouts logged yet
          </p>
        )}
      </section>
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: 'var(--color-ember)', fontSize: '1.25rem' }}>{icon}</span>
      <h2 
        style={{ 
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: 'var(--color-chalk)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '1.125rem'
        }}
      >
        {title}
      </h2>
    </div>
  )
}

function VolumeCard({ 
  label, 
  volume, 
  sessions, 
  change,
  isHighlighted 
}: { 
  label: string
  volume: number
  sessions: number
  change?: number | null
  isHighlighted?: boolean
}) {
  return (
    <div 
      className="p-4"
      style={{ 
        background: 'var(--color-iron)',
        border: `1px solid ${isHighlighted ? 'var(--color-ember)' : 'var(--color-steel)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: isHighlighted ? 'var(--shadow-glow)' : 'none'
      }}
    >
      <div 
        className="text-xs uppercase tracking-wider mb-1"
        style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-display)' }}
      >
        {label}
      </div>
      <div 
        className="text-3xl font-bold"
        style={{ 
          color: isHighlighted ? 'var(--color-ember)' : 'var(--color-chalk)',
          fontFamily: 'var(--font-display)'
        }}
      >
        {volume.toLocaleString()}
        <span className="text-lg ml-1" style={{ color: 'var(--color-zinc)' }}>#</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span 
          className="text-xs"
          style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
        >
          {sessions} session{sessions !== 1 ? 's' : ''}
        </span>
        {change !== null && change !== undefined && (
          <span
            className="text-xs px-1.5 py-0.5"
            style={{ 
              background: change > 0 ? 'var(--color-success-muted)' : change < 0 ? 'var(--color-danger-muted)' : 'var(--color-concrete)',
              color: change > 0 ? 'var(--color-success)' : change < 0 ? 'var(--color-danger)' : 'var(--color-ash)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600
            }}
          >
            {change > 0 && '+'}
            {change}%
          </span>
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
    <div 
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: 'var(--color-concrete)' }}
    >
      <div className="flex-1 min-w-0">
        <div 
          className="truncate"
          style={{ 
            color: 'var(--color-chalk)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem'
          }}
        >
          {item.exerciseName}
        </div>
        <div 
          className="text-sm mt-0.5"
          style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
        >
          {item.currentWeek ? (
            <>
              <span style={{ color: 'var(--color-ember)' }}>{item.currentWeek.e1rm}#</span>
              {item.pastWeek && (
                <span> vs {item.pastWeek.e1rm}#</span>
              )}
            </>
          ) : '—'}
        </div>
      </div>
      {hasChange && (
        <div
          className="text-sm px-2 py-1"
          style={{ 
            background: isPositive ? 'var(--color-success-muted)' : isNegative ? 'var(--color-danger-muted)' : 'var(--color-concrete)',
            color: isPositive ? 'var(--color-success)' : isNegative ? 'var(--color-danger)' : 'var(--color-ash)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600
          }}
        >
          {isPositive && '+'}
          {item.change}%
        </div>
      )}
      {!hasChange && item.currentWeek && !item.pastWeek && (
        <div 
          className="text-xs uppercase"
          style={{ color: 'var(--color-info)', fontFamily: 'var(--font-display)' }}
        >
          New
        </div>
      )}
    </div>
  )
}

function RecentWorkoutRow({ workout }: { workout: RecentWorkout }) {
  const formatted = formatWorkoutDate(workout.date)

  return (
    <div 
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: 'var(--color-concrete)' }}
    >
      <div>
        <div 
          style={{ 
            color: 'var(--color-chalk)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem'
          }}
        >
          {workout.templateName ?? 'Ad-hoc Workout'}
        </div>
        <div 
          className="text-sm mt-0.5"
          style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
        >
          {formatted}
        </div>
      </div>
      <div className="text-right">
        <div 
          style={{ 
            color: 'var(--color-ember)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          {workout.totalVolume.toLocaleString()}#
        </div>
        <div 
          className="text-xs mt-0.5"
          style={{ color: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
        >
          {workout.exerciseCount} exercises
        </div>
      </div>
    </div>
  )
}
