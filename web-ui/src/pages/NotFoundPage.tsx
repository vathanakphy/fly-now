import { LinkButton } from '../components/ui'

export const NotFoundPage = () => (
  <main className="flex min-h-screen items-center justify-center p-4">
    <div className="text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">The page you requested does not exist.</p>
      <LinkButton to="/" className="mt-6">
        Return home
      </LinkButton>
    </div>
  </main>
)
