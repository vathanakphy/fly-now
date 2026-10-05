import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'
import { Alert, Button, Card, Input, PasswordInput } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import { ServiceError } from '../types'

interface LocationState {
  from?: Location
}

type FieldErrors<T extends string> = Partial<Record<T, string>>
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('password')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'username' | 'password'>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    const errors: FieldErrors<'username' | 'password'> = {}
    if (!username.trim()) errors.username = 'Username is required.'
    if (!password) errors.password = 'Password is required.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setError('')
    try {
      await login({ username: username.trim(), password })
      const state = location.state as LocationState | null
      navigate(state?.from ?? '/applications', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to continue preparing your applications.</p>
      {error && (
        <div className="mt-5">
          <Alert title="Sign-in failed" tone="error">
            {error}
          </Alert>
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Username"
          autoComplete="username"
          required
          value={username}
          error={fieldErrors.username}
          onChange={(event) => {
            setUsername(event.target.value)
            setFieldErrors((current) => ({ ...current, username: undefined }))
          }}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          error={fieldErrors.password}
          onChange={(event) => {
            setPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, password: undefined }))
          }}
        />
        <Button
          type="submit"
          loading={loading}
          loadingLabel="Signing in"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to FlyNow?{' '}
        <Link className="font-semibold text-primary hover:underline" to="/register">
          Create an account
        </Link>
      </p>
    </Card>
  )
}

type RegistrationField = 'name' | 'email' | 'username' | 'password'

const validateRegistration = (form: Record<RegistrationField, string>) => {
  const errors: FieldErrors<RegistrationField> = {}
  const name = form.name.trim()
  const email = form.email.trim()
  const username = form.username.trim()
  if (!name) errors.name = 'Name is required.'
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.'
  if (!email) errors.email = 'Email is required.'
  else if (email.length > 254) errors.email = 'Email must be 254 characters or fewer.'
  else if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (!username) errors.username = 'Username is required.'
  else if (username.length < 3 || username.length > 50)
    errors.username = 'Username must be 3–50 characters.'
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 12 || form.password.length > 72)
    errors.password = 'Password must be 12–72 characters.'
  return errors
}

export const RegisterPage = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Record<RegistrationField, string>>({
    name: '',
    email: '',
    username: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegistrationField>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const change = (field: RegistrationField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    const errors = validateRegistration(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setError('')
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
      })
      navigate('/applications', { replace: true })
    } catch (caught) {
      if (caught instanceof ServiceError && caught.fieldErrors) {
        setFieldErrors((current) => ({ ...current, ...caught.fieldErrors }))
      }
      setError(caught instanceof Error ? caught.message : 'Unable to register.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Start preparing your first application.</p>
      {error && (
        <div className="mt-5">
          <Alert title="Registration failed" tone="error">
            {error}
          </Alert>
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Name"
          autoComplete="name"
          required
          maxLength={100}
          value={form.name}
          error={fieldErrors.name}
          onChange={(event) => change('name', event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={form.email}
          error={fieldErrors.email}
          onChange={(event) => change('email', event.target.value)}
        />
        <Input
          label="Username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={50}
          value={form.username}
          error={fieldErrors.username}
          onChange={(event) => change('username', event.target.value)}
        />
        <PasswordInput
          label="Password"
          hint="Use 12–72 characters."
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          required
          value={form.password}
          error={fieldErrors.password}
          onChange={(event) => change('password', event.target.value)}
        />
        <Button
          type="submit"
          loading={loading}
          loadingLabel="Creating account"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link className="font-semibold text-primary hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
