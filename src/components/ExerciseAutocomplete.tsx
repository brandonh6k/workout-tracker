import { useState, useEffect, useRef } from 'react'
import { searchExercises, createCustomExercise } from '../features/templates/exerciseApi'
import type { Exercise, ExerciseType } from '../types'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ExerciseAutocomplete({
  value,
  onChange,
  placeholder = 'Search exercises...',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [pendingName, setPendingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value.trim()) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const results = await searchExercises(value)
        setSuggestions(results)
      } catch (err) {
        console.error('Failed to search exercises:', err)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 150)
    return () => clearTimeout(debounce)
  }, [value])

  const handleSelect = (exerciseName: string) => {
    onChange(exerciseName)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleCreateCustom = () => {
    if (!value.trim()) return
    setPendingName(value.trim())
    setShowTypeSelector(true)
    setIsOpen(false)
  }

  const handleConfirmCreate = async (exerciseType: ExerciseType) => {
    if (!pendingName) return

    try {
      await createCustomExercise(pendingName, exerciseType)
      handleSelect(pendingName)
    } catch (err) {
      console.error('Failed to create custom exercise:', err)
    } finally {
      setShowTypeSelector(false)
      setPendingName('')
    }
  }

  const handleCancelCreate = () => {
    setShowTypeSelector(false)
    setPendingName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    const itemCount = suggestions.length + (showCreateOption ? 1 : 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % itemCount)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + itemCount) % itemCount)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex].name)
        } else if (highlightedIndex === suggestions.length && showCreateOption) {
          handleCreateCustom()
        } else if (value.trim()) {
          handleSelect(value.trim())
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const exactMatch = suggestions.some(
    (s) => s.name.toLowerCase() === value.toLowerCase()
  )
  const showCreateOption = value.trim() && !exactMatch && !isLoading

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setHighlightedIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setIsOpen(false), 200)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        autoComplete="off"
      />

      {isOpen && (suggestions.length > 0 || showCreateOption) && (
        <ul
          ref={listRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((exercise, index) => (
            <li
              key={exercise.id}
              onClick={() => handleSelect(exercise.name)}
              className={`px-3 py-2 cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{exercise.name}</span>
              {exercise.category && (
                <span className="ml-2 text-sm text-gray-500">
                  {exercise.category}
                </span>
              )}
              {exercise.is_custom && (
                <span className="ml-2 text-xs text-gray-400">(custom)</span>
              )}
            </li>
          ))}

          {showCreateOption && (
            <li
              onClick={handleCreateCustom}
              className={`px-3 py-2 cursor-pointer border-t border-gray-100 ${
                highlightedIndex === suggestions.length
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-blue-600">+ Create "{value.trim()}"</span>
            </li>
          )}
        </ul>
      )}

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Type selector modal for new exercises */}
      {showTypeSelector && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Create "{pendingName}" as:
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleConfirmCreate('weighted')}
              className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Weighted (barbells, dumbbells, machines)
            </button>
            <button
              type="button"
              onClick={() => handleConfirmCreate('bodyweight')}
              className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Bodyweight (dips, pull-ups, push-ups)
            </button>
            <button
              type="button"
              onClick={() => handleConfirmCreate('cardio')}
              className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Cardio (running, rowing, cycling)
            </button>
          </div>
          <button
            type="button"
            onClick={handleCancelCreate}
            className="w-full mt-2 px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
