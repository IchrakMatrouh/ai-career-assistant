import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Portfolio settings form', () => {
  it('shows validation errors for missing name and invalid email', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows a validation message for an invalid email format', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/name/i), 'Alex Carter')
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument()
  })

  it('blocks excessively long bio input and shows a length error', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/name/i), 'Alex Carter')
    await user.type(screen.getByLabelText(/email/i), 'alex@example.com')
    fireEvent.change(screen.getByLabelText(/bio/i), {
      target: { value: 'a'.repeat(401) }
    })
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/bio must be 400 characters or fewer/i)).toBeInTheDocument()
  })

  it('submits successfully and shows a success message for valid input', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/name/i), 'Alex Carter')
    await user.type(screen.getByLabelText(/email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/bio/i), 'Frontend engineer building thoughtful products.')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument()
  })
})
