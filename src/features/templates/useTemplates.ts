import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { TemplateWithExercises } from './api'
import * as api from './api'

type UseTemplatesResult = {
  templates: TemplateWithExercises[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  optimisticDelete: (id: string) => Promise<void>
  optimisticDuplicate: (template: TemplateWithExercises) => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedOnce = useRef(false)

  const refresh = useCallback(async () => {
    try {
      // Only show loading spinner on initial load
      if (!hasLoadedOnce.current) {
        setIsLoading(true)
      }
      setError(null)
      const data = await api.getTemplates()
      setTemplates(data)
      hasLoadedOnce.current = true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Optimistic delete - remove from UI immediately, sync in background
  const optimisticDelete = useCallback(async (id: string) => {
    const previousTemplates = templates
    
    // Optimistically remove from UI
    setTemplates((prev) => prev.filter((t) => t.id !== id))

    try {
      await api.deleteTemplate(id)
      // Background refresh to ensure consistency
      api.getTemplates().then(setTemplates).catch(console.error)
    } catch (err) {
      // Rollback on error
      setTemplates(previousTemplates)
      toast.error('Failed to delete template')
      console.error('Delete failed:', err)
    }
  }, [templates])

  // Optimistic duplicate - add placeholder immediately, replace with real data
  const optimisticDuplicate = useCallback(async (template: TemplateWithExercises) => {
    const tempId = `temp-${Date.now()}`
    const optimisticTemplate: TemplateWithExercises = {
      ...template,
      id: tempId,
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
    }

    // Optimistically add to UI
    setTemplates((prev) => [...prev, optimisticTemplate].sort((a, b) => a.name.localeCompare(b.name)))

    try {
      const newTemplate = await api.duplicateTemplate(template.id)
      // Replace temp with real template
      setTemplates((prev) => 
        prev.map((t) => t.id === tempId ? newTemplate : t)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    } catch (err) {
      // Rollback on error
      setTemplates((prev) => prev.filter((t) => t.id !== tempId))
      toast.error('Failed to duplicate template')
      console.error('Duplicate failed:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { templates, isLoading, error, refresh, optimisticDelete, optimisticDuplicate }
}

type UseTemplateResult = {
  template: TemplateWithExercises | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useTemplate(id: string | undefined): UseTemplateResult {
  const [template, setTemplate] = useState<TemplateWithExercises | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!id) {
      setTemplate(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getTemplate(id)
      setTemplate(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch template'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { template, isLoading, error, refresh }
}
