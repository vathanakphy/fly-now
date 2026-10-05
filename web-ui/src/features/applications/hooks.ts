import { useCallback } from 'react'
import { services } from '../../services/serviceProvider'
import { useAsync } from '../../hooks/useAsync'
import type { Application, SourceType } from '../../types'

export interface ApplicationSummary {
  application: Application
  sourceType: SourceType | null
}

export const useApplications = () => {
  const load = useCallback(async (): Promise<ApplicationSummary[]> => {
    const applications = await services.applications.list()
    return Promise.all(
      applications.map(async (application) => ({
        application,
        sourceType: (await services.sources.getForApplication(application.id))?.type ?? null,
      })),
    )
  }, [])
  return useAsync(load)
}

export const useApplication = (id: string) => {
  const load = useCallback(() => services.applications.getById(id), [id])
  return useAsync(load)
}

export const useWorkspaceData = (id: string) => {
  const load = useCallback(async () => {
    const application = await services.applications.getById(id)
    const source = await services.sources.getForApplication(id)
    return { application, source }
  }, [id])
  return useAsync(load)
}

export const useCreateApplication = () =>
  useCallback(
    (input: Parameters<typeof services.applications.create>[0]) =>
      services.applications.create(input),
    [],
  )

export const useApplicationSettingsActions = () => ({
  update: services.applications.update.bind(services.applications),
  remove: services.applications.remove.bind(services.applications),
})

export const useApplicationOverview = (applicationId: string) => {
  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      services.sources.getForApplication(applicationId),
      services.configuration.get(applicationId),
      services.environment.list(applicationId),
    ] as const)
    const [source, configuration, environment] = results
    return {
      source: source.status === 'fulfilled' ? source.value : null,
      configuration: configuration.status === 'fulfilled' ? configuration.value : null,
      environment: environment.status === 'fulfilled' ? environment.value : null,
      errors: results
        .map((result, index) =>
          result.status === 'rejected' ? ['source', 'runtime', 'environment'][index] : null,
        )
        .filter((value): value is string => value !== null),
    }
  }, [applicationId])
  return useAsync(load)
}
