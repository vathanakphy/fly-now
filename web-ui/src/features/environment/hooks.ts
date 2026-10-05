import { useCallback } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { services } from '../../services/serviceProvider'

export const useEnvironmentVariables = (applicationId: string) => {
  const load = useCallback(() => services.environment.list(applicationId), [applicationId])
  return useAsync(load)
}

export const useEnvironmentActions = () => ({
  create: services.environment.create.bind(services.environment),
  update: services.environment.update.bind(services.environment),
  remove: services.environment.remove.bind(services.environment),
})
