export interface UserProfile {
  id: string
  email: string
  nome: string
  role: 'admin' | 'vendedor'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface AuthContextType {
  user: any | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isAdmin: boolean
}

export type UserRole = 'admin' | 'vendedor'

export interface LoginData {
  email: string
  password: string
}

export interface SignUpData {
  name: string
  email: string
  password: string
  confirmPassword: string
} 