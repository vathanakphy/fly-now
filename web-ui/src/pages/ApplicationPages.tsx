import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageContainer, PageHeader } from '../components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  Skeleton,
  StatusBadge,
  Textarea,
  useToast,
} from '../components/ui'
import {
  useApplicationOverview,
  useApplications,
  useCreateApplication,
} from '../features/applications/hooks'
import { useWorkspace } from '../features/applications/workspaceContext'
import { useReadiness } from '../features/readiness/hooks'
import type { Application } from '../types'

const lifecycleLabel: Record<Application['lifecycleState'], string> = {
  DRAFT: 'Draft',
  CONFIGURING: 'Configuring',
  READY_TO_DEPLOY: 'Ready to deploy',
}

export const ApplicationsPage = () => {
  const { data, status, error, reload } = useApplications()
  return (
    <PageContainer>
      <PageHeader
        title="Applications"
        description="Manage applications prepared with FlyNow."
        action={<LinkButton to="/applications/new">New application</LinkButton>}
      />
      {error && (
        <Alert title="Applications could not be loaded" tone="error">
          <p>{error.message}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void reload()}>
            Try again
          </Button>
        </Alert>
      )}
      {status === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((value) => (
            <Skeleton key={value} className="h-40" />
          ))}
        </div>
      )}
      {data?.length === 0 && (
        <EmptyState
          title="No applications yet"
          description="Create an application to begin the readiness workflow."
          action={<LinkButton to="/applications/new">Create application</LinkButton>}
        />
      )}
      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map(({ application, sourceType }) => (
            <Card key={application.id} className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-control bg-primary-light font-bold text-primary"
                  aria-hidden="true"
                >
                  {application.name.charAt(0)}
                </div>
                <StatusBadge
                  tone={
                    application.lifecycleState === 'READY_TO_DEPLOY'
                      ? 'success'
                      : application.lifecycleState === 'CONFIGURING'
                        ? 'info'
                        : 'neutral'
                  }
                >
                  {lifecycleLabel[application.lifecycleState]}
                </StatusBadge>
              </div>
              <h2 className="mt-5 font-semibold">{application.name}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted">Source</dt>
                <dd className="text-right font-medium">
                  {sourceType === 'GITHUB'
                    ? 'GitHub'
                    : sourceType === 'ZIP'
                      ? 'ZIP'
                      : 'Not connected'}
                </dd>
                <dt className="text-muted">Project type</dt>
                <dd className="text-right font-medium">{application.projectType}</dd>
                <dt className="text-muted">Last updated</dt>
                <dd className="text-right font-medium">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                    new Date(application.updatedAt),
                  )}
                </dd>
              </dl>
              <div className="mt-auto pt-5">
                <LinkButton
                  to={`/applications/${application.id}`}
                  variant="secondary"
                  className="w-full"
                >
                  Open
                </LinkButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  )
}

export const NewApplicationPage = () => {
  const navigate = useNavigate()
  const createApplication = useCreateApplication()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    if (!name.trim()) return setNameError('Application name is required.')
    if (name.trim().length > 100)
      return setNameError('Application name must be 100 characters or fewer.')
    setLoading(true)
    setRequestError('')
    try {
      const application = await createApplication({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      showToast(`${application.name} was created.`)
      navigate(`/applications/${application.id}/source`)
    } catch (caught) {
      setRequestError(caught instanceof Error ? caught.message : 'Unable to create application.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title="Create application"
        description="Name your application. You will add its source next."
      />
      <Card className="p-6">
        {requestError && (
          <div className="mb-5">
            <Alert title="Application could not be created" tone="error">
              {requestError}
            </Alert>
          </div>
        )}
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Input
            label="Application name"
            placeholder="My application"
            value={name}
            maxLength={100}
            required
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
            }}
            error={nameError}
            autoFocus
          />
          <Textarea
            label="Description"
            hint="Optional"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/applications')}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              loadingLabel="Creating application"
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create and continue'}
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  )
}

export const ReadinessPage = () => {
  const { application, reloadWorkspace } = useWorkspace()
  const location = useLocation()
  const request = (location.state as { readinessRequest?: number } | null)?.readinessRequest
  const { data, status, reload } = useApplicationOverview(application.id)
  const { result, checking, error, checkAgain } = useReadiness(application.id, request)
  if (status === 'loading' || !data)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  const next = result?.results.find((check) => check.required && check.status !== 'complete')
  const runCheck = async () => {
    const checked = await checkAgain()
    if (checked) await reloadWorkspace()
  }
  return (
    <div>
      <PageHeader
        title="Overview"
        description="See what remains before this application is ready."
      />
      {data.errors.length > 0 && (
        <div className="mb-5">
          <Alert title="Some overview details could not be loaded" tone="warning">
            <p>Unavailable: {data.errors.join(', ')}.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
              Try again
            </Button>
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Alert title="Readiness check could not complete" tone="error">
            {error}
          </Alert>
        </div>
      )}
      {result?.invalidatedAt && (
        <div className="mb-5">
          <Alert title="Readiness needs to be checked again" tone="warning">
            {result.invalidationReason}
          </Alert>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Deployment Readiness</h2>
              <p className="mt-1 text-sm text-muted">
                {result
                  ? `${result.completedCount} of ${result.totalCount} requirements completed`
                  : 'No completed validation yet'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone={result?.status === 'READY' ? 'success' : 'warning'}>
                {result?.status === 'READY' ? 'Ready to Deploy' : 'Action required'}
              </StatusBadge>
              <Button
                size="sm"
                variant="secondary"
                loading={checking}
                loadingLabel="Checking readiness"
                disabled={checking}
                onClick={() => void runCheck()}
              >
                {checking ? 'Checking…' : 'Check Again'}
              </Button>
            </div>
          </div>
          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Deployment readiness"
            aria-valuemin={0}
            aria-valuemax={result?.totalCount ?? 1}
            aria-valuenow={result?.completedCount ?? 0}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${result ? (result.completedCount / result.totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <ul className="mt-5 space-y-3">
            {result?.results.map((check) => (
              <li
                key={check.group}
                className="flex items-center justify-between gap-3 rounded-control border p-3"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={
                      check.status === 'complete'
                        ? 'text-success'
                        : check.status === 'error'
                          ? 'text-danger'
                          : 'text-warning'
                    }
                    aria-hidden="true"
                  >
                    {check.status === 'complete' ? '✓' : check.status === 'error' ? '×' : '!'}
                  </span>
                  <span>
                    <span className="block font-medium">{check.title}</span>
                    <span className="block text-sm text-muted">{check.explanation}</span>
                  </span>
                </span>
                {check.targetRoute && (
                  <Link
                    to={check.targetRoute}
                    className="shrink-0 text-sm font-semibold text-primary"
                  >
                    {check.actionLabel}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {checking && result && (
            <p className="mt-4 text-sm text-muted" role="status">
              Checking again… Existing results remain visible.
            </p>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Next action</h2>
          <p className="mt-2 text-sm text-muted">
            {next
              ? next.explanation
              : result?.status === 'READY'
                ? 'All required validation has passed.'
                : 'Run readiness validation to see required actions.'}
          </p>
          {next && (
            <LinkButton to={next.targetRoute ?? `/applications/${application.id}`} className="mt-5">
              {next.actionLabel ?? 'Fix Issue'}
            </LinkButton>
          )}
        </Card>
        {result?.status === 'READY' && !result.invalidatedAt && (
          <Card className="border-green-200 bg-success-light p-6 text-center lg:col-span-3">
            <div
              className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-2xl text-white"
              aria-hidden="true"
            >
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-bold">Ready to Deploy</h2>
            <div className="mt-3">
              <StatusBadge tone="success">READY TO DEPLOY</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <span className="block text-muted">Source</span>
                <span className="font-medium">
                  {data.source?.type === 'GITHUB' ? 'GitHub' : 'ZIP'}
                </span>
              </div>
              <div>
                <span className="block text-muted">Runtime</span>
                <span className="font-medium">Port {data.configuration?.internalPort}</span>
              </div>
              <div>
                <span className="block text-muted">Environment</span>
                <span className="font-medium">{data.environment?.length ?? 0} variables</span>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted">
              Deployment will be available in the next stage.
            </p>
          </Card>
        )}
        <Card className="p-5">
          <h2 className="font-semibold">Source</h2>
          <p className="mt-2 text-sm text-muted">
            {data.source?.type === 'GITHUB'
              ? `${data.source.repositoryUrl} · ${data.source.branch}`
              : data.source?.type === 'ZIP'
                ? data.source.fileName
                : 'No source connected'}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Runtime</h2>
          <p className="mt-2 text-sm text-muted">
            {data.configuration
              ? `Port ${data.configuration.internalPort} · ${data.configuration.cpuLimit} CPU · ${data.configuration.memoryLimit}`
              : 'Not configured'}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Environment</h2>
          <p className="mt-2 text-sm text-muted">
            {data.environment
              ? `${data.environment.length} variable${data.environment.length === 1 ? '' : 's'}`
              : 'Unavailable'}
          </p>
        </Card>
      </div>
    </div>
  )
}
