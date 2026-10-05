import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export const PageContainer = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>
    {children}
  </div>
)

export const PageHeader = ({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) => (
  <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted sm:text-base">{description}</p>}
    </div>
    {action && <div className="shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
  </header>
)
