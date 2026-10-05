import { Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ApplicationWorkspace } from '../components/layout/ApplicationWorkspace'
import { AuthLayout, PublicLayout } from '../components/layout/PublicLayout'
import { AccountPage } from '../pages/AccountPage'
import { ApplicationsPage, NewApplicationPage, ReadinessPage } from '../pages/ApplicationPages'
import { ApplicationSettingsPage } from '../pages/ApplicationSettingsPage'
import { ConfigurationPage } from '../pages/ConfigurationPage'
import { EnvironmentPage } from '../pages/EnvironmentPage'
import { SourcePage } from '../pages/SourcePage'
import { LoginPage, RegisterPage } from '../pages/AuthPages'
import { LandingPage } from '../pages/LandingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards'

export const AppRoutes = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<LandingPage />} />
    </Route>
    <Route element={<PublicOnlyRoute />}>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/applications/new" element={<NewApplicationPage />} />
        <Route path="/applications/:id" element={<ApplicationWorkspace />}>
          <Route index element={<ReadinessPage />} />
          <Route path="source" element={<SourcePage />} />
          <Route path="configuration" element={<ConfigurationPage />} />
          <Route path="environment" element={<EnvironmentPage />} />
          <Route path="settings" element={<ApplicationSettingsPage />} />
        </Route>
        <Route path="/account" element={<AccountPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
)
