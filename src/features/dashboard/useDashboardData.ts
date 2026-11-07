import { useState, useEffect, useCallback } from 'react'
import {
  getProgressComparison,
  getRecentWorkouts,
  getWeeklyVolumeComparison,
  getTodayCompletedSessionData,
  type ExerciseComparison,
  type RecentWorkout,
  type WeeklyVolumeComparison,
  type CompletedSessionData,
} from '../progress'

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>

function loadDashboardData() {
  return Promise.all([
    getProgressComparison(4),
    getRecentWorkouts(5),
    getWeeklyVolumeComparison(),
    getTodayCompletedSessionData(),
  ])
}

function logLoadError(err: unknown) {
  console.error('Failed to load dashboard data:', err)
}

export function useDashboardData() {
  const [comparison, setComparison] = useState<ExerciseComparison[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([])
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumeComparison | null>(null)
  const [completedData, setCompletedData] = useState<CompletedSessionData>(new Map())

  const apply = useCallback(
    ([comparisonData, recentData, volumeData, completedSessionData]: DashboardData) => {
      setComparison(comparisonData)
      setRecentWorkouts(recentData)
      setWeeklyVolume(volumeData)
      setCompletedData(completedSessionData)
    },
    []
  )

  const refresh = useCallback(() => loadDashboardData().then(apply, logLoadError), [apply])

  useEffect(() => {
    let cancelled = false
    loadDashboardData().then((data) => {
      if (!cancelled) apply(data)
    }, logLoadError)
    return () => {
      cancelled = true
    }
  }, [apply])

  return { comparison, recentWorkouts, weeklyVolume, completedData, refresh }
}
