import { useOutletContext } from 'react-router-dom'
import type { Application, Source } from '../../types'

export interface WorkspaceContextValue {
  application: Application
  source: Source | null
  reloadWorkspace: () => Promise<{ application: Application; source: Source | null } | null>
}

export const useWorkspace = () => useOutletContext<WorkspaceContextValue>()
