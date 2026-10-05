import type {
  Application,
  EnvironmentTarget,
  EnvironmentVariable,
  ReadinessResult,
  RuntimeConfiguration,
  Source,
  SourceFileNode,
  SourceInspection,
  User,
  ZipProcessingState,
} from '../../types'

export interface AuthCredentials {
  username: string
  password: string
}

export interface RegistrationInput {
  name: string
  email: string
  username: string
  password: string
}

export interface CreateApplicationInput {
  name: string
  description?: string
}

export interface ConnectGitHubInput {
  repositoryUrl: string
  branch: string
}

export interface ConnectZipInput {
  fileName: string
  fileSizeBytes: number
  mimeType?: string
}

export interface SourceOperationOptions {
  signal?: AbortSignal
  onProgress?: (state: ZipProcessingState) => void
}

export interface EnvironmentVariableInput {
  key: string
  value: string
  target: EnvironmentTarget
  isSecret: boolean
}

export interface UpdateEnvironmentVariableInput {
  key: string
  value?: string
  target: EnvironmentTarget
  isSecret: boolean
}

export interface AuthService {
  restoreSession(): Promise<User | null>
  login(credentials: AuthCredentials): Promise<User>
  register(input: RegistrationInput): Promise<User>
  logout(): Promise<void>
}

export interface UserService {
  getCurrentUser(): Promise<User>
  updateProfile(input: Pick<User, 'name' | 'email' | 'username'>): Promise<User>
}

export interface ApplicationService {
  list(): Promise<Application[]>
  getById(id: string): Promise<Application>
  create(input: CreateApplicationInput): Promise<Application>
  update(
    id: string,
    input: Partial<Pick<Application, 'name' | 'description'>>,
  ): Promise<Application>
  remove(id: string): Promise<void>
}

export interface SourceService {
  getForApplication(applicationId: string): Promise<Source | null>
  connectGitHub(
    applicationId: string,
    input: ConnectGitHubInput,
    options?: SourceOperationOptions,
  ): Promise<Source>
  synchronize(sourceId: string, options?: SourceOperationOptions): Promise<Source>
  uploadZip(
    applicationId: string,
    input: ConnectZipInput,
    options?: SourceOperationOptions,
  ): Promise<Source>
  connectZip(
    applicationId: string,
    input: ConnectZipInput,
    options?: SourceOperationOptions,
  ): Promise<Source>
  inspect(sourceId: string, options?: SourceOperationOptions): Promise<SourceInspection>
  getFileTree(sourceId: string, options?: SourceOperationOptions): Promise<SourceFileNode[]>
  disconnect(applicationId: string, options?: SourceOperationOptions): Promise<void>
}

export interface ConfigurationService {
  get(applicationId: string): Promise<RuntimeConfiguration | null>
  getDetectedDefaults(
    applicationId: string,
  ): Promise<Omit<RuntimeConfiguration, 'applicationId' | 'updatedAt'>>
  save(
    applicationId: string,
    input: Omit<RuntimeConfiguration, 'applicationId' | 'updatedAt'>,
  ): Promise<RuntimeConfiguration>
}

export interface EnvironmentService {
  list(applicationId: string): Promise<EnvironmentVariable[]>
  create(applicationId: string, input: EnvironmentVariableInput): Promise<EnvironmentVariable>
  update(
    applicationId: string,
    variableId: string,
    input: UpdateEnvironmentVariableInput,
  ): Promise<EnvironmentVariable>
  remove(applicationId: string, variableId: string): Promise<void>
}

export interface ReadinessService {
  check(applicationId: string): Promise<ReadinessResult>
  getLatest(applicationId: string): Promise<ReadinessResult | null>
  invalidate(applicationId: string, reason: string): Promise<void>
}

export interface Services {
  auth: AuthService
  user: UserService
  applications: ApplicationService
  sources: SourceService
  configuration: ConfigurationService
  environment: EnvironmentService
  readiness: ReadinessService
}
