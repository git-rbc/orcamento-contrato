'use client'

import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Users, Package, FileText, Mail, Shield, Clock, RefreshCw, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { dashboardCache } from '@/lib/cache'
import { useDashboardCache } from '@/hooks/useDashboardCache'

export default function DashboardPage() {
  const { userProfile, isAdmin, loading, user } = useAuth()
  const router = useRouter()
  const [clientesCount, setClientesCount] = useState<number>(0)
  const [servicosCount, setServicosCount] = useState<number>(0)
  const [produtosCount, setProdutosCount] = useState<number>(0)
  const [contratosCount, setContratosCount] = useState<number>(0)
  const [espacosCount, setEspacosCount] = useState<number>(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [isUsingCache, setIsUsingCache] = useState(false)
  const { refreshStats, hasCachedData } = useDashboardCache()

  // Redirecionamento mais específico para evitar loops
  useEffect(() => {
    // Só redirecionar se não estiver carregando e não tiver usuário autenticado
    if (!loading && !user) {
      console.log('[Dashboard] Sem usuário autenticado, redirecionando para login')
      router.replace('/login')
    }
  }, [loading, user, router])

  // Timeout para carregamento do perfil - redirecionar para login se falhar
  useEffect(() => {
    if (user && !userProfile && !loading) {
      const timeout = setTimeout(() => {
        console.log('[Dashboard] Timeout no carregamento do perfil, redirecionando para login')
        router.replace('/login')
      }, 10000) // Aumentado para 10 segundos para reduzir tentativas desnecessárias

      return () => clearTimeout(timeout)
    }
  }, [user, userProfile, loading, router])

  // Buscar estatísticas com cache
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        
        // --- Clientes ---
        let clientesData = dashboardCache.getClientesStats()
        let usedCache = false
        
        if (!clientesData) {
          const clientesResponse = await fetch('/api/clientes/stats')
          if (clientesResponse.ok) {
            const apiResponse = await clientesResponse.json()
            clientesData = apiResponse.data 
            if (clientesData) {
              dashboardCache.setClientesStats(clientesData)
            }
          }
        } else {
          usedCache = true
        }
        setClientesCount(clientesData?.total || 0)
        setIsUsingCache(usedCache)
        
        // --- Serviços ---
        let servicosData = dashboardCache.getServicosStats()
        if (!servicosData) {
          const servicosResponse = await fetch('/api/servicos/stats')
          if (servicosResponse.ok) {
            const apiResponse = await servicosResponse.json()
            servicosData = apiResponse.data
            if (servicosData) {
              dashboardCache.setServicosStats(servicosData)
            }
          }
        }
        setServicosCount(servicosData?.total || 0)
        
        // --- Produtos ---
        let produtosData = dashboardCache.getProdutosStats()
        if (!produtosData) {
          const produtosResponse = await fetch('/api/produtos/stats')
          if (produtosResponse.ok) {
            const apiResponse = await produtosResponse.json()
            produtosData = apiResponse // A API já retorna o objeto com total diretamente
            if (produtosData) {
              dashboardCache.setProdutosStats(produtosData)
            }
          }
        }
        setProdutosCount(produtosData?.total || 0)
        
        // --- Contratos ---
        const contratosResponse = await fetch('/api/contratos/stats')
        if (contratosResponse.ok) {
          const contratosApiResponse = await contratosResponse.json()
          setContratosCount(contratosApiResponse.data?.total || 0)
        }
        
        // --- Espaços ---
        const espacosResponse = await fetch('/api/espacos/stats')
        if (espacosResponse.ok) {
          const espacosApiResponse = await espacosResponse.json()
          setEspacosCount(espacosApiResponse.data?.total || 0)
        }
        
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (user && userProfile) {
      fetchStats()
    }
  }, [user, userProfile])

  // Listener para refresh customizado (para evitar reload completo)
  useEffect(() => {
    const handleRefresh = () => {
      if (user && userProfile) {
        // Re-executar fetchStats quando receber evento de refresh
        const fetchStats = async () => {
          try {
            setLoadingStats(true)
            
            // Forçar busca de dados sem cache
            const [clientesRes, servicosRes, produtosRes, contratosRes, espacosRes] = await Promise.all([
              fetch('/api/clientes/stats'),
              fetch('/api/servicos/stats'), 
              fetch('/api/produtos/stats'),
              fetch('/api/contratos/stats'),
              fetch('/api/espacos/stats')
            ])
            
            if (clientesRes.ok) {
              const clientesData = await clientesRes.json()
              setClientesCount(clientesData.data?.total || 0)
            }
            
            if (servicosRes.ok) {
              const servicosData = await servicosRes.json()
              setServicosCount(servicosData.data?.total || 0)
            }
            
            if (produtosRes.ok) {
              const produtosData = await produtosRes.json()
              setProdutosCount(produtosData?.total || 0)
            }
            
            if (contratosRes.ok) {
              const contratosData = await contratosRes.json()
              setContratosCount(contratosData.data?.total || 0)
            }
            
            if (espacosRes.ok) {
              const espacosData = await espacosRes.json()
              setEspacosCount(espacosData.data?.total || 0)
            }
            
          } catch (error) {
            console.error('Erro ao buscar estatísticas:', error)
          } finally {
            setLoadingStats(false)
          }
        }
        
        fetchStats()
      }
    }
    
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [user, userProfile])

  // Mostrar loading enquanto carrega ou enquanto busca perfil
  if (loading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Verificando autenticação...' : 'Carregando perfil...'}
          </p>
        </div>
      </div>
    )
  }

  // Se não tem usuário, retornar null (o useEffect vai redirecionar)
  if (!user) {
    return null
  }

  // Se tem usuário mas não tem perfil, algo deu errado
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Erro ao carregar perfil</h2>
          <p className="text-muted-foreground">
            Houve um problema ao carregar seu perfil. Tente fazer login novamente.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo ao sistema de gestão de contratos
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {isUsingCache && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                Cache ativo (24h)
              </div>
            )}
            <button
              onClick={refreshStats}
              disabled={loadingStats}
              className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              title="Atualizar estatísticas"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Navegação Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Gestão de Clientes */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/clientes">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Clientes
                </CardTitle>
                <CardDescription>
                  Gerencie seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loadingStats ? '...' : clientesCount}
                </div>
                <p className="text-xs text-muted-foreground">Total de clientes</p>
              </CardContent>
            </Link>
          </Card>

          {/* Gestão de Serviços */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/servicos">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Package className="h-5 w-5 mr-2 text-green-600" />
                  Serviços
                </CardTitle>
                <CardDescription>
                  Catálogo de serviços
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loadingStats ? '...' : servicosCount}
                </div>
                <p className="text-xs text-muted-foreground">Serviços ativos</p>
              </CardContent>
            </Link>
          </Card>

          {/* Gestão de Produtos */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/produtos">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Package className="h-5 w-5 mr-2 text-amber-600" />
                  Produtos
                </CardTitle>
                <CardDescription>
                  Catálogo de produtos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {loadingStats ? '...' : produtosCount}
                </div>
                <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
              </CardContent>
            </Link>
          </Card>

          {/* Contratos */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/contratos">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2 text-purple-600" />
                  Contratos
                </CardTitle>
                <CardDescription>
                  Orçamentos e contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {loadingStats ? '...' : contratosCount}
                </div>
                <p className="text-xs text-muted-foreground">Total de contratos</p>
              </CardContent>
            </Link>
          </Card>

          {/* Espaços para Eventos */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/espacos-eventos">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
                  Espaços
                </CardTitle>
                <CardDescription>
                  Locais para eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {loadingStats ? '...' : espacosCount}
                </div>
                <p className="text-xs text-muted-foreground">Espaços cadastrados</p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Card de Informações do Usuário */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Informações da Conta
              </CardTitle>
              <CardDescription>
                Detalhes do seu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium">{userProfile.email}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Perfil:</span>
                <Badge variant={isAdmin ? "default" : "secondary"}>
                  {isAdmin ? (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </>
                  ) : (
                    'Vendedor'
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cadastrado:</span>
                <span className="text-sm">
                  {new Date(userProfile.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
} 