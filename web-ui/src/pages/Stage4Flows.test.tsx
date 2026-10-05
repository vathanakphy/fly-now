import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../app/providers/AppProviders'
import { AppRoutes } from '../routes/AppRoutes'
import { services } from '../services/serviceProvider'
import { ServiceError } from '../types'

const renderRoute = (path: string) => {
  sessionStorage.setItem('flynow.mock.user-id', 'user-demo')
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('runtime configuration', () => {
  it('warns before leaving with unsaved changes', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderRoute('/applications/app-starter/configuration')
    await screen.findByRole('heading', { name: 'Runtime Configuration' })
    const port = await screen.findByLabelText('Internal Application Port')
    await user.clear(port)
    await user.type(port, '3001')
    const navigation = screen.getByRole('navigation', { name: 'Application sections' })
    await user.click(within(navigation).getByRole('link', { name: /Source/ }))
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Runtime Configuration' })).toBeInTheDocument()

    confirm.mockReturnValue(true)
    await user.click(within(navigation).getByRole('link', { name: /Source/ }))
    expect(await screen.findByRole('heading', { name: 'Source' })).toBeInTheDocument()
  })

  it('links directly to Source when none exists', async () => {
    renderRoute('/applications/app-dashboard/configuration')
    expect(await screen.findByText('Connect a source first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Source' })).toHaveAttribute(
      'href',
      '/applications/app-dashboard/source',
    )
  })
})

describe('environment variables', () => {
  it('masks secrets, never persists plaintext, keeps existing secret values, and confirms deletion', async () => {
    const user = userEvent.setup()
    renderRoute('/applications/app-starter/environment')
    await screen.findByRole('heading', { name: 'Environment Variables' })
    await screen.findByRole('heading', { name: 'No environment variables' })
    await user.click(screen.getAllByRole('button', { name: 'Add variable' })[0]!)
    await user.type(screen.getByLabelText('Variable Name'), 'API_TOKEN')
    await user.type(screen.getByLabelText('Value'), 'super-secret-value')
    await user.click(screen.getByRole('checkbox', { name: /Mark as Secret/ }))
    expect(screen.getByLabelText('Variable Name')).toHaveValue('API_TOKEN')
    expect(screen.getByLabelText('Value')).toHaveValue('super-secret-value')
    expect(screen.getByRole('checkbox', { name: /Mark as Secret/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findAllByText('API_TOKEN')).not.toHaveLength(0)
    expect(await screen.findAllByText('••••••••')).not.toHaveLength(0)
    expect(screen.queryByText('super-secret-value')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('flynow.mock.safe-state.v4')).not.toContain('super-secret-value')

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    expect(screen.getByLabelText('Value')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findAllByText('••••••••')).not.toHaveLength(0)

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Delete environment variable?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete variable' }))
    expect(
      await screen.findByRole('heading', { name: 'No environment variables' }),
    ).toBeInTheDocument()
  })
})

describe('readiness lifecycle', () => {
  it('moves from draft to configuring to ready and invalidates on later changes', async () => {
    let application = await services.applications.getById('app-dashboard')
    expect(application.lifecycleState).toBe('DRAFT')
    const draftResult = await services.readiness.check(application.id)
    expect(draftResult.status).toBe('NOT_READY')
    expect(draftResult.results.some((result) => result.status === 'error')).toBe(true)

    const source = await services.sources.connectGitHub(application.id, {
      repositoryUrl: 'https://github.com/acme/docker-dashboard',
      branch: 'main',
    })
    application = await services.applications.getById(application.id)
    expect(application.lifecycleState).toBe('CONFIGURING')
    const defaults = await services.configuration.getDetectedDefaults(application.id)
    await services.configuration.save(application.id, defaults)
    const ready = await services.readiness.check(application.id)
    expect(ready.status).toBe('READY')
    expect(
      ready.results.find((result) => result.group === 'ENVIRONMENT_CONFIGURATION')?.status,
    ).toBe('warning')
    expect((await services.applications.getById(application.id)).lifecycleState).toBe(
      'READY_TO_DEPLOY',
    )

    await services.configuration.save(application.id, { ...defaults, internalPort: 9090 })
    expect((await services.applications.getById(application.id)).lifecycleState).toBe('CONFIGURING')
    expect((await services.readiness.getLatest(application.id))?.invalidationReason).toContain(
      'configuration changed',
    )

    await services.readiness.check(application.id)
    await services.sources.synchronize(source.id)
    expect((await services.applications.getById(application.id)).lifecycleState).toBe('CONFIGURING')
    expect((await services.readiness.getLatest(application.id))?.invalidationReason).toContain(
      'Source version changed',
    )
  })

  it('distinguishes readiness service failure from configuration errors', async () => {
    await expect(services.readiness.check('app-validation-failure')).rejects.toMatchObject({
      code: 'READINESS_SERVICE_UNAVAILABLE',
    } satisfies Partial<ServiceError>)
  })

  it('renders the final ready state without a deploy action', async () => {
    renderRoute('/applications/app-website')
    expect(
      await screen.findByRole('heading', { name: 'Ready to Deploy' }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Deployment will be available in the next stage.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Deploy$/ })).not.toBeInTheDocument()
  })
})

describe('application settings', () => {
  it('requires the application name and deletes all application data', async () => {
    const user = userEvent.setup()
    renderRoute('/applications/app-dashboard/settings')
    await screen.findByRole('heading', { name: 'Application Settings' })
    await user.click(screen.getByRole('button', { name: 'Delete application' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete application?' })
    const confirmButton = within(dialog).getByRole('button', { name: 'Delete application' })
    expect(confirmButton).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Application name'), 'Customer Dashboard')
    const enabledConfirmButton = within(dialog).getByRole('button', { name: 'Delete application' })
    expect(enabledConfirmButton).toBeEnabled()
    await user.click(enabledConfirmButton)
    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument()
    expect(screen.getByText('Customer Dashboard was deleted.')).toBeInTheDocument()
    await expect(services.applications.getById('app-dashboard')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
