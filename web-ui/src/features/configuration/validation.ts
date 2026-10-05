import type { CpuLimit, MemoryLimit } from '../../types'

export interface RuntimeConfigurationFormValues {
  internalPort: string
  dockerfilePath: string
  buildContext: string
  cpuLimit: CpuLimit | string
  memoryLimit: MemoryLimit | string
  startCommand: string
  healthCheckPath: string
  healthCheckIntervalSeconds: string
  restartPolicy: 'NEVER' | 'ON_FAILURE' | 'ALWAYS'
  instanceCount: string
}

export type RuntimeConfigurationErrors = Partial<
  Record<keyof RuntimeConfigurationFormValues, string>
>

export const isSafeRelativePath = (value: string): boolean =>
  value === '.' ||
  (value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').some((segment) => segment === '..' || segment === ''))

export const validateRuntimeConfiguration = (
  values: RuntimeConfigurationFormValues,
): RuntimeConfigurationErrors => {
  const errors: RuntimeConfigurationErrors = {}
  const port = Number(values.internalPort)
  const interval = Number(values.healthCheckIntervalSeconds)
  const instances = Number(values.instanceCount)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    errors.internalPort = 'Port must be an integer from 1 to 65,535.'
  if (!isSafeRelativePath(values.dockerfilePath))
    errors.dockerfilePath = 'Use a safe relative path.'
  if (!isSafeRelativePath(values.buildContext)) errors.buildContext = 'Use a safe relative path.'
  if (!['0.25', '0.5', '1', '2'].includes(values.cpuLimit))
    errors.cpuLimit = 'Select a supported positive CPU limit.'
  if (!['256Mi', '512Mi', '1Gi', '2Gi'].includes(values.memoryLimit))
    errors.memoryLimit = 'Select a supported positive memory limit.'
  if (!values.healthCheckPath.startsWith('/'))
    errors.healthCheckPath = 'Health check path must begin with /.'
  if (!(interval > 0)) errors.healthCheckIntervalSeconds = 'Health interval must be positive.'
  if (!Number.isInteger(instances) || instances < 1)
    errors.instanceCount = 'Instance count must be a positive integer.'
  return errors
}
