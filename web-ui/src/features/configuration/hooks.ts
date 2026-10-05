import { useCallback } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { services } from '../../services/serviceProvider'

export const useRuntimeConfiguration = (applicationId: string) => {
  const load = useCallback(async () => {
    const [configuration, detectedDefaults] = await Promise.all([
      services.configuration.get(applicationId),
      services.configuration.getDetectedDefaults(applicationId),
    ])
    return { configuration, detectedDefaults }
  }, [applicationId])
  return useAsync(load)
}

export const useConfigurationActions = () => ({
  save: services.configuration.save.bind(services.configuration),
})
