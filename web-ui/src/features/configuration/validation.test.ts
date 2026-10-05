import { validateRuntimeConfiguration, type RuntimeConfigurationFormValues } from './validation'

const valid: RuntimeConfigurationFormValues = {
  internalPort: '8080',
  dockerfilePath: 'deploy/Dockerfile',
  buildContext: '.',
  cpuLimit: '0.5',
  memoryLimit: '512Mi',
  startCommand: '',
  healthCheckPath: '/health',
  healthCheckIntervalSeconds: '30',
  restartPolicy: 'ON_FAILURE',
  instanceCount: '1',
}

describe('runtime configuration validation', () => {
  it('accepts valid values and an optional start command', () => {
    expect(validateRuntimeConfiguration(valid)).toEqual({})
  })

  it.each([
    ['internalPort', '0'],
    ['internalPort', '65536'],
    ['internalPort', '1.5'],
    ['dockerfilePath', '/Dockerfile'],
    ['dockerfilePath', '../Dockerfile'],
    ['buildContext', '../source'],
    ['cpuLimit', '0'],
    ['memoryLimit', '-1Gi'],
    ['healthCheckPath', 'health'],
    ['healthCheckIntervalSeconds', '0'],
    ['instanceCount', '0'],
    ['instanceCount', '1.5'],
  ] satisfies Array<[keyof RuntimeConfigurationFormValues, string]>)(
    'rejects invalid %s value %s',
    (field, value) => {
      expect(validateRuntimeConfiguration({ ...valid, [field]: value })[field]).toBeDefined()
    },
  )
})
