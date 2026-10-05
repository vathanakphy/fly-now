import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/layout/PageContainer'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfirmationDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  useToast,
} from '../components/ui'
import { useWorkspace } from '../features/applications/workspaceContext'
import { useEnvironmentActions, useEnvironmentVariables } from '../features/environment/hooks'
import { validateEnvironmentVariable } from '../features/environment/validation'
import { ServiceError, type EnvironmentTarget, type EnvironmentVariable } from '../types'

const emptyForm = { key: '', value: '', target: 'BOTH' as EnvironmentTarget, isSecret: false }

export const EnvironmentPage = () => {
  const { application, reloadWorkspace } = useWorkspace()
  const { data: variables, status, error, reload } = useEnvironmentVariables(application.id)
  const { create, update, remove } = useEnvironmentActions()
  const { showToast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<EnvironmentVariable | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<EnvironmentVariable | null>(null)
  const [errors, setErrors] = useState<{ key?: string; value?: string }>({})
  const [requestError, setRequestError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setRequestError('')
    setOpen(true)
  }
  const openEdit = (variable: EnvironmentVariable) => {
    setEditing(variable)
    setForm({
      key: variable.key,
      value: variable.isSecret ? '' : variable.displayValue,
      target: variable.target,
      isSecret: variable.isSecret,
    })
    setErrors({})
    setRequestError('')
    setOpen(true)
  }
  const close = () => {
    if (saving) return
    setOpen(false)
    setForm(emptyForm)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !variables) return
    const nextErrors = validateEnvironmentVariable(
      form.key,
      form.value,
      variables,
      editing?.id,
      Boolean(editing?.isSecret && form.isSecret && !form.value),
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSaving(true)
    setRequestError('')
    try {
      if (editing)
        await update(application.id, editing.id, { ...form, value: form.value || undefined })
      else await create(application.id, form)
      setForm(emptyForm)
      setOpen(false)
      await Promise.all([reload(), reloadWorkspace()])
      showToast(editing ? 'Environment variable updated.' : 'Environment variable added.')
    } catch (caught) {
      if (caught instanceof ServiceError && caught.fieldErrors) setErrors(caught.fieldErrors)
      setRequestError(caught instanceof Error ? caught.message : 'Variable could not be saved.')
    } finally {
      setSaving(false)
    }
  }
  const confirmDelete = async () => {
    if (!deleting || deletingBusy) return
    setDeletingBusy(true)
    setActionError('')
    try {
      await remove(application.id, deleting.id)
      setDeleting(null)
      await Promise.all([reload(), reloadWorkspace()])
      showToast('Environment variable deleted.')
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Variable could not be deleted.')
      setDeleting(null)
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Environment Variables"
        description="Manage build and runtime configuration values."
        action={
          <Button disabled={!variables} onClick={openCreate}>
            Add variable
          </Button>
        }
      />
      {actionError && (
        <div className="mb-5">
          <Alert title="Environment action failed" tone="error">
            {actionError}
          </Alert>
        </div>
      )}
      {error && (
        <Alert title="Environment variables could not be loaded" tone="error">
          <p>{error.message}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Try again
          </Button>
        </Alert>
      )}
      {status === 'loading' && <Skeleton className="h-52" />}
      {variables?.length === 0 && (
        <EmptyState
          title="No environment variables"
          description="Add variables only when the application needs them."
          action={<Button onClick={openCreate}>Add variable</Button>}
        />
      )}
      {variables && variables.length > 0 && (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Availability target</th>
                  <th>Secret status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {variables.map((variable) => (
                  <tr key={variable.id}>
                    <td>
                      <code>{variable.key}</code>
                    </td>
                    <td className="max-w-64 break-all">{variable.displayValue}</td>
                    <td>{variable.target}</td>
                    <td>
                      <StatusBadge tone={variable.isSecret ? 'warning' : 'neutral'}>
                        {variable.isSecret ? 'Secret' : 'Plain'}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(variable)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setDeleting(variable)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {variables.map((variable) => (
              <Card key={variable.id} className="p-4">
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted">Name</dt>
                    <dd className="font-mono font-medium break-all">{variable.key}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Value</dt>
                    <dd className="break-all">{variable.displayValue}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <div>
                      <dt className="text-muted">Target</dt>
                      <dd>{variable.target}</dd>
                    </div>
                    <StatusBadge tone={variable.isSecret ? 'warning' : 'neutral'}>
                      {variable.isSecret ? 'Secret' : 'Plain'}
                    </StatusBadge>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(variable)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => setDeleting(variable)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Edit environment variable' : 'Add environment variable'}
        description={
          editing?.isSecret ? 'Leave Value blank to keep the existing secret.' : undefined
        }
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="environment-variable-form"
              loading={saving}
              loadingLabel="Saving environment variable"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="environment-variable-form" onSubmit={submit} className="space-y-4" noValidate>
          {requestError && (
            <Alert title="Variable could not be saved" tone="error">
              {requestError}
            </Alert>
          )}
          <Input
            label="Variable Name"
            value={form.key}
            error={errors.key}
            onChange={(event) => {
              setForm((current) => ({ ...current, key: event.target.value }))
              setErrors((current) => ({ ...current, key: undefined }))
            }}
          />
          <Input
            label="Value"
            type={form.isSecret ? 'password' : 'text'}
            autoComplete="off"
            value={form.value}
            error={errors.value}
            onChange={(event) => {
              setForm((current) => ({ ...current, value: event.target.value }))
              setErrors((current) => ({ ...current, value: undefined }))
            }}
          />
          <Select
            label="Target"
            value={form.target}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                target: event.target.value as EnvironmentTarget,
              }))
            }
          >
            <option value="BUILD">Build</option>
            <option value="RUNTIME">Runtime</option>
            <option value="BOTH">Both</option>
          </Select>
          <Checkbox
            label="Mark as Secret"
            description="Saved secret values are never displayed again."
            checked={form.isSecret}
            onChange={(event) =>
              setForm((current) => ({ ...current, isSecret: event.target.checked }))
            }
          />
        </form>
      </Modal>
      <ConfirmationDialog
        open={Boolean(deleting)}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete environment variable?"
        description={`${deleting?.key ?? 'This variable'} will be permanently removed.`}
        confirmLabel="Delete variable"
        loading={deletingBusy}
      />
    </div>
  )
}
