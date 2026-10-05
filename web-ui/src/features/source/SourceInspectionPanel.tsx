import type { SourceFileNode } from '../../types'
import { Alert, Button, Card, Skeleton, StatusBadge } from '../../components/ui'
import { useSourceInspection } from './hooks'

const FileNode = ({ node }: { node: SourceFileNode }) => {
  if (node.kind === 'directory') {
    return (
      <li className="min-w-0">
        <details open>
          <summary className="min-h-9 cursor-pointer py-2 font-mono text-sm font-medium break-all">
            📁 {node.name}
          </summary>
          {node.children && node.children.length > 0 && (
            <ul className="ml-3 border-l pl-3">
              {node.children.map((child) => (
                <FileNode key={child.path} node={child} />
              ))}
            </ul>
          )}
        </details>
      </li>
    )
  }
  return (
    <li className="min-h-9 py-2 font-mono text-sm break-all" title={node.path}>
      📄 {node.name}
    </li>
  )
}

export const SourceInspectionPanel = ({ sourceId }: { sourceId: string }) => {
  const { data, status, error, reload } = useSourceInspection(sourceId)
  if (status === 'loading') return <Skeleton className="h-64" />
  if (error || !data)
    return (
      <Alert title="Source inspection unavailable" tone="error">
        <p>{error?.message}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
          Try again
        </Button>
      </Alert>
    )
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Source inspection</h2>
          <p className="mt-1 text-sm text-muted">Read-only results from the latest source.</p>
        </div>
        <StatusBadge tone="info">{data.detectedProjectType}</StatusBadge>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Detected build files</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {data.detectedBuildFiles.map((file) => (
              <code key={file} className="rounded bg-page px-2 py-1 text-xs">
                {file}
              </code>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Dockerfile</dt>
          <dd className="mt-1 text-sm font-medium">{data.dockerfilePath ?? 'Not detected'}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <h3 className="text-sm font-semibold">Files</h3>
        <ul className="mt-2 max-w-full overflow-hidden rounded-control border bg-page p-3">
          {data.root.map((node) => (
            <FileNode key={node.path} node={node} />
          ))}
        </ul>
      </div>
    </Card>
  )
}
