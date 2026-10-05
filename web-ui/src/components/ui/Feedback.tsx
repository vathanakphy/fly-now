import { cn } from '../../utils/cn'

export const Spinner = ({
  size = 'md',
  label = 'Loading',
}: {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}) => (
  <span role="status" className="inline-flex items-center">
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        size === 'sm' ? 'size-4' : size === 'lg' ? 'size-8' : 'size-5',
      )}
      aria-hidden="true"
    />
    <span className="sr-only">{label}</span>
  </span>
)

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-control bg-slate-200', className)} aria-hidden="true" />
)

export interface ProgressStep {
  id: string
  label: string
}

export const ProgressIndicator = ({
  steps,
  currentStep,
}: {
  steps: ProgressStep[]
  currentStep: string
}) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStep)
  return (
    <ol aria-label="Application setup progress" className="grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const complete = index < currentIndex
        const current = index === currentIndex
        return (
          <li
            key={step.id}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-control border px-3 py-2 text-sm',
              current && 'border-primary-border bg-primary-light text-primary',
              complete && 'border-green-200 bg-success-light text-success',
            )}
          >
            <span aria-hidden="true">{complete ? '✓' : index + 1}</span>
            <span>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
