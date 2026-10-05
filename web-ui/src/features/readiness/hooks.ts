import { useCallback, useEffect, useState } from 'react'
import { services } from '../../services/serviceProvider'
import type { ReadinessResult } from '../../types'

export const useReadiness = (applicationId: string, refreshToken?: number) => {
  const [result, setResult] = useState<ReadinessResult | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const request = refreshToken
      ? services.readiness.check(applicationId)
      : services.readiness
          .getLatest(applicationId)
          .then((latest) => (latest ? latest : services.readiness.check(applicationId)))
    request
      .then((latest) => {
        if (!active) return
        setResult(latest)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Readiness check failed.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [applicationId, refreshToken])

  const checkAgain = useCallback(async () => {
    if (checking) return null
    setChecking(true)
    setError('')
    try {
      const checked = await services.readiness.check(applicationId)
      setResult(checked)
      return checked
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Readiness check failed.')
      return null
    } finally {
      setChecking(false)
    }
  }, [applicationId, checking])

  return { result, checking, error, checkAgain }
}
