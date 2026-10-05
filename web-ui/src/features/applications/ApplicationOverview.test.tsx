import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers/AppProviders'
import { AppRoutes } from '../../routes/AppRoutes'
import { services } from '../../services/serviceProvider'

const renderOverview = (applicationId: string) => {
  sessionStorage.setItem('flynow.mock.user-id', 'user-demo')
  return render(
    <MemoryRouter initialEntries={[`/applications/${applicationId}`]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('application overview', () => {
  it.each([
    ['app-dashboard', '0 of 8 requirements completed', 'No source connected'],
    ['app-python-worker', '2 of 8 requirements completed', 'Not configured'],
    ['app-website', '8 of 8 requirements completed', 'Ready to Deploy'],
  ])('summarizes readiness for %s', async (applicationId, progress, detail) => {
    renderOverview(applicationId)
    expect(await screen.findByText(progress, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getAllByText(detail).length).toBeGreaterThan(0)
  })

  it('keeps partial data visible and retries a failed section', async () => {
    const user = userEvent.setup()
    vi.spyOn(services.configuration, 'get').mockRejectedValueOnce(new Error('Temporary error'))
    renderOverview('app-python-worker')
    expect(await screen.findByText('Some overview details could not be loaded')).toBeInTheDocument()
    expect(screen.getByText(/Unavailable: runtime/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('2 of 8 requirements completed')).toBeInTheDocument()
  })
})
