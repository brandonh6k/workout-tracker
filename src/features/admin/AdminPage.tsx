import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { getAllExercises, updateExerciseType, updateExerciseCategory, updateExercise, deleteCustomExercise, mergeExercises } from './api'
import type { Exercise, ExerciseType } from '../../types'

type TypeFilter = 'all' | 'weighted' | 'bodyweight' | 'cardio' | 'custom'

export function AdminPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mergeSource, setMergeSource] = useState<Exercise | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    setIsLoading(true)
    try {
      const data = await getAllExercises()
      setExercises(data)
    } catch (err) {
      console.error('Failed to load exercises:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique categories for filter pills
  const categories = useMemo(() => {
    const cats = new Set<string>()
    exercises.forEach((e) => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats).sort()
  }, [exercises])

  const handleTypeChange = async (exercise: Exercise, newType: ExerciseType) => {
    try {
      await updateExerciseType(exercise.id, newType)
      setExercises((prev) =>
        prev.map((e) => (e.id === exercise.id ? { ...e, exercise_type: newType } : e))
      )
    } catch (err) {
      console.error('Failed to update exercise type:', err)
      toast.error('Failed to update exercise type')
    }
  }

  const handleCategoryChange = async (exercise: Exercise, newCategory: string | null) => {
    try {
      await updateExerciseCategory(exercise.id, newCategory)
      setExercises((prev) =>
        prev.map((e) => (e.id === exercise.id ? { ...e, category: newCategory } : e))
      )
    } catch (err) {
      console.error('Failed to update exercise category:', err)
      toast.error('Failed to update category')
    }
  }

  const handleSaveEdit = async (exerciseId: string, updates: { name?: string; category?: string | null; exercise_type?: ExerciseType }) => {
    try {
      await updateExercise(exerciseId, updates)
      setExercises((prev) =>
        prev.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e))
      )
      setEditingExercise(null)
      toast.success('Exercise updated')
    } catch (err) {
      console.error('Failed to update exercise:', err)
      toast.error('Failed to update exercise')
    }
  }

  const handleDelete = async (exercise: Exercise) => {
    if (!exercise.is_custom) return

    try {
      await deleteCustomExercise(exercise.id)
      setExercises((prev) => prev.filter((e) => e.id !== exercise.id))
      toast.success(`Deleted "${exercise.name}"`)
    } catch (err) {
      console.error('Failed to delete exercise:', err)
      toast.error('Failed to delete exercise')
    }
  }

  const handleConfirmMerge = async (targetName: string) => {
    if (!mergeSource || !targetName) return

    try {
      const result = await mergeExercises(mergeSource.name, targetName)
      
      if (mergeSource.is_custom) {
        await deleteCustomExercise(mergeSource.id)
        setExercises((prev) => prev.filter((e) => e.id !== mergeSource.id))
      }
      
      toast.success(`Merged! Updated ${result.loggedSets} sets, ${result.templateExercises} templates, ${result.scheduledExercises} scheduled.`)
      setMergeSource(null)
    } catch (err) {
      console.error('Failed to merge exercises:', err)
      toast.error('Failed to merge exercises')
    }
  }

  // Filter exercises by search (name OR category), type filter, and category filter
  const filteredExercises = exercises.filter((e) => {
    // Search filter - matches name or category
    if (search) {
      const searchLower = search.toLowerCase()
      const nameMatch = e.name.toLowerCase().includes(searchLower)
      const categoryMatch = e.category?.toLowerCase().includes(searchLower)
      if (!nameMatch && !categoryMatch) return false
    }
    // Type filter
    if (typeFilter === 'custom') {
      if (!e.is_custom) return false
    } else if (typeFilter !== 'all') {
      if (e.exercise_type !== typeFilter) return false
    }
    // Category filter
    if (categoryFilter && e.category !== categoryFilter) return false
    return true
  })

  const typeCounts = {
    all: exercises.length,
    weighted: exercises.filter((e) => e.exercise_type === 'weighted').length,
    bodyweight: exercises.filter((e) => e.exercise_type === 'bodyweight').length,
    cardio: exercises.filter((e) => e.exercise_type === 'cardio').length,
    custom: exercises.filter((e) => e.is_custom).length,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Exercise Library</h2>
          <p className="text-sm text-gray-500">Manage exercise types, categories, and custom exercises</p>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-3">
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          
          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'weighted', 'bodyweight', 'cardio', 'custom'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 text-sm rounded-full ${
                  typeFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({typeCounts[f]})
              </button>
            ))}
          </div>

          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center mr-1">Category:</span>
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-2 py-0.5 text-xs rounded-full ${
                  categoryFilter === null
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    categoryFilter === cat
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exercise List */}
        {isLoading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : filteredExercises.length === 0 ? (
          <div className="p-4 text-gray-500 italic">No exercises found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredExercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                categories={categories}
                onTypeChange={handleTypeChange}
                onCategoryChange={handleCategoryChange}
                onEdit={() => setEditingExercise(exercise)}
                onDelete={handleDelete}
                onMerge={() => setMergeSource(exercise)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Merge Dialog */}
      {mergeSource && (
        <MergeDialog
          source={mergeSource}
          exercises={exercises.filter((e) => e.id !== mergeSource.id)}
          onConfirm={handleConfirmMerge}
          onCancel={() => setMergeSource(null)}
        />
      )}

      {/* Edit Dialog */}
      {editingExercise && (
        <EditDialog
          exercise={editingExercise}
          categories={categories}
          onSave={handleSaveEdit}
          onCancel={() => setEditingExercise(null)}
        />
      )}

    </div>
  )
}

// Close button component for dialogs
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
      title="Close"
    >
      ×
    </button>
  )
}

type MergeStep = 'select' | 'confirm'

function MergeDialog({
  source,
  exercises,
  onConfirm,
  onCancel,
}: {
  source: Exercise
  exercises: Exercise[]
  onConfirm: (targetName: string) => void
  onCancel: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [step, setStep] = useState<MergeStep>('select')

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <CloseButton onClick={onCancel} />

        {step === 'select' ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 pr-10">
              <h3 className="font-semibold text-gray-900">Merge Exercise</h3>
              <p className="text-sm text-gray-500">Merge "{source.name}" into another exercise</p>
            </div>

            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Search for target exercise..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedTarget(null)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                autoFocus
              />

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredExercises.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 italic">No exercises found</div>
                ) : (
                  filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => setSelectedTarget(exercise.name)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                        selectedTarget === exercise.name ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span>{exercise.name}</span>
                      {exercise.is_custom && <span className="text-xs text-gray-400">custom</span>}
                    </button>
                  ))
                )}
              </div>

              {selectedTarget && (
                <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                  Will merge <strong>{source.name}</strong> → <strong>{selectedTarget}</strong>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedTarget}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 pr-10">
              <h3 className="font-semibold text-gray-900">Confirm Merge</h3>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to merge <strong>"{source.name}"</strong> into{' '}
                <strong>"{selectedTarget}"</strong>?
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                <p className="text-sm text-yellow-800 font-medium">This will update:</p>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>All logged sets with this exercise</li>
                  <li>All template exercises</li>
                  <li>All scheduled exercises</li>
                </ul>
              </div>

              <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setStep('select')} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
                Back
              </button>
              <button
                onClick={() => onConfirm(selectedTarget!)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
              >
                Confirm Merge
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EditDialog({
  exercise,
  categories,
  onSave,
  onCancel,
}: {
  exercise: Exercise
  categories: string[]
  onSave: (exerciseId: string, updates: { name?: string; category?: string | null; exercise_type?: ExerciseType }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(exercise.name)
  const [category, setCategory] = useState(exercise.category ?? '')
  const [exerciseType, setExerciseType] = useState<ExerciseType>(exercise.exercise_type)

  const handleSave = () => {
    onSave(exercise.id, {
      name: name.trim(),
      category: category.trim() || null,
      exercise_type: exerciseType,
    })
  }

  const hasChanges =
    name.trim() !== exercise.name ||
    (category.trim() || null) !== exercise.category ||
    exerciseType !== exercise.exercise_type

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <CloseButton onClick={onCancel} />

        <div className="px-4 py-3 border-b border-gray-200 pr-10">
          <h3 className="font-semibold text-gray-900">Edit Exercise</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., push, pull, core, lower"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="cardio">Cardio</option>
            </select>
          </div>

          {exercise.is_custom && (
            <p className="text-xs text-gray-500">This is a custom exercise you created.</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !hasChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ExerciseRow({
  exercise,
  categories,
  onTypeChange,
  onCategoryChange,
  onEdit,
  onDelete,
  onMerge,
}: {
  exercise: Exercise
  categories: string[]
  onTypeChange: (exercise: Exercise, type: ExerciseType) => void
  onCategoryChange: (exercise: Exercise, category: string | null) => void
  onEdit: () => void
  onDelete: (exercise: Exercise) => void
  onMerge: () => void
}) {
  const [editingCategory, setEditingCategory] = useState(false)
  const [editingType, setEditingType] = useState(false)

  const handleCategoryChange = (value: string) => {
    onCategoryChange(exercise, value || null)
    setEditingCategory(false)
  }

  const handleTypeChange = (value: ExerciseType) => {
    onTypeChange(exercise, value)
    setEditingType(false)
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      {/* Left side: name and pills */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 truncate">{exercise.name}</span>
          {exercise.is_custom && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Custom</span>
          )}
        </div>
        
        {/* Pills row */}
        <div className="flex items-center gap-2 mt-1">
          {/* Category pill/dropdown */}
          {editingCategory ? (
            <select
              value={exercise.category ?? ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              onBlur={() => setEditingCategory(false)}
              className="text-xs border border-gray-300 rounded px-1.5 py-0.5 text-gray-600"
              autoFocus
            >
              <option value="">none</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setEditingCategory(true)}
              className={`text-xs px-2 py-0.5 rounded-full ${
                exercise.category
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-dashed border-gray-300'
              }`}
              title="Click to change category"
            >
              {exercise.category || 'no category'}
            </button>
          )}

          {/* Type pill/dropdown */}
          {editingType ? (
            <select
              value={exercise.exercise_type}
              onChange={(e) => handleTypeChange(e.target.value as ExerciseType)}
              onBlur={() => setEditingType(false)}
              className="text-xs border border-gray-300 rounded px-1.5 py-0.5"
              autoFocus
            >
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="cardio">Cardio</option>
            </select>
          ) : (
            <button
              onClick={() => setEditingType(true)}
              className={`text-xs px-2 py-0.5 rounded-full ${
                exercise.exercise_type === 'bodyweight'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : exercise.exercise_type === 'cardio'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
              }`}
              title="Click to change type"
            >
              {exercise.exercise_type === 'bodyweight' ? 'Bodyweight' : 
               exercise.exercise_type === 'cardio' ? 'Cardio' : 'Weighted'}
            </button>
          )}
        </div>
      </div>

      {/* Right side: action icons */}
      <div className="flex items-center gap-1">
        {/* Edit icon */}
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="Edit exercise"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Merge icon */}
        <button
          onClick={onMerge}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          title="Merge into another exercise"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>

        {/* Delete icon (custom only) */}
        {exercise.is_custom && (
          <button
            onClick={() => onDelete(exercise)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete custom exercise"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
