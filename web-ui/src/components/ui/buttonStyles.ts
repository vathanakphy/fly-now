import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50',
  secondary: 'border bg-surface text-text hover:bg-page disabled:text-muted/60',
  ghost: 'text-muted hover:bg-page hover:text-text disabled:text-muted/50',
  danger: 'bg-danger text-white hover:bg-red-700 disabled:bg-danger/50',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
}

export const buttonClassName = ({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors',
    variants[variant],
    sizes[size],
    className,
  )
