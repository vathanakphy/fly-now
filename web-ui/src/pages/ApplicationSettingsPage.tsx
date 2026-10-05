import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageContainer'
import { Alert, Button, Card, Input, Modal, Textarea, useToast } from '../components/ui'
import { useApplicationSettingsActions } from '../features/applications/hooks'
import { useWorkspace } from '../features/applications/workspaceContext'

export const ApplicationSettingsPage = () => {
  const { application, reloadWorkspace } = useWorkspace()
  const { update, remove } = useApplicationSettingsActions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(application.name)
  const [description, setDescription] = useState(application.description ?? '')
  const [nameError, setNameError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmationName, setConfirmationName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (!name.trim()) return setNameError('Application name is required.')
    if (name.trim().length > 100) return setNameError('Name must be 100 characters or fewer.')
    setSaving(true)
    setRequestError('')
    try {
      await update(application.id, { name: name.trim(), description: description.trim() })
      await reloadWorkspace()
      showToast('Application settings saved.')
    } catch (caught) {
      setRequestError(caught instanceof Error ? caught.message : 'Settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const deleteApplication = async () => {
    if (deleting || confirmationName !== application.name) return
    setDeleting(true)
    try {
      await remove(application.id)
      showToast(`${application.name} was deleted.`)
      navigate('/applications', { replace: true })
    } catch (caught) {
      setRequestError(
        caught instanceof Error ? caught.message : 'Application could not be deleted.',
      )
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Application Settings"
        description="Update application details or remove the application."
      />
      {requestError && (
        <div className="mb-5">
          <Alert title="Settings action failed" tone="error">
            {requestError}
          </Alert>
        </div>
      )}
      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Input
            label="Application Name"
            maxLength={100}
            value={name}
            error={nameError}
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
            }}
          />
          <Textarea
            label="Description"
            hint="Optional"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={saving}
              loadingLabel="Saving application settings"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
      <Card className="mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-danger">Danger zone</h2>
        <p className="mt-2 text-sm text-muted">
          Deleting this application also removes its stored source, runtime configuration,
          environment metadata, and readiness results.
        </p>
        <Button
          variant="danger"
          className="mt-5"
          onClick={() => {
            setConfirmationName('')
            setDeleteOpen(true)
          }}
        >
          Delete application
        </Button>
      </Card>
      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete application?"
        description={`Type “${application.name}” to confirm permanent deletion.`}
        footer={
          <>
            <Button variant="secondary" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              loadingLabel="Deleting application"
              disabled={confirmationName !== application.name || deleting}
              onClick={() => void deleteApplication()}
            >
              {deleting ? 'Deleting…' : 'Delete application'}
            </Button>
          </>
        }
      >
        <Input
          label="Application name"
          autoComplete="off"
          value={confirmationName}
          onChange={(event) => setConfirmationName(event.target.value)}
        />
      </Modal>
    </div>
  )
}
