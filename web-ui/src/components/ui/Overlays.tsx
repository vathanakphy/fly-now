import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../../utils/cn'
import { Button, IconButton } from './Button'

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export const Modal = ({ open, onClose, title, description, children, footer }: ModalProps) => {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    triggerRef.current = document.activeElement as HTMLElement
    panelRef.current?.querySelector<HTMLElement>(focusable)?.focus()
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [open])

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusable))
    const first = items[0]
    const last = items.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        className="absolute inset-0 bg-slate-950/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={trapFocus}
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-card bg-surface shadow-dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            ×
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t p-5 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={
      <>
        <Button variant="secondary" disabled={loading} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          loading={loading}
          loadingLabel={`${confirmLabel} in progress`}
          disabled={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-muted">This action cannot be undone.</p>
  </Modal>
)

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

export const Tabs = ({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) => {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id)
  const selected = items.find((item) => item.id === active)
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`${item.id}-panel`}
            onClick={() => setActive(item.id)}
            className={cn(
              'min-h-11 border-b-2 px-4 text-sm font-medium',
              active === item.id ? 'border-primary text-primary' : 'border-transparent text-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {selected && (
        <div id={`${selected.id}-panel`} role="tabpanel" className="py-4">
          {selected.content}
        </div>
      )}
    </div>
  )
}

export const Dropdown = ({ label, children }: { label: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setOpen(false)
    triggerRef.current?.focus()
  }
  return (
    <div ref={rootRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      <Button
        ref={triggerRef}
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label} <span aria-hidden="true">⌄</span>
      </Button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 z-20 mt-2 min-w-44 rounded-card border bg-surface p-1 shadow-dialog"
        >
          {children}
        </div>
      )}
    </div>
  )
}

export const Tooltip = ({ label, children }: { label: string; children: ReactNode }) => {
  const id = useId()
  return (
    <span className="group relative inline-flex" aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-text px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  )
}

interface ToastItem {
  id: string
  message: string
  tone: 'success' | 'error'
}
interface ToastContextValue {
  showToast: (message: string, tone?: ToastItem['tone']) => void
}
const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const showToast = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((items) => [...items, { id, message, tone }])
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-4 bottom-4 left-4 z-60 space-y-2 sm:left-auto sm:max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'rounded-control border bg-surface px-4 py-3 text-sm shadow-dialog',
              toast.tone === 'error'
                ? 'border-red-200 text-danger'
                : 'border-green-200 text-success',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const Toast = ({
  message,
  tone = 'success',
}: {
  message: string
  tone?: ToastItem['tone']
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn(
      'rounded-control border bg-surface px-4 py-3 text-sm shadow-dialog',
      tone === 'error' ? 'text-danger' : 'text-success',
    )}
  >
    {message}
  </div>
)

export const useToast = (): ToastContextValue => {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}
