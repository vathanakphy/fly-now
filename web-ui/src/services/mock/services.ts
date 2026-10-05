import type {
  ApplicationService,
  AuthService,
  ConfigurationService,
  EnvironmentService,
  ReadinessService,
  Services,
  SourceService,
  UserService,
} from '../contracts'
import type {
  Application,
  ProjectType,
  ReadinessCheckResult,
  RuntimeConfiguration,
  Source,
  SourceFileNode,
  SourceInspection,
  User,
} from '../../types'
import { ServiceError } from '../../types'
import { delay, id, notFound } from './helpers'
import { mockStore } from './store'

const SESSION_KEY = 'flynow.mock.user-id'

const currentUser = (): User => {
  const userId = sessionStorage.getItem(SESSION_KEY)
  const user = mockStore.data.users.find((candidate) => candidate.id === userId)
  if (!user) throw new ServiceError({ code: 'UNAUTHENTICATED', message: 'Please sign in.' })
  return user
}

const invalidateReadiness = (applicationId: string, reason: string): void => {
  const previous = mockStore.data.readinessResults.find(
    (result) => result.applicationId === applicationId,
  )
  if (previous) {
    previous.status = 'NOT_READY'
    previous.invalidatedAt = new Date().toISOString()
    previous.invalidationReason = reason
  }
  const application = mockStore.data.applications.find(({ id }) => id === applicationId)
  if (!application) return
  const hasMeaningfulSetup =
    mockStore.data.sources.some((source) => source.applicationId === applicationId) ||
    mockStore.data.configurations.some(
      (configuration) => configuration.applicationId === applicationId,
    ) ||
    mockStore.data.environmentVariables.some((variable) => variable.applicationId === applicationId)
  application.lifecycleState = hasMeaningfulSetup ? 'CONFIGURING' : 'DRAFT'
  application.updatedAt = new Date().toISOString()
}

const auth: AuthService = {
  async restoreSession() {
    await delay(250)
    const userId = sessionStorage.getItem(SESSION_KEY)
    return mockStore.data.users.find((user) => user.id === userId) ?? null
  },
  async login({ username, password }) {
    await delay()
    const user = mockStore.data.users.find(
      (candidate) => candidate.username === username.trim().toLowerCase(),
    )
    if (!user || password !== 'password') {
      throw new ServiceError({
        code: 'INVALID_CREDENTIALS',
        message: 'The username or password is incorrect.',
      })
    }
    sessionStorage.setItem(SESSION_KEY, user.id)
    return user
  },
  async register(input) {
    await delay()
    const email = input.email.trim().toLowerCase()
    const username = input.username.trim().toLowerCase()
    const emailInUse = mockStore.data.users.some((user) => user.email === email)
    const usernameInUse = mockStore.data.users.some((user) => user.username === username)
    if (emailInUse || usernameInUse) {
      throw new ServiceError({
        code: 'REGISTRATION_CONFLICT',
        message: 'An account already uses the supplied details.',
        fieldErrors: {
          ...(emailInUse ? { email: 'This email is already registered.' } : {}),
          ...(usernameInUse ? { username: 'This username is already taken.' } : {}),
        },
      })
    }
    const user: User = {
      id: id('user'),
      name: input.name.trim(),
      email,
      username,
      createdAt: new Date().toISOString(),
    }
    mockStore.data.users.push(user)
    mockStore.persist()
    sessionStorage.setItem(SESSION_KEY, user.id)
    return user
  },
  async logout() {
    await delay(100)
    sessionStorage.removeItem(SESSION_KEY)
  },
}

const user: UserService = {
  async getCurrentUser() {
    await delay()
    return currentUser()
  },
  async updateProfile(input) {
    await delay()
    const existing = currentUser()
    const email = input.email.trim().toLowerCase()
    const username = input.username.trim().toLowerCase()
    const conflict = mockStore.data.users.find(
      (candidate) =>
        candidate.id !== existing.id &&
        (candidate.email === email || candidate.username === username),
    )
    if (conflict) {
      throw new ServiceError({
        code: 'PROFILE_CONFLICT',
        message: 'That email or username is already in use.',
        fieldErrors: {
          ...(conflict.email === email ? { email: 'This email is already registered.' } : {}),
          ...(conflict.username === username
            ? { username: 'This username is already taken.' }
            : {}),
        },
      })
    }
    existing.name = input.name.trim()
    existing.email = email
    existing.username = username
    mockStore.persist()
    return structuredClone(existing)
  },
}

const applications: ApplicationService = {
  async list() {
    await delay()
    return structuredClone(mockStore.data.applications)
  },
  async getById(applicationId) {
    await delay()
    const application = mockStore.data.applications.find(({ id: value }) => value === applicationId)
    return application ? structuredClone(application) : notFound('Application')
  },
  async create(input) {
    await delay()
    const now = new Date().toISOString()
    const application: Application = {
      id: id('app'),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      slug: input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      lifecycleState: 'DRAFT',
      projectType: 'Not detected',
      createdAt: now,
      updatedAt: now,
    }
    mockStore.data.applications.unshift(application)
    mockStore.persist()
    return structuredClone(application)
  },
  async update(applicationId, input) {
    await delay()
    const application = mockStore.data.applications.find(({ id: value }) => value === applicationId)
    if (!application) return notFound('Application')
    if (input.name) application.name = input.name.trim()
    if (input.description !== undefined) application.description = input.description.trim()
    application.updatedAt = new Date().toISOString()
    mockStore.persist()
    return structuredClone(application)
  },
  async remove(applicationId) {
    await delay()
    const index = mockStore.data.applications.findIndex(({ id: value }) => value === applicationId)
    if (index < 0) return notFound('Application')
    mockStore.data.applications.splice(index, 1)
    mockStore.data.sources = mockStore.data.sources.filter(
      (source) => source.applicationId !== applicationId,
    )
    mockStore.data.configurations = mockStore.data.configurations.filter(
      (configuration) => configuration.applicationId !== applicationId,
    )
    mockStore.data.environmentVariables = mockStore.data.environmentVariables.filter(
      (variable) => variable.applicationId !== applicationId,
    )
    mockStore.data.readinessResults = mockStore.data.readinessResults.filter(
      (result) => result.applicationId !== applicationId,
    )
    mockStore.persist()
  },
}

const githubPattern = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i

const detectProject = (name: string): { projectType: ProjectType; buildFiles: string[] } => {
  const value = name.toLowerCase()
  if (value.includes('spring') || value.includes('maven'))
    return { projectType: 'Spring Boot', buildFiles: ['pom.xml'] }
  if (value.includes('gradle')) return { projectType: 'Gradle JVM', buildFiles: ['build.gradle'] }
  if (value.includes('python')) return { projectType: 'Python', buildFiles: ['requirements.txt'] }
  if (value.includes('golang') || value.includes('go-service'))
    return { projectType: 'Go', buildFiles: ['go.mod'] }
  if (value.includes('all-build-files'))
    return {
      projectType: 'Node.js API',
      buildFiles: ['package.json', 'pom.xml', 'build.gradle', 'requirements.txt', 'go.mod'],
    }
  return {
    projectType: value.includes('website') ? 'Static Site' : 'Node.js API',
    buildFiles: ['package.json'],
  }
}

const sourceInspection = (source: Source): SourceInspection => {
  const detected = detectProject(source.type === 'GITHUB' ? source.repositoryUrl : source.fileName)
  const hasDockerfile =
    source.type === 'ZIP' ? source.dockerfilePath !== null : source.repositoryUrl.includes('docker')
  const files: SourceFileNode[] = [
    ...detected.buildFiles.map((name) => ({ name, path: name, kind: 'file' as const })),
    ...(hasDockerfile ? [{ name: 'Dockerfile', path: 'Dockerfile', kind: 'file' as const }] : []),
    {
      name: 'src',
      path: 'src',
      kind: 'directory' as const,
      children: [{ name: 'main', path: 'src/main', kind: 'directory' as const, children: [] }],
    },
  ]
  return {
    sourceId: source.id,
    detectedProjectType: detected.projectType,
    detectedRuntime:
      detected.projectType === 'Python'
        ? 'Python 3.13'
        : detected.projectType === 'Go'
          ? 'Go 1.25'
          : detected.projectType === 'Spring Boot' || detected.projectType === 'Gradle JVM'
            ? 'Java 21'
            : 'Node.js 22',
    packageManager: detected.buildFiles.includes('package.json') ? 'npm' : undefined,
    detectedBuildFiles: [...detected.buildFiles, ...(hasDockerfile ? ['Dockerfile'] : [])],
    dockerfilePath: hasDockerfile ? 'Dockerfile' : null,
    root: files,
    inspectedAt: new Date().toISOString(),
  }
}

const saveSource = (source: Source): Source => {
  mockStore.data.sources = mockStore.data.sources.filter(
    (item) => item.applicationId !== source.applicationId,
  )
  mockStore.data.sources.push(source)
  const application = mockStore.data.applications.find(({ id }) => id === source.applicationId)
  if (application) {
    application.sourceId = source.id
    application.lifecycleState = 'CONFIGURING'
    application.projectType = sourceInspection(source).detectedProjectType
    application.updatedAt = source.updatedAt
  }
  invalidateReadiness(source.applicationId, 'Source changed. Run readiness checks again.')
  mockStore.persist()
  return structuredClone(source)
}

const sources: SourceService = {
  async getForApplication(applicationId) {
    await delay()
    return structuredClone(
      mockStore.data.sources.find((source) => source.applicationId === applicationId) ?? null,
    )
  },
  async connectGitHub(applicationId, input, options) {
    await applications.getById(applicationId)
    await delay(180, options?.signal)
    const repositoryUrl = input.repositoryUrl.trim().replace(/\/$/, '')
    if (!githubPattern.test(repositoryUrl)) {
      throw new ServiceError({
        code: 'INVALID_REPOSITORY_URL',
        message: 'Enter a valid GitHub repository URL.',
        fieldErrors: { repositoryUrl: 'Use https://github.com/owner/repository.' },
      })
    }
    if (repositoryUrl.toLowerCase().includes('inaccessible')) {
      throw new ServiceError({
        code: 'REPOSITORY_INACCESSIBLE',
        message: 'The repository could not be accessed.',
      })
    }
    if (!input.branch.trim()) {
      throw new ServiceError({
        code: 'BRANCH_REQUIRED',
        message: 'A repository branch is required.',
        fieldErrors: { branch: 'Branch is required.' },
      })
    }
    if (input.branch.trim().toLowerCase().includes('not-found')) {
      throw new ServiceError({
        code: 'BRANCH_NOT_FOUND',
        message: 'The requested branch was not found.',
        fieldErrors: { branch: 'Check the branch name and try again.' },
      })
    }
    const now = new Date().toISOString()
    const source: Source = {
      id: id('source'),
      applicationId,
      type: 'GITHUB' as const,
      repositoryUrl,
      branch: input.branch.trim(),
      commitSha: Math.random().toString(16).slice(2, 9).padEnd(7, '0'),
      lastSyncedAt: now,
      automaticUpdates: true,
      connectedAt: now,
      updatedAt: now,
    }
    return saveSource(source)
  },
  async synchronize(sourceId, options) {
    await delay(240, options?.signal)
    const source = mockStore.data.sources.find(({ id }) => id === sourceId)
    if (!source || source.type !== 'GITHUB') return notFound('GitHub source')
    if (source.repositoryUrl.includes('sync-failure')) {
      throw new ServiceError({ code: 'SYNC_FAILED', message: 'Repository synchronization failed.' })
    }
    const now = new Date().toISOString()
    source.commitSha = Math.random().toString(16).slice(2, 9).padEnd(7, '0')
    source.lastSyncedAt = now
    source.updatedAt = now
    invalidateReadiness(source.applicationId, 'Source version changed. Run readiness checks again.')
    mockStore.persist()
    return structuredClone(source)
  },
  async uploadZip(applicationId, input, options) {
    await applications.getById(applicationId)
    if (!input.fileName.toLowerCase().endsWith('.zip')) {
      throw new ServiceError({ code: 'INVALID_FILE_TYPE', message: 'Select a ZIP archive.' })
    }
    if (input.fileSizeBytes > 10 * 1024 * 1024) {
      throw new ServiceError({
        code: 'FILE_TOO_LARGE',
        message: 'ZIP archives must be 10 MB or smaller.',
      })
    }
    for (const state of ['UPLOADING', 'PROCESSING', 'EXTRACTING', 'INSPECTING'] as const) {
      options?.onProgress?.(state)
      await delay(90, options?.signal)
      if (state === 'PROCESSING' && input.fileName.toLowerCase().includes('server-error')) {
        throw new ServiceError({
          code: 'UPLOAD_SERVER_ERROR',
          message: 'The ZIP could not be processed.',
        })
      }
      if (state === 'EXTRACTING' && input.fileName.toLowerCase().includes('corrupted')) {
        throw new ServiceError({
          code: 'CORRUPTED_ARCHIVE',
          message: 'The ZIP archive is corrupted.',
        })
      }
    }
    const now = new Date().toISOString()
    const detected = detectProject(input.fileName)
    const source: Source = {
      id: id('source'),
      applicationId,
      type: 'ZIP' as const,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      projectType: detected.projectType,
      dockerfilePath: input.fileName.toLowerCase().includes('no-docker') ? null : 'Dockerfile',
      uploadedAt: now,
      connectedAt: now,
      updatedAt: now,
    }
    options?.onProgress?.('SUCCESS')
    return saveSource(source)
  },
  async connectZip(applicationId, input, options) {
    return sources.uploadZip(applicationId, input, options)
  },
  async inspect(sourceId, options) {
    await delay(180, options?.signal)
    const source = mockStore.data.sources.find(({ id: value }) => value === sourceId)
    if (!source) return notFound('Source')
    return sourceInspection(source)
  },
  async getFileTree(sourceId, options) {
    return (await sources.inspect(sourceId, options)).root
  },
  async disconnect(applicationId, options) {
    await delay(120, options?.signal)
    mockStore.data.sources = mockStore.data.sources.filter(
      (source) => source.applicationId !== applicationId,
    )
    const application = mockStore.data.applications.find(({ id }) => id === applicationId)
    if (application) {
      delete application.sourceId
      application.projectType = 'Not detected'
    }
    invalidateReadiness(
      applicationId,
      'Source removed. Connect a source and check readiness again.',
    )
    mockStore.persist()
  },
}

const configuration: ConfigurationService = {
  async get(applicationId) {
    await delay()
    return structuredClone(
      mockStore.data.configurations.find((item) => item.applicationId === applicationId) ?? null,
    )
  },
  async getDetectedDefaults(applicationId) {
    await applications.getById(applicationId)
    const source = mockStore.data.sources.find((item) => item.applicationId === applicationId)
    if (!source) {
      throw new ServiceError({
        code: 'SOURCE_REQUIRED',
        message: 'Connect a source before configuring the runtime.',
      })
    }
    const inspection = sourceInspection(source)
    return {
      internalPort: inspection.detectedProjectType === 'Static Site' ? 80 : 8080,
      dockerfilePath: inspection.dockerfilePath ?? 'Dockerfile',
      buildContext: '.',
      cpuLimit: '0.5' as const,
      memoryLimit: '512Mi' as const,
      startCommand: '',
      healthCheckPath: '/',
      healthCheckIntervalSeconds: 30,
      restartPolicy: 'ON_FAILURE' as const,
      instanceCount: 1,
    }
  },
  async save(applicationId, input) {
    await applications.getById(applicationId)
    const safePath = (value: string) =>
      value === '.' ||
      (!value.startsWith('/') &&
        !value.includes('\\') &&
        !value.split('/').some((segment) => segment === '..' || segment === ''))
    const fieldErrors: Record<string, string> = {}
    if (
      !Number.isInteger(input.internalPort) ||
      input.internalPort < 1 ||
      input.internalPort > 65535
    )
      fieldErrors.internalPort = 'Port must be an integer from 1 to 65,535.'
    if (!safePath(input.dockerfilePath)) fieldErrors.dockerfilePath = 'Use a safe relative path.'
    if (!safePath(input.buildContext)) fieldErrors.buildContext = 'Use a safe relative path.'
    if (!['0.25', '0.5', '1', '2'].includes(input.cpuLimit))
      fieldErrors.cpuLimit = 'Select a supported positive CPU limit.'
    if (!['256Mi', '512Mi', '1Gi', '2Gi'].includes(input.memoryLimit))
      fieldErrors.memoryLimit = 'Select a supported positive memory limit.'
    if (!input.healthCheckPath.startsWith('/'))
      fieldErrors.healthCheckPath = 'Health check path must begin with /.'
    if (!(input.healthCheckIntervalSeconds > 0))
      fieldErrors.healthCheckIntervalSeconds = 'Health interval must be positive.'
    if (!Number.isInteger(input.instanceCount) || input.instanceCount < 1)
      fieldErrors.instanceCount = 'Instance count must be a positive integer.'
    if (Object.keys(fieldErrors).length > 0) {
      throw new ServiceError({
        code: 'INVALID_CONFIGURATION',
        message: 'Correct the configuration fields.',
        fieldErrors,
      })
    }
    const configuration: RuntimeConfiguration = {
      ...input,
      applicationId,
      updatedAt: new Date().toISOString(),
    }
    mockStore.data.configurations = mockStore.data.configurations.filter(
      (item) => item.applicationId !== applicationId,
    )
    mockStore.data.configurations.push(configuration)
    invalidateReadiness(applicationId, 'Runtime configuration changed. Check readiness again.')
    mockStore.persist()
    return structuredClone(configuration)
  },
}

const environment: EnvironmentService = {
  async list(applicationId) {
    await delay()
    return structuredClone(
      mockStore.data.environmentVariables.filter((item) => item.applicationId === applicationId),
    )
  },
  async create(applicationId, input) {
    await applications.getById(applicationId)
    const key = input.key.trim().toUpperCase()
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key) || !input.value) {
      throw new ServiceError({
        code: 'INVALID_ENVIRONMENT_VARIABLE',
        message: 'Correct the environment variable fields.',
        fieldErrors: {
          ...(!/^[A-Z_][A-Z0-9_]*$/.test(key)
            ? { key: 'Use letters, digits, and underscores; start with a letter or underscore.' }
            : {}),
          ...(!input.value ? { value: 'Value is required.' } : {}),
        },
      })
    }
    if (
      mockStore.data.environmentVariables.some(
        (item) => item.applicationId === applicationId && item.key === key,
      )
    ) {
      throw new ServiceError({
        code: 'DUPLICATE_ENVIRONMENT_VARIABLE',
        message: 'An environment variable with this name already exists.',
        fieldErrors: { key: 'Variable names must be unique.' },
      })
    }
    const now = new Date().toISOString()
    const variable = {
      id: id('env'),
      applicationId,
      key,
      target: input.target,
      isSecret: input.isSecret,
      displayValue: input.isSecret ? '••••••••' : input.value,
      createdAt: now,
      updatedAt: now,
    }
    mockStore.data.environmentVariables.push(variable)
    invalidateReadiness(applicationId, 'Environment variables changed. Check readiness again.')
    mockStore.persist()
    return structuredClone(variable)
  },
  async update(applicationId, variableId, input) {
    await delay()
    const variable = mockStore.data.environmentVariables.find(
      (item) => item.applicationId === applicationId && item.id === variableId,
    )
    if (!variable) return notFound('Environment variable')
    const key = input.key.trim().toUpperCase()
    const fieldErrors: Record<string, string> = {}
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key))
      fieldErrors.key = 'Use letters, digits, and underscores; start with a letter or underscore.'
    if (
      mockStore.data.environmentVariables.some(
        (item) =>
          item.applicationId === applicationId && item.id !== variableId && item.key === key,
      )
    )
      fieldErrors.key = 'Variable names must be unique.'
    const keepsExistingSecret = variable.isSecret && input.isSecret && input.value === undefined
    if (!input.value && !keepsExistingSecret) fieldErrors.value = 'Value is required.'
    if (Object.keys(fieldErrors).length > 0)
      throw new ServiceError({
        code: 'INVALID_ENVIRONMENT_VARIABLE',
        message: 'Correct the environment variable fields.',
        fieldErrors,
      })
    variable.key = key
    variable.target = input.target
    variable.isSecret = input.isSecret
    if (input.isSecret) variable.displayValue = '••••••••'
    else if (input.value !== undefined) variable.displayValue = input.value
    variable.updatedAt = new Date().toISOString()
    invalidateReadiness(applicationId, 'Environment variables changed. Check readiness again.')
    mockStore.persist()
    return structuredClone(variable)
  },
  async remove(applicationId, variableId) {
    await delay()
    mockStore.data.environmentVariables = mockStore.data.environmentVariables.filter(
      (item) => !(item.applicationId === applicationId && item.id === variableId),
    )
    invalidateReadiness(applicationId, 'Environment variables changed. Check readiness again.')
    mockStore.persist()
  },
}

const readiness: ReadinessService = {
  async check(applicationId) {
    await applications.getById(applicationId)
    await delay(300)
    if (applicationId === 'app-validation-failure') {
      throw new ServiceError({
        code: 'READINESS_SERVICE_UNAVAILABLE',
        message:
          'The readiness service is temporarily unavailable. Your configuration was not changed.',
      })
    }
    const application = mockStore.data.applications.find(({ id }) => id === applicationId)
    if (!application) return notFound('Application')
    const source = mockStore.data.sources.find((item) => item.applicationId === applicationId)
    const runtime = mockStore.data.configurations.find(
      (item) => item.applicationId === applicationId,
    )
    const variables = mockStore.data.environmentVariables.filter(
      (item) => item.applicationId === applicationId,
    )
    const route = (section: string) => `/applications/${applicationId}/${section}`
    const result = (
      group: ReadinessCheckResult['group'],
      status: ReadinessCheckResult['status'],
      title: string,
      explanation: string,
      targetRoute: string | undefined,
      actionLabel: ReadinessCheckResult['actionLabel'],
      required = true,
    ): ReadinessCheckResult => ({
      group,
      status,
      title,
      explanation,
      required,
      targetRoute,
      actionLabel,
    })
    const checks: ReadinessCheckResult[] = [
      result(
        'SOURCE',
        source ? 'complete' : 'error',
        source ? 'Source connected' : 'Source required',
        source ? 'The application source is available.' : 'Connect GitHub or upload a ZIP archive.',
        source ? route('source') : route('source'),
        source ? 'Review' : 'Fix Issue',
      ),
      result(
        'SOURCE_VERSION',
        source ? 'complete' : 'unchecked',
        source ? 'Source version recorded' : 'Source version unchecked',
        source
          ? `Source updated ${new Date(source.updatedAt).toLocaleString()}.`
          : 'A source version can be checked after connecting source.',
        route('source'),
        'Review',
      ),
      result(
        'DOCKERFILE',
        runtime?.dockerfilePath ? 'complete' : 'error',
        runtime?.dockerfilePath ? 'Dockerfile configured' : 'Dockerfile required',
        runtime?.dockerfilePath
          ? `Using ${runtime.dockerfilePath}.`
          : 'Set a safe relative Dockerfile path.',
        route('configuration'),
        runtime ? 'Review' : 'Configure',
      ),
      result(
        'BUILD_CONFIGURATION',
        runtime?.buildContext ? 'complete' : 'error',
        runtime?.buildContext ? 'Build context configured' : 'Build configuration required',
        runtime?.buildContext
          ? `Build context is ${runtime.buildContext}.`
          : 'Configure the Docker build context.',
        route('configuration'),
        runtime ? 'Review' : 'Configure',
      ),
      result(
        'RUNTIME_CONFIGURATION',
        runtime ? 'complete' : 'error',
        runtime ? 'Runtime configured' : 'Runtime configuration required',
        runtime
          ? `${runtime.instanceCount} instance${runtime.instanceCount === 1 ? '' : 's'} configured.`
          : 'Save runtime settings for this application.',
        route('configuration'),
        runtime ? 'Review' : 'Configure',
      ),
      result(
        'PORT',
        runtime && runtime.internalPort >= 1 && runtime.internalPort <= 65535
          ? 'complete'
          : 'error',
        runtime ? 'Application port checked' : 'Port unchecked',
        runtime
          ? `Internal port ${runtime.internalPort} is valid.`
          : 'Configure an internal application port.',
        route('configuration'),
        runtime ? 'Review' : 'Configure',
      ),
      result(
        'RESOURCES',
        runtime ? 'complete' : 'error',
        runtime ? 'Resources configured' : 'Resources required',
        runtime
          ? `${runtime.cpuLimit} CPU and ${runtime.memoryLimit} memory.`
          : 'Choose CPU and memory limits.',
        route('configuration'),
        runtime ? 'Review' : 'Configure',
      ),
      result(
        'HEALTH_CONFIGURATION',
        runtime?.healthCheckPath.startsWith('/') ? 'complete' : 'error',
        runtime ? 'Health check configured' : 'Health configuration required',
        runtime
          ? `${runtime.healthCheckPath} every ${runtime.healthCheckIntervalSeconds} seconds.`
          : 'Configure a health check path and interval.',
        route('configuration'),
        runtime ? 'Review' : 'Configure',
      ),
      result(
        'ENVIRONMENT_CONFIGURATION',
        variables.length > 0 ? 'complete' : 'warning',
        variables.length > 0 ? 'Environment reviewed' : 'No environment variables',
        variables.length > 0
          ? `${variables.length} environment variable${variables.length === 1 ? '' : 's'} configured.`
          : 'No variables are configured. Continue if the application does not require any.',
        route('environment'),
        'Review',
        false,
      ),
    ]
    const requiredChecks = checks.filter((check) => check.required)
    const completedCount = requiredChecks.filter((check) => check.status === 'complete').length
    const status =
      completedCount === requiredChecks.length ? ('READY' as const) : ('NOT_READY' as const)
    const hasMeaningfulSetup = Boolean(source || runtime || variables.length)
    application.lifecycleState =
      status === 'READY' ? 'READY_TO_DEPLOY' : hasMeaningfulSetup ? 'CONFIGURING' : 'DRAFT'
    application.updatedAt = new Date().toISOString()
    const readinessResult = {
      applicationId,
      status,
      results: checks,
      completedCount,
      totalCount: requiredChecks.length,
      checkedAt: new Date().toISOString(),
    }
    mockStore.data.readinessResults = mockStore.data.readinessResults.filter(
      (item) => item.applicationId !== applicationId,
    )
    mockStore.data.readinessResults.push(readinessResult)
    mockStore.persist()
    return structuredClone(readinessResult)
  },
  async getLatest(applicationId) {
    await delay(100)
    return structuredClone(
      mockStore.data.readinessResults.find((result) => result.applicationId === applicationId) ??
        null,
    )
  },
  async invalidate(applicationId, reason) {
    await delay(60)
    invalidateReadiness(applicationId, reason)
    mockStore.persist()
  },
}

export const mockServices: Services = {
  auth,
  user,
  applications,
  sources,
  configuration,
  environment,
  readiness,
}
