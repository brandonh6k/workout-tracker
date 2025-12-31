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
  calculateEstimated1RM,
} from './api'
import type { ExerciseHistoryEntry, ExerciseStats, ProgressDataPoint } from './api'
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
    return <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{exerciseName}</h1>
      </div>

      {/* Stats Cards - different stats for different exercise types */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exerciseType === 'weighted' && (
            <>
              <StatCard label="Best Weight" value={`${stats.bestWeight}#`} />
              <StatCard label="Est. 1RM" value={`${stats.estimated1RM}#`} />
              <StatCard label="Best Volume" value={`${stats.bestVolume}`} sublabel="(single set)" />
              <StatCard label="Total Sessions" value={stats.totalSessions.toString()} />
            </>
          )}
          {exerciseType === 'bodyweight' && (
            <>
              <StatCard label="Best Reps" value={stats.bestReps.toString()} sublabel="(single set)" />
              <StatCard label="Total Reps" value={stats.totalVolume.toString()} sublabel="(all time)" />
              <StatCard label="Total Sets" value={stats.totalSets.toString()} />
              <StatCard label="Total Sessions" value={stats.totalSessions.toString()} />
            </>
          )}
          {exerciseType === 'cardio' && (
            <>
              <StatCard label="Sessions" value={stats.totalSessions.toString()} />
              <StatCard label="Coming Soon" value="--" sublabel="(cardio stats)" />
            </>
          )}
        </div>
      )}

      {/* Progress Chart - only for weighted/bodyweight with enough data */}
      {progressData.length >= 2 && exerciseType !== 'cardio' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Progress</h2>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">History</h2>
        </div>
        
        {history.length === 0 ? (
          <div className="p-4 text-gray-500 italic">No history for this exercise</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((entry) => (
              <HistoryEntry
                key={entry.sessionId}
                entry={entry}
                isPR={entry.sessionId === prSessionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {sublabel && <div className="text-xs text-gray-400 dark:text-gray-500">{sublabel}</div>}
    </div>
  )
}

function HistoryEntry({ entry, isPR }: { entry: ExerciseHistoryEntry; isPR: boolean }) {
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
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-900 dark:text-white">{formatted}</div>
        {isPR && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
            PR
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {entry.sets.map((set) => (
          <SetBadge key={set.id} set={set} isBest={set.id === bestSet.id} />
        ))}
      </div>
    </div>
  )
}

function SetBadge({ set, isBest }: { set: { weight: number; reps: number; set_number: number }; isBest: boolean }) {
  return (
    <span
      className={`text-sm px-2 py-1 rounded ${
        isBest
          ? 'bg-blue-100 text-blue-800 font-medium'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700'
      }`}
    >
      {set.weight}# x {set.reps}
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
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-gray-200'
      }`}
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value}${unit}`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#1d4ed8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
