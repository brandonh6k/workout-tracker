import { useState, useEffect, useMemo } from 'react'
import { getExerciseHistory, getExerciseStats, calculateEstimated1RM } from './api'
import type { ExerciseHistoryEntry, ExerciseStats } from './api'
import type { ExerciseType } from '../../types'

type Props = {
  exerciseName: string
  exerciseType: ExerciseType
  onBack: () => void
}

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [historyData, statsData] = await Promise.all([
          getExerciseHistory(exerciseName),
          getExerciseStats(exerciseName),
        ])
        setHistory(historyData)
        setStats(statsData)
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
    return <div className="text-gray-500">Loading...</div>
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
        <h1 className="text-2xl font-bold text-gray-900">{exerciseName}</h1>
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

      {/* History List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">History</h2>
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
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sublabel && <div className="text-xs text-gray-400">{sublabel}</div>}
    </div>
  )
}

function HistoryEntry({ entry, isPR }: { entry: ExerciseHistoryEntry; isPR: boolean }) {
  const date = new Date(entry.date)
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

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
        <div className="font-medium text-gray-900">{formatted}</div>
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
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      {set.weight}# x {set.reps}
    </span>
  )
}
