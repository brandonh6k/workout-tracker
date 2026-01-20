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
      <div className="flex items-center justify-center py-16">
        <div 
          className="text-center"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          <div 
            className="w-8 h-8 mx-auto mb-3 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-graphite)', borderTopColor: 'transparent' }}
          />
          Loading templates...
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={`Failed to load templates: ${error.message}`} />
  }

  if (mode === 'create') {
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="flex items-center gap-4">
          <button
            onClick={() => setMode('list')}
            className="p-2 hover:bg-[var(--color-steel)] rounded transition-colors"
            style={{ color: 'var(--color-slate)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 
            className="text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            NEW TEMPLATE
          </h1>
        </header>
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
      <div className="space-y-6 animate-fade-in">
        <header className="flex items-center gap-4">
          <button
            onClick={() => {
              setMode('list')
              setEditingTemplate(null)
            }}
            className="p-2 hover:bg-[var(--color-steel)] rounded transition-colors"
            style={{ color: 'var(--color-slate)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 
            className="text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            EDIT TEMPLATE
          </h1>
        </header>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            TEMPLATES
          </h1>
          <p 
            className="text-sm mt-1"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Reusable workout blueprints
          </p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div 
          className="card text-center py-12"
          style={{ borderStyle: 'dashed', borderColor: 'var(--color-graphite)' }}
        >
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-steel)' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-zinc)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p 
            className="mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)', fontSize: '1.1rem' }}
          >
            NO TEMPLATES YET
          </p>
          <p 
            className="text-sm mb-6"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Create your first workout blueprint
          </p>
          <button
            onClick={() => setMode('create')}
            className="btn btn-primary"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 stagger-children">
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
