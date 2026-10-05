import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers/AppProviders'
import { AppRoutes } from '../../routes/AppRoutes'
import { services } from '../../services/serviceProvider'
import { ServiceError, type ZipProcessingState } from '../../types'

const renderSource = (applicationId = 'app-dashboard') => {
  sessionStorage.setItem('flynow.mock.user-id', 'user-demo')
  return render(
    <MemoryRouter initialEntries={[`/applications/${applicationId}/source`]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
}

const expectServiceCode = async (operation: Promise<unknown>, code: string) => {
  try {
    await operation
    throw new Error(`Expected ${code}`)
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceError)
    expect((error as ServiceError).code).toBe(code)
  }
}

describe('GitHub source', () => {
  it('connects a valid repository and displays inspection metadata', async () => {
    const user = userEvent.setup()
    renderSource()
    await screen.findByRole('heading', { name: 'Source' })
    await user.click(screen.getByRole('button', { name: 'Choose GitHub Repository' }))
    await user.type(screen.getByLabelText('Repository URL'), 'https://github.com/acme/docker-api')
    await user.clear(screen.getByLabelText('Branch'))
    await user.type(screen.getByLabelText('Branch'), 'develop')
    await user.click(screen.getByRole('button', { name: 'Connect repository' }))

    expect(await screen.findByText('acme/docker-api', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Automatic source updates enabled')).toBeInTheDocument()
    expect(await screen.findByText('Source inspection')).toBeInTheDocument()
    expect(screen.getAllByText('Dockerfile').length).toBeGreaterThan(0)
  })

  it('validates the form and surfaces repository and branch failures', async () => {
    const user = userEvent.setup()
    renderSource()
    await screen.findByRole('heading', { name: 'Source' })
    await user.click(screen.getByRole('button', { name: 'Choose GitHub Repository' }))
    await user.clear(screen.getByLabelText('Branch'))
    await user.click(screen.getByRole('button', { name: 'Connect repository' }))
    expect(screen.getByText('Repository URL is required.')).toBeInTheDocument()
    expect(screen.getByText('Branch is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Repository URL'), 'not-a-url')
    await user.type(screen.getByLabelText('Branch'), 'main')
    await user.click(screen.getByRole('button', { name: 'Connect repository' }))
    expect(screen.getByText('Use https://github.com/owner/repository.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Repository URL'))
    await user.type(screen.getByLabelText('Repository URL'), 'https://github.com/acme/inaccessible')
    await user.click(screen.getByRole('button', { name: 'Connect repository' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('repository could not be accessed')

    await user.clear(screen.getByLabelText('Repository URL'))
    await user.type(screen.getByLabelText('Repository URL'), 'https://github.com/acme/api')
    await user.clear(screen.getByLabelText('Branch'))
    await user.type(screen.getByLabelText('Branch'), 'not-found')
    await user.click(screen.getByRole('button', { name: 'Connect repository' }))
    expect(await screen.findByText('Check the branch name and try again.')).toBeInTheDocument()
  })

  it('reports synchronization failure', async () => {
    await services.sources.connectGitHub('app-dashboard', {
      repositoryUrl: 'https://github.com/acme/sync-failure',
      branch: 'main',
    })
    const user = userEvent.setup()
    renderSource()
    await screen.findByText('acme/sync-failure')
    await user.click(screen.getByRole('button', { name: 'Sync Source' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('synchronization failed')
  })
})

describe('ZIP source', () => {
  it('emits every processing state and recognizes supported build files', async () => {
    const states: ZipProcessingState[] = []
    const source = await services.sources.uploadZip(
      'app-dashboard',
      { fileName: 'all-build-files.zip', fileSizeBytes: 1024 },
      { onProgress: (state) => states.push(state) },
    )
    expect(states).toEqual(['UPLOADING', 'PROCESSING', 'EXTRACTING', 'INSPECTING', 'SUCCESS'])
    const inspection = await services.sources.inspect(source.id)
    expect(inspection.detectedBuildFiles).toEqual(
      expect.arrayContaining([
        'package.json',
        'pom.xml',
        'build.gradle',
        'requirements.txt',
        'go.mod',
        'Dockerfile',
      ]),
    )
    expect(inspection.root.every((node) => !node.path.startsWith('/'))).toBe(true)
  })

  it('shows the selecting and successful ZIP states in the workspace', async () => {
    const user = userEvent.setup()
    renderSource()
    await screen.findByRole('heading', { name: 'Source' })
    await user.click(screen.getByRole('button', { name: 'Choose Upload ZIP' }))
    expect(screen.getByText('Selecting a source archive.')).toBeInTheDocument()
    await user.upload(
      screen.getByLabelText('Choose ZIP file'),
      new File(['zip'], 'python-service.zip', { type: 'application/zip' }),
    )
    expect(screen.getByText('Selecting complete. Ready to upload.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Upload and inspect' }))
    expect(
      await screen.findByRole('heading', { name: 'ZIP source' }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('python-service.zip')).toBeInTheDocument()
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0)
  })

  it('rejects invalid type and oversized files', async () => {
    await expectServiceCode(
      services.sources.uploadZip('app-dashboard', { fileName: 'source.tar', fileSizeBytes: 10 }),
      'INVALID_FILE_TYPE',
    )
    await expectServiceCode(
      services.sources.uploadZip('app-dashboard', {
        fileName: 'large.zip',
        fileSizeBytes: 11 * 1024 * 1024,
      }),
      'FILE_TOO_LARGE',
    )
  })

  it('reports corrupted archives and server processing failures', async () => {
    await expectServiceCode(
      services.sources.uploadZip('app-dashboard', { fileName: 'corrupted.zip', fileSizeBytes: 10 }),
      'CORRUPTED_ARCHIVE',
    )
    await expectServiceCode(
      services.sources.uploadZip('app-dashboard', {
        fileName: 'server-error.zip',
        fileSizeBytes: 10,
      }),
      'UPLOAD_SERVER_ERROR',
    )
  })

  it('cancels processing through an abort signal', async () => {
    const controller = new AbortController()
    const operation = services.sources.uploadZip(
      'app-dashboard',
      { fileName: 'cancelled.zip', fileSizeBytes: 10 },
      {
        signal: controller.signal,
        onProgress: (state) => {
          if (state === 'UPLOADING') controller.abort()
        },
      },
    )
    await expect(operation).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('source replacement and removal', () => {
  it('requires confirmation before replacement', async () => {
    const user = userEvent.setup()
    renderSource('app-starter')
    await screen.findByText('example/starter-api')
    await user.click(screen.getByRole('button', { name: 'Change Source' }))
    const dialog = screen.getByRole('dialog', { name: 'Change source?' })
    expect(dialog).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Choose replacement' }))
    expect(await screen.findByText('Choose a replacement source')).toBeInTheDocument()
  })

  it('requires confirmation, removes the source, and invalidates readiness', async () => {
    const user = userEvent.setup()
    renderSource('app-starter')
    await screen.findByText('example/starter-api')
    await user.click(screen.getByRole('button', { name: 'Remove Source' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove source?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove source' }))
    expect(
      await screen.findByRole('button', { name: 'Choose GitHub Repository' }),
    ).toBeInTheDocument()
    expect((await services.applications.getById('app-starter')).lifecycleState).toBe('CONFIGURING')
  })
})

describe('workspace errors', () => {
  it('shows an application not-found state', async () => {
    renderSource('missing-application')
    expect(await screen.findByText('Application not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Applications' })).toBeInTheDocument()
  })
})
