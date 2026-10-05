import type { Services } from '../contracts'
import { ServiceError } from '../../types'

const unavailable = async (): Promise<never> => {
  throw new ServiceError({
    code: 'API_NOT_CONFIGURED',
    message: 'API mode is selected, but the HTTP adapters have not been configured.',
  })
}

export const apiServices: Services = {
  auth: {
    restoreSession: unavailable,
    login: unavailable,
    register: unavailable,
    logout: unavailable,
  },
  user: { getCurrentUser: unavailable, updateProfile: unavailable },
  applications: {
    list: unavailable,
    getById: unavailable,
    create: unavailable,
    update: unavailable,
    remove: unavailable,
  },
  sources: {
    getForApplication: unavailable,
    connectGitHub: unavailable,
    synchronize: unavailable,
    uploadZip: unavailable,
    connectZip: unavailable,
    inspect: unavailable,
    getFileTree: unavailable,
    disconnect: unavailable,
  },
  configuration: { get: unavailable, getDetectedDefaults: unavailable, save: unavailable },
  environment: { list: unavailable, create: unavailable, update: unavailable, remove: unavailable },
  readiness: { check: unavailable, getLatest: unavailable, invalidate: unavailable },
}
