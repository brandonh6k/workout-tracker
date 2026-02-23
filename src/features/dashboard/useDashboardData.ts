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

export function useDashboardData() {
  const [comparison, setComparison] = useState<ExerciseComparison[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([])
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumeComparison | null>(null)
  const [completedData, setCompletedData] = useState<CompletedSessionData>(new Map())

  const refresh = useCallback(async () => {
    try {
      const [comparisonData, recentData, volumeData, completedSessionData] = await Promise.all([
        getProgressComparison(4),
        getRecentWorkouts(5),
        getWeeklyVolumeComparison(),
        getTodayCompletedSessionData(),
      ])
      setComparison(comparisonData)
      setRecentWorkouts(recentData)
      setWeeklyVolume(volumeData)
      setCompletedData(completedSessionData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { comparison, recentWorkouts, weeklyVolume, completedData, refresh }
}
