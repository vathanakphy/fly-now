import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './providers/AppProviders'
import { AppRoutes } from '../routes/AppRoutes'

export const App = () => (
  <BrowserRouter>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </BrowserRouter>
)
