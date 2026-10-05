export type ApplicationLifecycleState = 'DRAFT' | 'CONFIGURING' | 'READY_TO_DEPLOY'
export type SourceType = 'GITHUB' | 'ZIP'
export type EnvironmentTarget = 'BUILD' | 'RUNTIME' | 'BOTH'
export type ReadinessStatus = 'NOT_READY' | 'READY'
export type ReadinessCheckStatus = 'complete' | 'error' | 'warning' | 'checking' | 'unchecked'
export type ReadinessGroup =
  | 'SOURCE'
  | 'SOURCE_VERSION'
  | 'DOCKERFILE'
  | 'BUILD_CONFIGURATION'
  | 'RUNTIME_CONFIGURATION'
  | 'PORT'
  | 'RESOURCES'
  | 'HEALTH_CONFIGURATION'
  | 'ENVIRONMENT_CONFIGURATION'
export type CpuLimit = '0.25' | '0.5' | '1' | '2'
export type MemoryLimit = '256Mi' | '512Mi' | '1Gi' | '2Gi'
export type RestartPolicy = 'NEVER' | 'ON_FAILURE' | 'ALWAYS'
export type ProjectType =
  | 'Node.js API'
  | 'React SPA'
  | 'Static Site'
  | 'Spring Boot'
  | 'Gradle JVM'
  | 'Python'
  | 'Go'
  | 'Not detected'
export type ZipProcessingState =
  'SELECTING' | 'UPLOADING' | 'PROCESSING' | 'EXTRACTING' | 'INSPECTING' | 'SUCCESS'

export interface User {
  id: string
  name: string
  email: string
  username: string
  createdAt: string
}

export interface Application {
  id: string
  name: string
  slug: string
  description?: string
  projectType: ProjectType
  lifecycleState: ApplicationLifecycleState
  sourceId?: string
  createdAt: string
  updatedAt: string
}

interface SourceBase {
  id: string
  applicationId: string
  type: SourceType
  connectedAt: string
  updatedAt: string
}

export interface GitHubSource extends SourceBase {
  type: 'GITHUB'
  repositoryUrl: string
  branch: string
  commitSha: string
  lastSyncedAt: string
  automaticUpdates: boolean
}

export interface ZipSource extends SourceBase {
  type: 'ZIP'
  fileName: string
  fileSizeBytes: number
  projectType: ProjectType
  dockerfilePath: string | null
  uploadedAt: string
}

export type Source = GitHubSource | ZipSource

export interface SourceFileNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  children?: SourceFileNode[]
}

export interface SourceInspection {
  sourceId: string
  detectedProjectType: ProjectType
  detectedRuntime?: string
  packageManager?: string
  detectedBuildFiles: string[]
  dockerfilePath: string | null
  root: SourceFileNode[]
  inspectedAt: string
}

export interface RuntimeConfiguration {
  applicationId: string
  internalPort: number
  dockerfilePath: string
  buildContext: string
  cpuLimit: CpuLimit
  memoryLimit: MemoryLimit
  startCommand?: string
  healthCheckPath: string
  healthCheckIntervalSeconds: number
  restartPolicy: RestartPolicy
  instanceCount: number
  updatedAt: string
}

export interface EnvironmentVariable {
  id: string
  applicationId: string
  key: string
  target: EnvironmentTarget
  isSecret: boolean
  displayValue: string
  createdAt: string
  updatedAt: string
}

export interface ReadinessIssue {
  id: string
  severity: 'ERROR' | 'WARNING'
  title: string
  description: string
  route: string
}

export interface ReadinessResult {
  applicationId: string
  status: ReadinessStatus
  checkedAt: string
  results: ReadinessCheckResult[]
  completedCount: number
  totalCount: number
  invalidatedAt?: string
  invalidationReason?: string
}

export interface ReadinessCheckResult {
  group: ReadinessGroup
  status: ReadinessCheckStatus
  title: string
  explanation: string
  required: boolean
  targetRoute?: string
  actionLabel?: 'Configure' | 'Review' | 'Fix Issue'
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: ServiceError | null
}

export interface ServiceErrorResponse {
  code: string
  message: string
  fieldErrors?: Record<string, string>
}

export class ServiceError extends Error {
  readonly code: string
  readonly fieldErrors?: Record<string, string>

  constructor(response: ServiceErrorResponse) {
    super(response.message)
    this.name = 'ServiceError'
    this.code = response.code
    this.fieldErrors = response.fieldErrors
  }
}
