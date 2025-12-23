import { useState, useEffect, useCallback } from 'react'
import type { TemplateWithExercises } from './api'
import * as api from './api'

type UseTemplatesResult = {
  templates: TemplateWithExercises[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getTemplates()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { templates, isLoading, error, refresh }
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
