import { useEffect, useState, type FormEvent } from 'react'
import { PageContainer, PageHeader } from '../components/layout/PageContainer'
import { Alert, Button, Card, Input, useToast } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import { ServiceError } from '../types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const AccountPage = () => {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', username: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const [requestError, setRequestError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, username: user.username })
  }, [user])

  const change = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    const errors: Partial<Record<keyof typeof form, string>> = {}
    if (!form.name.trim()) errors.name = 'Name is required.'
    else if (form.name.trim().length > 100) errors.name = 'Name must be 100 characters or fewer.'
    if (!form.email.trim()) errors.email = 'Email is required.'
    else if (!emailPattern.test(form.email.trim())) errors.email = 'Enter a valid email address.'
    else if (form.email.trim().length > 254) errors.email = 'Email must be 254 characters or fewer.'
    if (form.username.trim().length < 3 || form.username.trim().length > 50)
      errors.username = 'Username must be 3–50 characters.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setRequestError('')
    try {
      await updateProfile({ name: form.name, email: form.email, username: form.username })
      showToast('Account details updated.')
    } catch (caught) {
      if (caught instanceof ServiceError && caught.fieldErrors) {
        setFieldErrors((current) => ({ ...current, ...caught.fieldErrors }))
      }
      setRequestError(caught instanceof Error ? caught.message : 'Unable to update the account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title="Account" description="Manage your FlyNow profile." />
      <Card className="p-6">
        {requestError && (
          <div className="mb-5">
            <Alert title="Account could not be updated" tone="error">
              {requestError}
            </Alert>
          </div>
        )}
        <form onSubmit={submit} className="space-y-5" noValidate>
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
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={loading}
              loadingLabel="Saving account details"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  )
}
