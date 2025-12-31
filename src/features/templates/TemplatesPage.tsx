import { useState } from 'react'
import { useTemplates } from './useTemplates'
import { TemplateForm } from './TemplateForm'
import { TemplateCard } from './TemplateCard'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorMessage } from '../../components/ErrorMessage'
import * as api from './api'
import type { TemplateWithExercises } from './api'

export function TemplatesPage() {
  const { templates, isLoading, error, refresh, optimisticDelete, optimisticDuplicate } = useTemplates()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithExercises | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TemplateWithExercises | null>(null)

  const handleCreate = async (
    template: { name: string; notes: string | null },
    exercises: Parameters<typeof api.createTemplate>[1]
  ) => {
    setIsSubmitting(true)
    try {
      await api.createTemplate(template, exercises)
      await refresh()
      setMode('list')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (
    template: { name: string; notes: string | null },
    exercises: Parameters<typeof api.createTemplate>[1]
  ) => {
    if (!editingTemplate) return
    setIsSubmitting(true)
    try {
      await api.updateTemplate(editingTemplate.id, template, exercises)
      await refresh()
      setMode('list')
      setEditingTemplate(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (template: TemplateWithExercises) => {
    setDeleteTarget(template)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteTarget(null)
    await optimisticDelete(deleteTarget.id)
  }

  const handleDuplicate = async (template: TemplateWithExercises) => {
    await optimisticDuplicate(template)
  }

  const handleEdit = (template: TemplateWithExercises) => {
    setEditingTemplate(template)
    setMode('edit')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-300">Loading templates...</div>
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={`Failed to load templates: ${error.message}`} />
  }

  if (mode === 'create') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Template</h1>
        <TemplateForm
          onSubmit={handleCreate}
          onCancel={() => setMode('list')}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  if (mode === 'edit' && editingTemplate) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Template</h1>
        <TemplateForm
          initialData={editingTemplate}
          onSubmit={handleUpdate}
          onCancel={() => {
            setMode('list')
            setEditingTemplate(null)
          }}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workout Templates</h1>
        <button
          onClick={() => setMode('create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          New Template
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Templates are reusable workout plans. Schedule them on specific days in the Schedule tab.
      </p>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">
            No templates yet. Create your first workout template!
          </p>
          <button
            onClick={() => setMode('create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDelete={() => handleDeleteClick(template)}
              onDuplicate={() => handleDuplicate(template)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Template"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
