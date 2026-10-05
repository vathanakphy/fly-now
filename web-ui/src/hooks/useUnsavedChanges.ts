import { useEffect } from 'react'

export const useUnsavedChanges = (dirty: boolean): void => {
  useEffect(() => {
    if (!dirty) return
    const message = 'You have unsaved changes. Leave this page?'
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = message
    }
    const interceptLinks = (event: MouseEvent) => {
      const target = event.target as Element | null
      const link = target?.closest('a')
      if (!link || link.target === '_blank' || new URL(link.href).origin !== window.location.origin)
        return
      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', interceptLinks, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', interceptLinks, true)
    }
  }, [dirty])
}
