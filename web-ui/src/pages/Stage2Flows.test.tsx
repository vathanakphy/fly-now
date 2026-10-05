import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../app/providers/AppProviders'
import { AppRoutes } from '../routes/AppRoutes'
import { services } from '../services/serviceProvider'

const renderRoute = (path: string, authenticated = false) => {
  if (authenticated) sessionStorage.setItem('flynow.mock.user-id', 'user-demo')
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('authentication', () => {
  it('validates required login fields and reports invalid credentials', async () => {
    const user = userEvent.setup()
    renderRoute('/login')
    await screen.findByRole('heading', { name: 'Welcome back' })
    await user.clear(screen.getByLabelText('Username'))
    await user.clear(screen.getByLabelText('Password'))
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Username is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Username'), 'unknown')
    await user.type(screen.getByLabelText('Password'), 'incorrect')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('username or password is incorrect')
  })

  it('logs in and returns to the originally requested route', async () => {
    const user = userEvent.setup()
    renderRoute('/applications/app-starter/source')
    await screen.findByRole('heading', { name: 'Welcome back' })
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Source' })).toBeInTheDocument()
  })

  it('validates registration and authenticates a new user', async () => {
    const user = userEvent.setup()
    renderRoute('/register')
    await screen.findByRole('heading', { name: 'Create your account' })
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Username is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'New Developer')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Username'), 'new-developer')
    await user.type(screen.getByLabelText('Password'), 'verysecure123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument()
  })

  it('shows a username conflict returned by the service', async () => {
    const user = userEvent.setup()
    renderRoute('/register')
    await screen.findByRole('heading', { name: 'Create your account' })
    await user.type(screen.getByLabelText('Name'), 'Another Developer')
    await user.type(screen.getByLabelText('Email'), 'another@example.com')
    await user.type(screen.getByLabelText('Username'), 'demo')
    await user.type(screen.getByLabelText('Password'), 'verysecure123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('This username is already taken.')).toBeInTheDocument()
  })

  it('logs out through the authenticated shell', async () => {
    const user = userEvent.setup()
    renderRoute('/applications', true)
    await screen.findByRole('heading', { name: 'Applications' })
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
})

describe('applications dashboard and creation', () => {
  it('shows populated application metadata', async () => {
    renderRoute('/applications', true)
    expect(await screen.findByText('Starter API')).toBeInTheDocument()
    expect(screen.getByText('Customer Dashboard')).toBeInTheDocument()
    expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0)
    expect(screen.getByText('ZIP')).toBeInTheDocument()
    expect(screen.getAllByText('Not connected').length).toBeGreaterThan(0)
    expect(screen.getByText('Node.js API')).toBeInTheDocument()
  })

  it('shows the empty dashboard state', async () => {
    vi.spyOn(services.applications, 'list').mockResolvedValueOnce([])
    renderRoute('/applications', true)
    expect(await screen.findByRole('heading', { name: 'No applications yet' })).toBeInTheDocument()
  })

  it('retries a dashboard service error', async () => {
    const user = userEvent.setup()
    const list = vi.spyOn(services.applications, 'list')
    list.mockRejectedValueOnce(new Error('Temporary mock failure'))
    renderRoute('/applications', true)
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Starter API')).toBeInTheDocument()
  })

  it('creates a draft and continues to source selection', async () => {
    const user = userEvent.setup()
    renderRoute('/applications/new', true)
    await screen.findByRole('heading', { name: 'Create application' })
    await user.type(screen.getByLabelText('Application name'), 'Inventory Service')
    await user.type(screen.getByLabelText('Description'), 'Tracks warehouse inventory.')
    await user.click(screen.getByRole('button', { name: 'Create and continue' }))
    expect(await screen.findByRole('heading', { name: 'Source' })).toBeInTheDocument()
    expect(screen.getByText('Inventory Service was created.')).toBeInTheDocument()
  })
})

describe('account', () => {
  it('edits profile fields through UserService', async () => {
    const user = userEvent.setup()
    renderRoute('/account', true)
    await screen.findByRole('heading', { name: 'Account' })
    const name = await screen.findByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Updated Developer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Account details updated.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '@demo' })).toBeInTheDocument()
  })
})
