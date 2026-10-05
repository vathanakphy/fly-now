import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, LinkButton, Skeleton, StatusBadge } from '../ui'
import { useWorkspaceData } from '../../features/applications/hooks'
import { PageContainer } from './PageContainer'
import { cn } from '../../utils/cn'

const lifecycleLabel = {
  DRAFT: 'Draft',
  CONFIGURING: 'Configuring',
  READY_TO_DEPLOY: 'Ready to Deploy',
} as const

export const ApplicationWorkspace = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, status, error, reload } = useWorkspaceData(id)

  if (status === 'loading' || status === 'idle') {
    return (
      <PageContainer>
        <Skeleton className="h-52" />
      </PageContainer>
    )
  }
  if (error || !data) {
    const missing = error?.code === 'NOT_FOUND'
    return (
      <PageContainer className="max-w-3xl">
        <Alert title={missing ? 'Application not found' : 'Application unavailable'} tone="error">
          <p>
            {missing
              ? 'This application does not exist or is no longer available.'
              : error?.message}
          </p>
          <div className="mt-3 flex gap-2">
            {!missing && (
              <Button size="sm" variant="secondary" onClick={() => void reload()}>
                Try again
              </Button>
            )}
            <LinkButton to="/applications" size="sm" variant="secondary">
              Back to Applications
            </LinkButton>
          </div>
        </Alert>
      </PageContainer>
    )
  }

  const { application, source } = data
  const tabs = [
    {
      to: `/applications/${id}`,
      label: 'Overview',
      end: true,
      state: application.lifecycleState === 'READY_TO_DEPLOY' ? 'complete' : 'warning',
    },
    { to: `/applications/${id}/source`, label: 'Source', state: source ? 'complete' : 'warning' },
    {
      to: `/applications/${id}/configuration`,
      label: 'Configuration',
      state: application.lifecycleState === 'DRAFT' ? 'warning' : 'complete',
    },
    { to: `/applications/${id}/environment`, label: 'Environment' },
    { to: `/applications/${id}/settings`, label: 'Settings' },
  ]

  return (
    <>
      <div className="border-b bg-surface">
        <PageContainer className="pb-0">
          <Link
            to="/applications"
            className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline"
          >
            ← Back to Applications
          </Link>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{application.name}</h1>
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
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-muted">Source:</dt>
                  <dd className="font-medium">
                    {source?.type === 'GITHUB'
                      ? 'GitHub repository'
                      : source?.type === 'ZIP'
                        ? 'ZIP upload'
                        : 'Not connected'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Last source update:</dt>
                  <dd className="font-medium">
                    {source ? new Date(source.updatedAt).toLocaleString() : '—'}
                  </dd>
                </div>
              </dl>
            </div>
            <Button
              onClick={() =>
                navigate(`/applications/${id}`, { state: { readinessRequest: Date.now() } })
              }
            >
              Check Readiness
            </Button>
          </div>
          <nav aria-label="Application sections" className="mt-5 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-text',
                  )
                }
              >
                {tab.label}
                {tab.state && (
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      tab.state === 'complete' ? 'bg-success' : 'bg-warning',
                    )}
                  >
                    <span className="sr-only">
                      {tab.state === 'complete' ? 'Complete' : 'Needs attention'}
                    </span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </PageContainer>
      </div>
      <PageContainer>
        <Outlet context={{ application, source, reloadWorkspace: reload }} />
      </PageContainer>
    </>
  )
}
