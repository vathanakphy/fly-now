import { services } from './serviceProvider'

describe('complete mock-data journey', () => {
  it('moves a newly registered user and application from draft to ready', async () => {
    const user = await services.auth.register({
      name: 'Avery Chen',
      email: 'avery.chen@example.test',
      username: 'averychen',
      password: 'fictional-passphrase',
    })
    expect((await services.auth.restoreSession())?.id).toBe(user.id)

    const application = await services.applications.create({
      name: 'Inventory Service',
      description: 'Fictional inventory API used for frontend verification.',
    })
    expect(application.lifecycleState).toBe('DRAFT')

    const source = await services.sources.connectGitHub(application.id, {
      repositoryUrl: 'https://github.com/flynow-examples/docker-inventory-api',
      branch: 'main',
    })
    const inspection = await services.sources.inspect(source.id)
    expect(inspection.dockerfilePath).toBe('Dockerfile')

    const defaults = await services.configuration.getDetectedDefaults(application.id)
    await services.configuration.save(application.id, defaults)
    await services.environment.create(application.id, {
      key: 'API_TOKEN',
      value: 'temporary-secret-for-test',
      target: 'RUNTIME',
      isSecret: true,
    })

    const readiness = await services.readiness.check(application.id)
    expect(readiness.status).toBe('READY')
    expect(readiness.completedCount).toBe(readiness.totalCount)

    const dashboardApplication = (await services.applications.list()).find(
      (item) => item.id === application.id,
    )
    expect(dashboardApplication?.lifecycleState).toBe('READY_TO_DEPLOY')
    expect(sessionStorage.getItem('flynow.mock.safe-state.v4')).not.toContain(
      'temporary-secret-for-test',
    )
  })
})
