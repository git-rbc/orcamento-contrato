'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Logo } from '@/components/ui/logo'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    console.log('[Home] Estado:', { loading, hasUser: !!user, hasRedirected: hasRedirected.current })
    
    if (!loading && !hasRedirected.current) {
      hasRedirected.current = true
      if (user) {
        console.log('[Home] Redirecionando para dashboard')
        router.replace('/dashboard')
      } else {
        console.log('[Home] Redirecionando para login')
        router.replace('/login')
      }
    }
  }, [user, loading, router])

  // Página de loading enquanto verifica autenticação
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <Logo width={200} height={80} className="mx-auto" />
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    </div>
  )
}
