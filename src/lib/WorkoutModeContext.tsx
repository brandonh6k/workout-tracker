import { useState, type ReactNode } from 'react'
import { WorkoutModeContext } from './useWorkoutMode'

export function WorkoutModeProvider({ children }: { children: ReactNode }) {
  const [isWorkoutActive, setWorkoutActive] = useState(false)
  return (
    <WorkoutModeContext.Provider value={{ isWorkoutActive, setWorkoutActive }}>
      {children}
    </WorkoutModeContext.Provider>
  )
}
