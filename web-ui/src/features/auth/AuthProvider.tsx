import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { services } from '../../services/serviceProvider'
import type { AuthCredentials, RegistrationInput } from '../../services/contracts'
import type { User } from '../../types'

interface AuthContextValue {
  user: User | null
  isRestoring: boolean
  login: (credentials: AuthCredentials) => Promise<void>
  register: (input: RegistrationInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: Pick<User, 'name' | 'email' | 'username'>) => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    services.auth
      .restoreSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsRestoring(false))
  }, [])

  const login = useCallback(async (credentials: AuthCredentials) => {
    setUser(await services.auth.login(credentials))
  }, [])
  const register = useCallback(async (input: RegistrationInput) => {
    setUser(await services.auth.register(input))
  }, [])
  const logout = useCallback(async () => {
    await services.auth.logout()
    setUser(null)
  }, [])
  const updateProfile = useCallback(async (input: Pick<User, 'name' | 'email' | 'username'>) => {
    const updated = await services.user.updateProfile(input)
    setUser(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ user, isRestoring, login, register, logout, updateProfile }),
    [user, isRestoring, login, register, logout, updateProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
