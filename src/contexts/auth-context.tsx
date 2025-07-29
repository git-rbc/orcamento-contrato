'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  nome: string
  role: 'admin' | 'vendedor' // Campo legacy mantido para compatibilidade
  ativo: boolean
  created_at: string
  // Novos campos do sistema de roles
  role_id: string | null
  role_nome: string | null
  role_descricao: string | null
  role_cor: string | null
  nivel_hierarquia: number | null
  total_permissoes: number
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; isFirstLogin?: boolean }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isAdmin: boolean
  checkFirstLogin: (email: string) => Promise<{ isFirstLogin: boolean; userExists: boolean }>
  setAdminPassword: (email: string, password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  // Função para buscar perfil do usuário via API (evita RLS)
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] Buscando perfil via API para usuário:', userId)
      
      // Usar a API para buscar o perfil, evitando problemas de RLS
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('[AuthContext] API de perfil retornou erro:', response.status, response.statusText)
        
        // Se 401, limpar sessão
        if (response.status === 401) {
          console.log('[AuthContext] Token inválido, fazendo logout')
          await supabase.auth.signOut()
          return null
        }
        
        // Para outros erros, retornar null (não criar fallbacks que podem causar loops)
        return null
      }

      const profileData = await response.json()
      
      if (!profileData.success || !profileData.profile) {
        console.error('[AuthContext] Dados de perfil inválidos na resposta da API')
        return null
      }

      console.log('[AuthContext] Perfil obtido com sucesso:', profileData.profile.nome)
      return profileData.profile as UserProfile
      
    } catch (error) {
      console.error('[AuthContext] Erro inesperado ao buscar perfil:', error)
      return null
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    let isInitializing = true

    console.log('[AuthContext] Configurando onAuthStateChange listener...')

    const handleAuthStateChange = async (event: string, session: any) => {
      if (!mounted) {
        console.log('[AuthContext] Componente desmontado, ignorando mudança de auth.')
        return
      }

      console.log(`[AuthContext] Evento de auth recebido: ${event}`)
      
      // Para INITIAL_SESSION, processar apenas uma vez
      if (event === 'INITIAL_SESSION') {
        if (!isInitializing) {
          console.log('[AuthContext] INITIAL_SESSION já processado, ignorando')
          return
        }
        isInitializing = false
      }
      
      const currentUser = session?.user ?? null
      
      if (mounted) {
        setUser(currentUser)
      }
      
      if (currentUser && mounted) {
        console.log(`[AuthContext] Buscando perfil para: ${currentUser.email}`)
        try {
          const profile = await fetchUserProfile(currentUser.id)
          if (mounted) {
            if (profile) {
              console.log(`[AuthContext] Perfil definido para: ${profile.nome}`)
              setUserProfile(profile)
            } else {
              console.log('[AuthContext] Perfil não encontrado, limpando estado')
              setUserProfile(null)
            }
          }
        } catch (error) {
          console.error('[AuthContext] Erro ao buscar perfil:', error)
          if (mounted) {
            setUserProfile(null)
          }
        }
      } else if (mounted) {
        console.log('[AuthContext] Nenhum usuário, limpando perfil.')
        setUserProfile(null)
      }

      if (mounted) {
        console.log('[AuthContext] Verificação concluída, setLoading(false).')
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      console.log('[AuthContext] Limpando onAuthStateChange listener.')
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserProfile, supabase])

  // Verificar se é primeiro login
  const checkFirstLogin = useCallback(async (email: string) => {
    try {
      const response = await fetch('/api/auth/check-first-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      return { isFirstLogin: data.isFirstLogin || false, userExists: data.userExists || false }
    } catch (error) {
      console.error('Erro ao verificar primeiro login:', error)
      return { isFirstLogin: false, userExists: false }
    }
  }, [])

  // Definir senha inicial para admin
  const setAdminPassword = useCallback(async (email: string, password: string) => {
    try {
      console.log('Iniciando setAdminPassword para:', email)
      
      const response = await fetch('/api/auth/set-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      
      console.log('Resposta da API set-admin-password:', { 
        status: response.status, 
        ok: response.ok, 
        data 
      })
      
      if (!response.ok) {
        return { error: data.error || 'Erro ao definir senha' }
      }

      return { error: null }
    } catch (error) {
      console.error('Erro ao definir senha do admin:', error)
      return { error: 'Erro inesperado ao definir senha' }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('Iniciando signIn para:', email)
      
      // Fazer login direto sem verificações complexas para evitar loops
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Erro no signInWithPassword:', error)
        return { error: error.message }
      }

      console.log('Login realizado com sucesso')
      return { error: null }
    } catch (error) {
      console.error('Erro inesperado no signIn:', error)
      return { error: 'Erro inesperado ao fazer login' }
    }
  }, [supabase.auth])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: name,
            role: 'admin', // Forçar como admin para o cadastro inicial
          },
        },
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar conta' }
    }
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    try {
      // Limpar estado local primeiro
      setUser(null)
      setUserProfile(null)
      
      // Depois fazer logout no Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        // Não mostrar erro se a sessão já não existe (isso é esperado)
        if (error.message !== 'Auth session missing!' && !error.message.includes('session missing')) {
          console.error('Erro ao fazer logout:', error)
        }
      }
    } catch (error) {
      // Não mostrar erro para problemas de sessão missing
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('session missing') && !errorMessage.includes('Auth session missing')) {
        console.error('Erro inesperado ao fazer logout:', error)
      }
    }
  }, [supabase.auth])

  // Atualizar isAdmin para usar novo sistema de roles
  const isAdmin = Boolean(
    userProfile?.role === 'admin' || // Legacy
    (userProfile?.nivel_hierarquia && userProfile.nivel_hierarquia >= 80) // Novo sistema
  )

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    checkFirstLogin,
    setAdminPassword,
  }), [
    user, 
    userProfile, 
    loading, 
    signIn, 
    signUp, 
    signOut, 
    isAdmin, 
    checkFirstLogin, 
    setAdminPassword
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 