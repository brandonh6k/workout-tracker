import { createContext, useContext, useState, type ReactNode } from 'react'

type WorkoutModeContextValue = {
  isWorkoutActive: boolean
  setWorkoutActive: (active: boolean) => void
}

const WorkoutModeContext = createContext<WorkoutModeContextValue>({
  isWorkoutActive: false,
  setWorkoutActive: () => {},
})

export function WorkoutModeProvider({ children }: { children: ReactNode }) {
  const [isWorkoutActive, setWorkoutActive] = useState(false)
  return (
    <WorkoutModeContext.Provider value={{ isWorkoutActive, setWorkoutActive }}>
      {children}
    </WorkoutModeContext.Provider>
  )
}

export function useWorkoutMode() {
  return useContext(WorkoutModeContext)
}
