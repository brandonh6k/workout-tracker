import { createContext, useContext } from 'react'

type WorkoutModeContextValue = {
  isWorkoutActive: boolean
  setWorkoutActive: (active: boolean) => void
}

export const WorkoutModeContext = createContext<WorkoutModeContextValue>({
  isWorkoutActive: false,
  setWorkoutActive: () => {},
})

export function useWorkoutMode() {
  return useContext(WorkoutModeContext)
}
