import { useState, useEffect, useCallback } from 'react'
import type { ScheduledWorkoutWithDetails } from './api'
import * as api from './api'

type UseScheduleResult = {
  scheduledWorkouts: ScheduledWorkoutWithDetails[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useSchedule(): UseScheduleResult {
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkoutWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getScheduledWorkouts()
      setScheduledWorkouts(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch schedule'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { scheduledWorkouts, isLoading, error, refresh }
}
