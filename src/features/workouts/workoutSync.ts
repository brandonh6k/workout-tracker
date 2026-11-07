import { useSyncExternalStore } from 'react'
import * as api from './api'
import { createSyncQueue, type SyncOp } from './syncQueue'
import type { ScheduledWorkoutWithDetails } from '../schedule'
import type { WorkoutState } from './workoutReducer'

async function execute(op: SyncOp): Promise<void> {
  switch (op.kind) {
    case 'startSession':
      return api.insertWorkoutSession(op.session)
    case 'logSet':
      return api.logSet(op.set)
    case 'updateSet':
      return api.updateSet(op.setId, op.updates)
    case 'completeSession':
      await api.completeWorkoutSession(op.sessionId, op.durationMinutes)
      return
    case 'abandonSession':
      return api.abandonWorkoutSession(op.sessionId)
  }
}

export const workoutSync = createSyncQueue({
  key: 'workout-tracker:sync-queue',
  storage: localStorage,
  execute,
})

window.addEventListener('online', () => void workoutSync.flush())
// Ops left over from a previous page load
void workoutSync.flush()

export function useWorkoutSyncStatus() {
  return useSyncExternalStore(workoutSync.subscribe, workoutSync.getSnapshot)
}

const ACTIVE_WORKOUT_KEY = 'workout-tracker:active-workout'

export type SavedWorkout = {
  scheduledWorkout: ScheduledWorkoutWithDetails
  state: WorkoutState
}

export function saveActiveWorkout(saved: SavedWorkout) {
  try {
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(saved))
  } catch {
    // Storage unavailable: the workout still runs, it just won't survive a reload
  }
}

export function loadActiveWorkout(): SavedWorkout | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_KEY)
    return raw ? (JSON.parse(raw) as SavedWorkout) : null
  } catch {
    return null
  }
}

export function clearActiveWorkout() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY)
  } catch {
    // Nothing to clear
  }
}
