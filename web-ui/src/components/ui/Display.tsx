import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-card border bg-surface shadow-card', className)} {...props} />
)

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'
const tones: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-danger-light text-danger',
}

export const StatusBadge = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: StatusTone
}) => (
  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>
    <span className="sr-only">Status: </span>
    {children}
  </span>
)

export const Alert = ({
  title,
  children,
  tone = 'info',
}: {
  title: string
  children?: ReactNode
  tone?: Exclude<StatusTone, 'neutral'>
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn(
      'rounded-card border p-4 text-sm',
      tone === 'info' && 'border-primary-border bg-primary-light',
      tone === 'success' && 'border-green-200 bg-success-light',
      tone === 'warning' && 'border-amber-200 bg-warning-light',
      tone === 'error' && 'border-red-200 bg-danger-light',
    )}
  >
    <p className="font-semibold">{title}</p>
    {children && <div className="mt-1 text-muted">{children}</div>}
  </div>
)

export const Table = ({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto rounded-card border">
    <table
      className={cn(
        'w-full border-collapse bg-surface text-left text-sm [&_td]:border-t [&_td]:px-4 [&_td]:py-3 [&_th]:bg-page [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold',
        className,
      )}
      {...props}
    />
  </div>
)

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) => (
  <div className="rounded-card border border-dashed bg-surface px-6 py-12 text-center">
    <div
      className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary-light text-primary"
      aria-hidden="true"
    >
      +
    </div>
    <h2 className="text-base font-semibold">{title}</h2>
    <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
)
