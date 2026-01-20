import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorMessage } from './ErrorMessage'

describe('ErrorMessage', () => {
  it('renders the message', () => {
    render(<ErrorMessage message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('has error styling via CSS variables', () => {
    render(<ErrorMessage message="Error" />)
    // The message is now inside a span within the container
    const element = screen.getByText('Error').closest('div')
    expect(element).toBeInTheDocument()
    // Check inline styles are applied (CSS variable based styling)
    expect(element).toHaveStyle({ background: 'var(--color-danger-muted)' })
  })
})
