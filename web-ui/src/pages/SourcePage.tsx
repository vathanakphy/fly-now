import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { PageHeader } from '../components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  Input,
  Spinner,
  StatusBadge,
  useToast,
} from '../components/ui'
import { useWorkspace } from '../features/applications/workspaceContext'
import { SourceInspectionPanel } from '../features/source/SourceInspectionPanel'
import { useSourceActions } from '../features/source/hooks'
import type { GitHubSource, ZipProcessingState, ZipSource } from '../types'
import { ServiceError } from '../types'
import { cn } from '../utils/cn'

type SourceChoice = 'GITHUB' | 'ZIP'
type Confirmation = 'replace' | 'remove' | null

const SourceSelection = ({
  choice,
  disabled,
  onSelect,
}: {
  choice: SourceChoice | null
  disabled: boolean
  onSelect: (choice: SourceChoice) => void
}) => (
  <div className="grid gap-4 md:grid-cols-2">
    {[
      {
        value: 'GITHUB' as const,
        title: 'GitHub Repository',
        description: 'Connect a repository and choose the branch FlyNow should inspect.',
      },
      {
        value: 'ZIP' as const,
        title: 'Upload ZIP',
        description: 'Upload a ZIP archive containing the application source.',
      },
    ].map(({ value, title, description }) => (
      <Card
        key={value}
        className={cn(
          'p-6 transition hover:border-primary-border hover:shadow-md focus-within:border-primary',
          choice === value && 'border-primary bg-primary-light',
        )}
      >
        <div
          className="flex size-10 items-center justify-center rounded-control bg-primary-light font-bold text-primary"
          aria-hidden="true"
        >
          {value === 'GITHUB' ? 'GH' : 'ZIP'}
        </div>
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <Button
          className="mt-5"
          variant={choice === value ? 'primary' : 'secondary'}
          disabled={disabled}
          onClick={() => onSelect(value)}
        >
          {choice === value ? 'Selected' : `Choose ${title}`}
        </Button>
      </Card>
    ))}
  </div>
)

const GitHubForm = ({
  applicationId,
  busy,
  onBusy,
  onComplete,
  onCancel,
}: {
  applicationId: string
  busy: boolean
  onBusy: (busy: boolean) => void
  onComplete: () => Promise<void>
  onCancel: () => void
}) => {
  const { connectGitHub } = useSourceActions()
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [errors, setErrors] = useState<{ repositoryUrl?: string; branch?: string }>({})
  const [requestError, setRequestError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const nextErrors: typeof errors = {}
    if (!repositoryUrl.trim()) nextErrors.repositoryUrl = 'Repository URL is required.'
    else {
      try {
        const url = new URL(repositoryUrl)
        if (
          url.protocol !== 'https:' ||
          url.hostname !== 'github.com' ||
          url.pathname.split('/').filter(Boolean).length !== 2
        )
          throw new Error()
      } catch {
        nextErrors.repositoryUrl = 'Use https://github.com/owner/repository.'
      }
    }
    if (!branch.trim()) nextErrors.branch = 'Branch is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onBusy(true)
    setRequestError('')
    try {
      await connectGitHub(applicationId, { repositoryUrl, branch })
      await onComplete()
    } catch (caught) {
      if (caught instanceof ServiceError && caught.fieldErrors) setErrors(caught.fieldErrors)
      setRequestError(
        caught instanceof Error ? caught.message : 'The repository could not be connected.',
      )
    } finally {
      onBusy(false)
    }
  }

  return (
    <Card className="mt-5 p-6">
      <h2 className="text-lg font-semibold">Connect GitHub repository</h2>
      {requestError && (
        <div className="mt-4">
          <Alert title="GitHub connection failed" tone="error">
            {requestError}
          </Alert>
        </div>
      )}
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Input
          label="Repository URL"
          placeholder="https://github.com/owner/repository"
          required
          value={repositoryUrl}
          error={errors.repositoryUrl}
          onChange={(event) => {
            setRepositoryUrl(event.target.value)
            setErrors((current) => ({ ...current, repositoryUrl: undefined }))
          }}
        />
        <Input
          label="Branch"
          placeholder="main"
          required
          value={branch}
          error={errors.branch}
          onChange={(event) => {
            setBranch(event.target.value)
            setErrors((current) => ({ ...current, branch: undefined }))
          }}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            Back
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Connecting repository" disabled={busy}>
            {busy ? 'Connecting…' : 'Connect repository'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

const ZipUploader = ({
  applicationId,
  busy,
  onBusy,
  onComplete,
  onCancel,
}: {
  applicationId: string
  busy: boolean
  onBusy: (busy: boolean) => void
  onComplete: () => Promise<void>
  onCancel: () => void
}) => {
  const { uploadZip } = useSourceActions()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<ZipProcessingState>('SELECTING')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  const selectFile = (selected?: File) => {
    setError('')
    setState('SELECTING')
    if (!selected) return setFile(null)
    if (!selected.name.toLowerCase().endsWith('.zip')) {
      setFile(null)
      return setError('Invalid type: select a .zip archive.')
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null)
      return setError('File too large: ZIP archives must be 10 MB or smaller.')
    }
    setFile(selected)
  }

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (!busy) selectFile(event.dataTransfer.files[0])
  }

  const upload = async () => {
    if (!file || busy) return
    controller.current = new AbortController()
    onBusy(true)
    setError('')
    try {
      await uploadZip(
        applicationId,
        { fileName: file.name, fileSizeBytes: file.size, mimeType: file.type },
        { signal: controller.current.signal, onProgress: setState },
      )
      await onComplete()
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError')
        setError('Upload cancelled.')
      else setError(caught instanceof Error ? caught.message : 'The ZIP upload failed.')
      setState('SELECTING')
    } finally {
      onBusy(false)
      controller.current = null
    }
  }

  const active = busy && state !== 'SELECTING' && state !== 'SUCCESS'
  return (
    <Card className="mt-5 p-6">
      <h2 className="text-lg font-semibold">Upload ZIP source</h2>
      <p className="mt-1 text-sm text-muted">
        ZIP files up to 10 MB. Files are inspected without exposing server paths.
      </p>
      {error && (
        <div className="mt-4">
          <Alert title="ZIP upload failed" tone="error">
            {error}
          </Alert>
        </div>
      )}
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
        className={cn(
          'mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition focus-within:border-primary hover:border-primary-border',
          busy && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          aria-label="Choose ZIP file"
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          disabled={busy}
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <span className="font-medium">Drag and drop a ZIP here</span>
        <span className="mt-1 text-sm text-muted">or choose a file</span>
        {file && (
          <span className="mt-3 max-w-full font-mono text-sm break-all text-primary">
            {file.name}
          </span>
        )}
      </label>
      <div aria-live="polite" className="mt-4 min-h-6 text-sm text-muted">
        {active ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" />
            {state.charAt(0) + state.slice(1).toLowerCase()}…
          </span>
        ) : file ? (
          'Selecting complete. Ready to upload.'
        ) : (
          'Selecting a source archive.'
        )}
      </div>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Back
        </Button>
        {busy ? (
          <Button variant="secondary" onClick={() => controller.current?.abort()}>
            Cancel upload
          </Button>
        ) : (
          <Button disabled={!file} onClick={() => void upload()}>
            Upload and inspect
          </Button>
        )}
      </div>
    </Card>
  )
}

const GitHubDetails = ({
  source,
  busy,
  onSync,
  onReplace,
  onRemove,
}: {
  source: GitHubSource
  busy: boolean
  onSync: () => void
  onReplace: () => void
  onRemove: () => void
}) => {
  const repository = source.repositoryUrl.replace('https://github.com/', '')
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">GitHub repository</h2>
          <p className="mt-1 text-sm text-muted">Automatic source updates enabled</p>
        </div>
        <StatusBadge tone="success">Connected</StatusBadge>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Repository</dt>
          <dd className="mt-1 font-medium break-all">{repository}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Branch</dt>
          <dd className="mt-1 font-medium">{source.branch}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Commit</dt>
          <dd className="mt-1 font-mono text-sm">{source.commitSha}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Last synced</dt>
          <dd className="mt-1 text-sm font-medium">
            {new Date(source.lastSyncedAt).toLocaleString()}
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button loading={busy} loadingLabel="Syncing source" disabled={busy} onClick={onSync}>
          {busy ? 'Syncing…' : 'Sync Source'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onReplace}>
          Change Source
        </Button>
        <Button variant="ghost" disabled={busy} className="text-danger" onClick={onRemove}>
          Remove Source
        </Button>
      </div>
    </Card>
  )
}

const ZipDetails = ({
  source,
  busy,
  onReplace,
  onRemove,
}: {
  source: ZipSource
  busy: boolean
  onReplace: () => void
  onRemove: () => void
}) => (
  <Card className="p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">ZIP source</h2>
        <p className="mt-1 text-sm text-muted">Uploaded source archive</p>
      </div>
      <StatusBadge tone="success">Inspected</StatusBadge>
    </div>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-sm text-muted">Filename</dt>
        <dd className="mt-1 font-medium break-all">{source.fileName}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted">Project type</dt>
        <dd className="mt-1 font-medium">{source.projectType}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted">Dockerfile</dt>
        <dd className="mt-1 font-medium">{source.dockerfilePath ?? 'Not detected'}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted">Uploaded</dt>
        <dd className="mt-1 text-sm font-medium">{new Date(source.uploadedAt).toLocaleString()}</dd>
      </div>
    </dl>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button variant="secondary" disabled={busy} onClick={onReplace}>
        Replace Source
      </Button>
      <Button variant="ghost" disabled={busy} className="text-danger" onClick={onRemove}>
        Remove Source
      </Button>
    </div>
  </Card>
)

export const SourcePage = () => {
  const { application, source, reloadWorkspace } = useWorkspace()
  const { synchronize, remove } = useSourceActions()
  const { showToast } = useToast()
  const [choice, setChoice] = useState<SourceChoice | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const selecting = !source || replacing

  const completed = async () => {
    await reloadWorkspace()
    setReplacing(false)
    setChoice(null)
    showToast('Source connected and inspected.')
  }

  const sync = async () => {
    if (!source || source.type !== 'GITHUB' || busy) return
    setBusy(true)
    setActionError('')
    try {
      await synchronize(source.id)
      await reloadWorkspace()
      showToast('Source synchronized.')
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Synchronization failed.')
    } finally {
      setBusy(false)
    }
  }

  const confirmAction = async () => {
    if (confirmation === 'replace') {
      setReplacing(true)
      setChoice(null)
      setConfirmation(null)
      return
    }
    if (confirmation === 'remove') {
      setBusy(true)
      try {
        await remove(application.id)
        await reloadWorkspace()
        setChoice(null)
        showToast('Source removed.')
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : 'Source could not be removed.')
      } finally {
        setBusy(false)
        setConfirmation(null)
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Source"
        description="Connect, inspect, and update the application source."
      />
      {actionError && (
        <div className="mb-5">
          <Alert title="Source action failed" tone="error">
            {actionError}
          </Alert>
        </div>
      )}
      {selecting ? (
        <>
          {replacing && (
            <div className="mb-5">
              <Alert title="Choose a replacement source" tone="warning">
                The current source remains connected until the replacement succeeds.
              </Alert>
            </div>
          )}
          <SourceSelection choice={choice} disabled={busy} onSelect={setChoice} />
          {choice === 'GITHUB' && (
            <GitHubForm
              applicationId={application.id}
              busy={busy}
              onBusy={setBusy}
              onComplete={completed}
              onCancel={() => (replacing ? setReplacing(false) : setChoice(null))}
            />
          )}
          {choice === 'ZIP' && (
            <ZipUploader
              applicationId={application.id}
              busy={busy}
              onBusy={setBusy}
              onComplete={completed}
              onCancel={() => (replacing ? setReplacing(false) : setChoice(null))}
            />
          )}
        </>
      ) : source.type === 'GITHUB' ? (
        <GitHubDetails
          source={source}
          busy={busy}
          onSync={() => void sync()}
          onReplace={() => setConfirmation('replace')}
          onRemove={() => setConfirmation('remove')}
        />
      ) : (
        <ZipDetails
          source={source}
          busy={busy}
          onReplace={() => setConfirmation('replace')}
          onRemove={() => setConfirmation('remove')}
        />
      )}
      {!selecting && source && (
        <div className="mt-5">
          <SourceInspectionPanel sourceId={source.id} />
        </div>
      )}
      <ConfirmationDialog
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void confirmAction()}
        title={confirmation === 'remove' ? 'Remove source?' : 'Change source?'}
        description={
          confirmation === 'remove'
            ? 'Removing this source will return the application to Draft and affect readiness.'
            : 'You will choose and confirm a new source before the current connection is replaced.'
        }
        confirmLabel={confirmation === 'remove' ? 'Remove source' : 'Choose replacement'}
        loading={busy}
      />
    </div>
  )
}
