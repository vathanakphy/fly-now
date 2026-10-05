import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { Spinner } from './Feedback'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingLabel?: string
  leadingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = 'Working',
    leadingIcon,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" label={loadingLabel} /> : leadingIcon}
      {children}
    </button>
  )
})

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const LinkButton = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: LinkButtonProps) => <Link className={buttonClassName({ variant, size, className })} {...props} />

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, label, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-page hover:text-text disabled:opacity-50',
        className,
      )}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  )
})
