import type { EnvironmentVariable } from '../../types'

export const environmentNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/

export const validateEnvironmentVariable = (
  key: string,
  value: string,
  variables: EnvironmentVariable[],
  editingId?: string,
  keepExistingSecret = false,
): { key?: string; value?: string } => {
  const errors: { key?: string; value?: string } = {}
  const normalized = key.trim().toUpperCase()
  if (!normalized) errors.key = 'Variable name is required.'
  else if (!environmentNamePattern.test(normalized))
    errors.key = 'Start with a letter or underscore; use only letters, digits, and underscores.'
  else if (variables.some((item) => item.id !== editingId && item.key === normalized))
    errors.key = 'Variable names must be unique.'
  if (!value && !keepExistingSecret) errors.value = 'Value is required.'
  return errors
}
