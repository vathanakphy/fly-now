import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { cn } from '../../utils/cn'
import { Brand } from './PublicLayout'
import { Button, Dropdown, IconButton, useToast } from '../ui'

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const navigation = [
  { to: '/applications', label: 'Applications', icon: '▦' },
  { to: '/account', label: 'Account', icon: '○' },
]

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const signOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await logout()
      navigate('/login')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not sign out.', 'error')
    } finally {
      setSigningOut(false)
    }
  }
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4">
        <Brand />
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-1 p-3">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium',
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-muted hover:bg-page hover:text-text',
              )
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          loading={signingOut}
          loadingLabel="Signing out"
          disabled={signingOut}
          onClick={() => void signOut()}
          className="w-full justify-start"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </div>
  )
}

export const AppShell = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const signOut = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not sign out.', 'error')
    }
  }
  useEffect(() => {
    if (!drawerOpen) return
    const openButton = openButtonRef.current
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', close)
      document.body.style.overflow = ''
      openButton?.focus()
    }
  }, [drawerOpen])
  const trapDrawerFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !drawerRef.current) return
    const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(focusable))
    const first = items[0]
    const last = items.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <div className="min-h-screen bg-page lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-surface lg:block">
        <SidebarContent />
      </aside>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center">
          <IconButton
            ref={openButtonRef}
            label="Open navigation"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </IconButton>
          <span className="ml-2 font-semibold lg:hidden">FlyNow</span>
          <span className="hidden text-sm text-muted lg:inline">Application workspace</span>
        </div>
        <Dropdown label={user?.username ? `@${user.username}` : 'User menu'}>
          <Link
            role="menuitem"
            to="/account"
            className="flex min-h-10 items-center rounded-control px-3 text-sm hover:bg-page"
          >
            Account
          </Link>
          <button
            role="menuitem"
            onClick={() => void signOut()}
            className="flex min-h-10 w-full items-center rounded-control px-3 text-sm text-danger hover:bg-danger-light"
          >
            Sign out
          </button>
        </Dropdown>
      </header>
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onKeyDown={trapDrawerFocus}
            className="relative h-full w-[min(20rem,85vw)] bg-surface shadow-dialog"
          >
            <div className="absolute top-2 right-2 z-10">
              <IconButton autoFocus label="Close navigation" onClick={() => setDrawerOpen(false)}>
                ×
              </IconButton>
            </div>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
