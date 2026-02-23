import { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  getExerciseHistory,
  getExerciseStats,
  getExerciseProgressData,
} from './exerciseApi'
import type { ExerciseHistoryEntry, ExerciseStats, ProgressDataPoint } from './exerciseApi'
import { calculateEstimated1RM } from '../../lib/utils'
import type { ExerciseType } from '../../types'
import { formatShortDate, formatWorkoutDate } from '../../lib/utils'

type Props = {
  exerciseName: string
  exerciseType: ExerciseType
  onBack: () => void
}

type ChartMetric = 'e1rm' | 'weight' | 'volume'

// Get the best e1RM for a session
function getSessionBest1RM(entry: ExerciseHistoryEntry): number {
  let best = 0
  for (const set of entry.sets) {
    const e1rm = calculateEstimated1RM(set.weight, set.reps)
    if (e1rm > best) best = e1rm
  }
  return best
}



export function ExerciseHistoryView({ exerciseName, exerciseType, onBack }: Props) {
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([])
  const [stats, setStats] = useState<ExerciseStats | null>(null)
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [chartMetric, setChartMetric] = useState<ChartMetric>('e1rm')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [historyData, statsData, chartData] = await Promise.all([
          getExerciseHistory(exerciseName),
          getExerciseStats(exerciseName),
          getExerciseProgressData(exerciseName),
        ])
        setHistory(historyData)
        setStats(statsData)
        setProgressData(chartData)
      } catch (err) {
        console.error('Failed to load exercise history:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [exerciseName])

  // Determine which session is THE PR (only one gets the badge)
  // Uses e1RM as the metric, earliest date as tiebreaker
  const prSessionId = useMemo(() => {
    if (history.length === 0) return null

    let bestSessionId = history[0].sessionId
    let best1RM = getSessionBest1RM(history[0])
    let bestDate = history[0].date

    for (const entry of history) {
      const session1RM = getSessionBest1RM(entry)
      // New PR if: higher e1RM, OR same e1RM but earlier date
      if (session1RM > best1RM || (session1RM === best1RM && entry.date < bestDate)) {
        best1RM = session1RM
        bestSessionId = entry.sessionId
        bestDate = entry.date
      }
    }

    return bestSessionId
  }, [history])

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
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button
          onClick={onBack}
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
          {exerciseName.toUpperCase()}
        </h1>
      </header>

      {/* Stats Cards - different stats for different exercise types */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {exerciseType === 'weighted' && (
            <>
              <StatCard label="Best Weight" value={`${stats.bestWeight}#`} />
              <StatCard label="Est. 1RM" value={`${stats.estimated1RM}#`} highlight />
              <StatCard label="Best Volume" value={`${stats.bestVolume}`} sublabel="single set" />
              <StatCard label="Sessions" value={stats.totalSessions.toString()} />
            </>
          )}
          {exerciseType === 'bodyweight' && (
            <>
              <StatCard label="Best Reps" value={stats.bestReps.toString()} highlight sublabel="single set" />
              <StatCard label="Total Reps" value={stats.totalVolume.toString()} sublabel="all time" />
              <StatCard label="Total Sets" value={stats.totalSets.toString()} />
              <StatCard label="Sessions" value={stats.totalSessions.toString()} />
            </>
          )}
          {exerciseType === 'cardio' && (
            <>
              <StatCard label="Sessions" value={stats.totalSessions.toString()} />
              <StatCard label="Coming Soon" value="--" sublabel="cardio stats" />
            </>
          )}
        </div>
      )}

      {/* Progress Chart - only for weighted/bodyweight with enough data */}
      {progressData.length >= 2 && exerciseType !== 'cardio' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 
              className="text-sm tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
            >
              PROGRESS
            </h2>
            {exerciseType === 'weighted' && (
              <div className="flex gap-1">
                <MetricButton
                  label="e1RM"
                  active={chartMetric === 'e1rm'}
                  onClick={() => setChartMetric('e1rm')}
                />
                <MetricButton
                  label="Weight"
                  active={chartMetric === 'weight'}
                  onClick={() => setChartMetric('weight')}
                />
                <MetricButton
                  label="Volume"
                  active={chartMetric === 'volume'}
                  onClick={() => setChartMetric('volume')}
                />
              </div>
            )}
          </div>
          <ProgressChart
            data={progressData}
            metric={exerciseType === 'bodyweight' ? 'volume' : chartMetric}
            exerciseType={exerciseType}
          />
        </div>
      )}

      {/* History List */}
      <div className="card" style={{ padding: 0 }}>
        <div 
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-steel)' }}
        >
          <h2 
            className="text-sm tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
          >
            HISTORY
          </h2>
        </div>
        
        {history.length === 0 ? (
          <div 
            className="p-6 text-center"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            No history for this exercise
          </div>
        ) : (
          <div>
            {history.map((entry, i) => (
              <HistoryEntry
                key={entry.sessionId}
                entry={entry}
                isPR={entry.sessionId === prSessionId}
                isLast={i === history.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  sublabel,
  highlight = false 
}: { 
  label: string
  value: string
  sublabel?: string
  highlight?: boolean
}) {
  return (
    <div 
      className="card p-3"
      style={{ 
        borderColor: highlight ? 'var(--color-ember)' : 'var(--color-steel)',
      }}
    >
      <div 
        className="text-[10px] uppercase tracking-wider mb-1"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
      >
        {label}
      </div>
      <div 
        className="text-xl tabular-nums"
        style={{ 
          fontFamily: 'var(--font-display)', 
          color: highlight ? 'var(--color-ember)' : 'var(--color-bone)' 
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div 
          className="text-[10px] mt-0.5"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}
        >
          {sublabel}
        </div>
      )}
    </div>
  )
}

function HistoryEntry({ 
  entry, 
  isPR, 
  isLast = false 
}: { 
  entry: ExerciseHistoryEntry
  isPR: boolean
  isLast?: boolean
}) {
  const formatted = formatWorkoutDate(entry.date)

  // Find best set of this session (by estimated 1RM)
  let bestSet = entry.sets[0]
  let best1RM = 0
  for (const set of entry.sets) {
    const e1rm = calculateEstimated1RM(set.weight, set.reps)
    if (e1rm > best1RM) {
      best1RM = e1rm
      bestSet = set
    }
  }

  return (
    <div 
      className="px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-steel)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div 
          className="text-sm"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
        >
          {formatted}
        </div>
        {isPR && (
          <span 
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ 
              fontFamily: 'var(--font-mono)',
              background: 'var(--color-heat)',
              color: 'var(--color-void)'
            }}
          >
            PR
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entry.sets.map((set) => (
          <SetBadge key={set.id} set={set} isBest={set.id === bestSet.id} />
        ))}
      </div>
    </div>
  )
}

function SetBadge({ set, isBest }: { set: { weight: number; reps: number; set_number: number; rpe?: number | null; notes?: string | null }; isBest: boolean }) {
  const hasDetails = set.rpe != null || (set.notes != null && set.notes.length > 0)

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded tabular-nums"
      style={{
        fontFamily: 'var(--font-mono)',
        background: isBest ? 'var(--color-ember)' : 'var(--color-steel)',
        color: isBest ? 'var(--color-void)' : 'var(--color-ash)'
      }}
      title={hasDetails ? [
        set.rpe != null ? `RPE ${set.rpe}` : '',
        set.notes || '',
      ].filter(Boolean).join(' — ') : undefined}
    >
      {set.weight}# × {set.reps}
      {set.rpe != null && (
        <span
          className="text-[10px] ml-0.5 px-1 rounded"
          style={{
            background: isBest ? 'rgba(0,0,0,0.2)' : 'var(--color-concrete)',
            color: isBest ? 'var(--color-void)' : 'var(--color-zinc)',
          }}
        >
          @{set.rpe}
        </span>
      )}
      {set.notes != null && set.notes.length > 0 && (
        <span
          className="text-[10px]"
          style={{ color: isBest ? 'rgba(0,0,0,0.5)' : 'var(--color-graphite)' }}
        >
          *
        </span>
      )}
    </span>
  )
}

function MetricButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-colors"
      style={{ 
        fontFamily: 'var(--font-mono)',
        background: active ? 'var(--color-ember)' : 'var(--color-steel)',
        color: active ? 'var(--color-void)' : 'var(--color-ash)'
      }}
    >
      {label}
    </button>
  )
}

function ProgressChart({
  data,
  metric,
  exerciseType,
}: {
  data: ProgressDataPoint[]
  metric: ChartMetric
  exerciseType: ExerciseType
}) {
  const chartData = data.map((d) => ({
    date: formatShortDate(d.date),
    value:
      metric === 'e1rm'
        ? d.e1rm
        : metric === 'weight'
          ? d.bestWeight
          : d.totalVolume,
  }))

  const label =
    metric === 'e1rm'
      ? 'Est. 1RM'
      : metric === 'weight'
        ? 'Best Weight'
        : exerciseType === 'bodyweight'
          ? 'Total Reps'
          : 'Session Volume'

  const unit = exerciseType === 'bodyweight' && metric === 'volume' ? '' : '#'

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-steel)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-steel)' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-zinc)', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-steel)' }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-iron)',
              border: '1px solid var(--color-steel)',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-ash)',
            }}
            formatter={(value) => [`${value}${unit}`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-ember)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-ember)', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: 'var(--color-flame)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
