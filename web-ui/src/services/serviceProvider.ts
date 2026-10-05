import type { Services } from './contracts'
import { apiServices } from './api/services'
import { mockServices } from './mock/services'

export type DataSource = 'mock' | 'api'

const dataSource = (import.meta.env.VITE_DATA_SOURCE ?? 'mock') as DataSource

if (dataSource !== 'mock' && dataSource !== 'api') {
  throw new Error(`Unsupported VITE_DATA_SOURCE: ${dataSource}`)
}

export const services: Services = dataSource === 'api' ? apiServices : mockServices
