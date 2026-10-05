import { ServiceError } from '../../types'

export const delay = async (milliseconds = 180, signal?: AbortSignal): Promise<void> => {
  if (signal?.aborted) throw new DOMException('Operation cancelled.', 'AbortError')
  await new Promise<void>((resolve, reject) => {
    let timeout = 0
    const onAbort = () => {
      window.clearTimeout(timeout)
      reject(new DOMException('Operation cancelled.', 'AbortError'))
    }
    timeout = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export const notFound = (resource: string): never => {
  throw new ServiceError({ code: 'NOT_FOUND', message: `${resource} was not found.` })
}

export const id = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
