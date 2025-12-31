import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorMessage } from './ErrorMessage'

describe('ErrorMessage', () => {
  it('renders the message', () => {
    render(<ErrorMessage message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('has error styling', () => {
    render(<ErrorMessage message="Error" />)
    const element = screen.getByText('Error')
    expect(element).toHaveClass('bg-red-50', 'border-red-200', 'text-red-700')
  })
})
