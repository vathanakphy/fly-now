import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageContainer'
import { Alert, Button, Card, Input, Select, Skeleton, useToast } from '../components/ui'
import { useWorkspace } from '../features/applications/workspaceContext'
import { useConfigurationActions, useRuntimeConfiguration } from '../features/configuration/hooks'
import {
  validateRuntimeConfiguration,
  type RuntimeConfigurationErrors,
  type RuntimeConfigurationFormValues,
} from '../features/configuration/validation'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { ServiceError, type RuntimeConfiguration } from '../types'

const toForm = (
  values: Omit<RuntimeConfiguration, 'applicationId' | 'updatedAt'>,
): RuntimeConfigurationFormValues => ({
  internalPort: String(values.internalPort),
  dockerfilePath: values.dockerfilePath,
  buildContext: values.buildContext,
  cpuLimit: values.cpuLimit,
  memoryLimit: values.memoryLimit,
  startCommand: values.startCommand ?? '',
  healthCheckPath: values.healthCheckPath,
  healthCheckIntervalSeconds: String(values.healthCheckIntervalSeconds),
  restartPolicy: values.restartPolicy,
  instanceCount: String(values.instanceCount),
})

const ConfigurationForm = ({ applicationId }: { applicationId: string }) => {
  const { data, status, error, reload } = useRuntimeConfiguration(applicationId)
  if (status === 'loading' || !data) {
    if (error)
      return (
        <Alert title="Configuration could not be loaded" tone="error">
          <p>{error.message}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Try again
          </Button>
        </Alert>
      )
    return <Skeleton className="h-96" />
  }
  return (
    <LoadedConfigurationForm
      applicationId={applicationId}
      configuration={data.configuration}
      detectedDefaults={data.detectedDefaults}
    />
  )
}

const LoadedConfigurationForm = ({
  applicationId,
  configuration,
  detectedDefaults,
}: {
  applicationId: string
  configuration: RuntimeConfiguration | null
  detectedDefaults: Omit<RuntimeConfiguration, 'applicationId' | 'updatedAt'>
}) => {
  const { save } = useConfigurationActions()
  const { reloadWorkspace } = useWorkspace()
  const { showToast } = useToast()
  const [form, setForm] = useState(() => toForm(configuration ?? detectedDefaults))
  const [errors, setErrors] = useState<RuntimeConfigurationErrors>({})
  const [requestError, setRequestError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useUnsavedChanges(dirty)

  const change = (field: keyof RuntimeConfigurationFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setDirty(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    const nextErrors = validateRuntimeConfiguration(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSaving(true)
    setRequestError('')
    try {
      await save(applicationId, {
        internalPort: Number(form.internalPort),
        dockerfilePath: form.dockerfilePath,
        buildContext: form.buildContext,
        cpuLimit: form.cpuLimit as RuntimeConfiguration['cpuLimit'],
        memoryLimit: form.memoryLimit as RuntimeConfiguration['memoryLimit'],
        startCommand: form.startCommand.trim() || undefined,
        healthCheckPath: form.healthCheckPath,
        healthCheckIntervalSeconds: Number(form.healthCheckIntervalSeconds),
        restartPolicy: form.restartPolicy,
        instanceCount: Number(form.instanceCount),
      })
      setDirty(false)
      await reloadWorkspace()
      showToast('Runtime configuration saved.')
    } catch (caught) {
      if (caught instanceof ServiceError && caught.fieldErrors) setErrors(caught.fieldErrors)
      setRequestError(
        caught instanceof Error ? caught.message : 'Configuration could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      {requestError && (
        <div className="mb-5">
          <Alert title="Configuration save failed" tone="error">
            {requestError}
          </Alert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-7" noValidate>
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold sm:col-span-2">Runtime and build</legend>
          <Input
            label="Internal Application Port"
            inputMode="numeric"
            value={form.internalPort}
            error={errors.internalPort}
            onChange={(event) => change('internalPort', event.target.value)}
          />
          <Input
            label="Dockerfile Path"
            value={form.dockerfilePath}
            error={errors.dockerfilePath}
            onChange={(event) => change('dockerfilePath', event.target.value)}
          />
          <Input
            label="Build Context"
            value={form.buildContext}
            error={errors.buildContext}
            onChange={(event) => change('buildContext', event.target.value)}
          />
        </fieldset>
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold sm:col-span-2">Resources</legend>
          <Select
            label="CPU Limit"
            value={form.cpuLimit}
            error={errors.cpuLimit}
            onChange={(event) => change('cpuLimit', event.target.value)}
          >
            <option value="0.25">0.25 CPU</option>
            <option value="0.5">0.5 CPU</option>
            <option value="1">1 CPU</option>
            <option value="2">2 CPU</option>
          </Select>
          <Select
            label="Memory Limit"
            value={form.memoryLimit}
            error={errors.memoryLimit}
            onChange={(event) => change('memoryLimit', event.target.value)}
          >
            <option value="256Mi">256 MiB</option>
            <option value="512Mi">512 MiB</option>
            <option value="1Gi">1 GiB</option>
            <option value="2Gi">2 GiB</option>
          </Select>
        </fieldset>
        <details className="rounded-card border">
          <summary className="cursor-pointer p-4 font-semibold">Advanced Settings</summary>
          <div className="grid gap-5 border-t p-4 sm:grid-cols-2">
            <Input
              label="Start Command"
              hint="Optional"
              value={form.startCommand}
              onChange={(event) => change('startCommand', event.target.value)}
            />
            <Input
              label="Health Check Path"
              value={form.healthCheckPath}
              error={errors.healthCheckPath}
              onChange={(event) => change('healthCheckPath', event.target.value)}
            />
            <Input
              label="Health Check Interval"
              type="number"
              min={1}
              value={form.healthCheckIntervalSeconds}
              error={errors.healthCheckIntervalSeconds}
              onChange={(event) => change('healthCheckIntervalSeconds', event.target.value)}
            />
            <Select
              label="Restart Policy"
              value={form.restartPolicy}
              onChange={(event) => change('restartPolicy', event.target.value)}
            >
              <option value="NEVER">Never</option>
              <option value="ON_FAILURE">On failure</option>
              <option value="ALWAYS">Always</option>
            </Select>
            <Input
              label="Instance Count"
              type="number"
              min={1}
              value={form.instanceCount}
              error={errors.instanceCount}
              onChange={(event) => change('instanceCount', event.target.value)}
            />
          </div>
        </details>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setForm(toForm(detectedDefaults))
              setErrors({})
              setDirty(true)
            }}
          >
            Reset to Detected Values
          </Button>
          <Button
            type="submit"
            loading={saving}
            loadingLabel="Saving configuration"
            disabled={saving || !dirty}
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export const ConfigurationPage = () => {
  const { application, source } = useWorkspace()
  return (
    <div>
      <PageHeader
        title="Runtime Configuration"
        description="Configure how FlyNow builds and runs this application."
      />
      {source ? (
        <ConfigurationForm applicationId={application.id} />
      ) : (
        <Alert title="Connect a source first" tone="warning">
          Runtime defaults are detected from your source.{' '}
          <Link
            className="font-semibold text-primary hover:underline"
            to={`/applications/${application.id}/source`}
          >
            Go to Source
          </Link>
          .
        </Alert>
      )}
    </div>
  )
}
