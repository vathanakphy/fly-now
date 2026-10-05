import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('communicates loading and disables interaction', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
