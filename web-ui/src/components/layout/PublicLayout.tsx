import { Link, Outlet } from 'react-router-dom'
import { LinkButton } from '../ui'
import { PageContainer } from './PageContainer'

export const Brand = () => (
  <Link
    to="/"
    className="inline-flex items-center gap-2 text-lg font-bold"
    aria-label="FlyNow home"
  >
    <span
      className="flex size-8 items-center justify-center rounded-control bg-primary text-white"
      aria-hidden="true"
    >
      F
    </span>
    FlyNow
  </Link>
)

export const PublicLayout = () => (
  <div className="min-h-screen bg-page">
    <header className="border-b bg-surface">
      <PageContainer className="flex items-center justify-between py-3">
        <Brand />
        <nav aria-label="Public navigation" className="flex items-center gap-1 sm:gap-2">
          <a
            href="/#features"
            className="hidden min-h-11 items-center px-3 text-sm font-medium text-muted hover:text-text sm:inline-flex"
          >
            Features
          </a>
          <LinkButton to="/login" variant="ghost">
            Login
          </LinkButton>
          <LinkButton to="/register">Get started</LinkButton>
        </nav>
      </PageContainer>
    </header>
    <main id="main-content">
      <Outlet />
    </main>
    <footer className="border-t bg-surface">
      <PageContainer className="flex flex-col gap-2 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 FlyNow</span>
        <span>Source to ready, without the complexity.</span>
      </PageContainer>
    </footer>
  </div>
)

export const AuthLayout = () => (
  <main className="flex min-h-screen flex-col bg-page px-4 py-8">
    <div className="mx-auto mb-8">
      <Brand />
    </div>
    <div className="m-auto w-full max-w-md">
      <Outlet />
    </div>
  </main>
)
