import { useCallback } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { services } from '../../services/serviceProvider'

export const useSourceInspection = (sourceId: string) => {
  const load = useCallback(() => services.sources.inspect(sourceId), [sourceId])
  return useAsync(load)
}

export const useSourceActions = () => ({
  connectGitHub: services.sources.connectGitHub.bind(services.sources),
  synchronize: services.sources.synchronize.bind(services.sources),
  uploadZip: services.sources.uploadZip.bind(services.sources),
  remove: services.sources.disconnect.bind(services.sources),
})
