import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../utils/cn'
import { IconButton } from './Button'

interface FieldMeta {
  label: string
  hint?: string
  error?: string
  className?: string
}

const FieldMessage = ({ hint, error, id }: { hint?: string; error?: string; id: string }) => {
  if (!hint && !error) return null
  return (
    <p
      id={id}
      role={error ? 'alert' : undefined}
      className={cn('mt-1.5 text-sm', error ? 'text-danger' : 'text-muted')}
    >
      {error ?? hint}
    </p>
  )
}

const controlClass =
  'min-h-11 w-full rounded-control border bg-surface px-3 text-sm text-text shadow-sm placeholder:text-muted/70 disabled:bg-page disabled:text-muted aria-invalid:border-danger'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldMeta {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id: suppliedId, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={controlClass}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
        {...props}
      />
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
})

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} {...props} type={visible ? 'text' : 'password'} className="pr-12" />
        <IconButton
          label={visible ? 'Hide password' : 'Show password'}
          className="absolute top-7 right-0"
          onClick={() => setVisible((value) => !value)}
        >
          <span aria-hidden="true">{visible ? '◉' : '○'}</span>
        </IconButton>
      </div>
    )
  },
)

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldMeta {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id: suppliedId, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        className={cn(controlClass, 'min-h-28 py-2')}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
        {...props}
      />
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldMeta {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id: suppliedId, children, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        className={controlClass}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
})

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id: suppliedId, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  return (
    <label htmlFor={id} className={cn('flex min-h-11 items-start gap-3', className)}>
      <input ref={ref} id={id} type="checkbox" className="mt-1 size-4 accent-primary" {...props} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
    </label>
  )
})

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, className, ...props },
  ref,
) {
  return (
    <label className={cn('inline-flex min-h-11 items-center gap-3', className)}>
      <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
      <span className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-primary peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
      <span className="text-sm font-medium">{label}</span>
    </label>
  )
})
