import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../app/providers/AppProviders'
import { AppRoutes } from './AppRoutes'

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

describe('application routes', () => {
  it.each([
    ['/applications', 'Applications'],
    ['/applications/new', 'Create application'],
    ['/applications/app-starter', 'Overview'],
    ['/applications/app-starter/source', 'Source'],
    ['/applications/app-starter/configuration', 'Runtime Configuration'],
    ['/applications/app-starter/environment', 'Environment Variables'],
    ['/applications/app-starter/settings', 'Application Settings'],
    ['/account', 'Account'],
  ])('renders %s without crashing', async (path, heading) => {
    renderRoute(path, true)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('returns a protected visitor to the requested route after login', async () => {
    renderRoute('/applications/app-starter/source')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('demo')).toBeInTheDocument()
  })
})

describe('public routes', () => {
  it.each([
    ['/', 'Deploy without the complexity.'],
    ['/login', 'Welcome back'],
    ['/register', 'Create your account'],
    ['/missing', 'Page not found'],
  ])('renders %s', async (path, heading) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })
})
