import type { EnvironmentVariable } from '../../types'
import { validateEnvironmentVariable } from './validation'

const existing: EnvironmentVariable[] = [
  {
    id: 'env-1',
    applicationId: 'app-1',
    key: 'API_URL',
    target: 'BOTH',
    isSecret: false,
    displayValue: 'https://example.test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('environment variable validation', () => {
  it.each(['', '1INVALID', 'HAS-DASH', 'HAS SPACE'])('rejects invalid name %j', (key) => {
    expect(validateEnvironmentVariable(key, 'value', existing).key).toBeDefined()
  })

  it('requires a value when creating and rejects duplicate names', () => {
    expect(validateEnvironmentVariable('NEW_VALUE', '', existing).value).toBeDefined()
    expect(validateEnvironmentVariable('api_url', 'value', existing).key).toContain('unique')
  })

  it('allows an existing secret to keep its saved value', () => {
    expect(validateEnvironmentVariable('SECRET', '', existing, 'env-secret', true)).toEqual({})
  })

  it('requires a replacement value when an existing secret is made non-secret', () => {
    expect(validateEnvironmentVariable('SECRET', '', existing, 'env-secret', false).value).toBe(
      'Value is required.',
    )
  })
})
