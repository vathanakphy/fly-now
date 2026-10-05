import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '../types'
import { ServiceError } from '../types'

const normalizeError = (error: unknown) =>
  error instanceof ServiceError
    ? error
    : new ServiceError({ code: 'UNKNOWN', message: 'Something went wrong.' })

export const useAsync = <T>(operation: () => Promise<T>) => {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null })

  const execute = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await operation()
      setState({ status: 'success', data, error: null })
      return data
    } catch (error) {
      setState({ status: 'error', data: null, error: normalizeError(error) })
      return null
    }
  }, [operation])

  useEffect(() => {
    let active = true
    operation()
      .then((data) => {
        if (active) setState({ status: 'success', data, error: null })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', data: null, error: normalizeError(error) })
      })
    return () => {
      active = false
    }
  }, [operation])

  return { ...state, reload: execute }
}
