'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Search, User, Building, Users } from 'lucide-react'
import { formatCPFCNPJ, formatPhone } from '@/lib/utils'

export default function DebugPage() {
  const { user, userProfile, loading } = useAuth()
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null)
  const [envVars, setEnvVars] = useState<any>(null)
  const [buscarCpf, setBuscarCpf] = useState('')
  const [resultadoBusca, setResultadoBusca] = useState<any>(null)
  const [loadingBusca, setLoadingBusca] = useState(false)

    const checkSupabase = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      setSupabaseStatus({
        hasSession: !!session,
        sessionUser: session?.user?.email,
        error: error?.message,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
        setSupabaseStatus({
        error: 'Failed to connect',
        details: error,
        timestamp: new Date().toISOString()
      })
    }
  }

  useEffect(() => {
    // Check environment variables
    setEnvVars({
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })

    checkSupabase()
  }, [])

  const testeBuscarPorCpf = async (exato = false) => {
    if (!buscarCpf.trim()) return

    setLoadingBusca(true)
    try {
      const params = new URLSearchParams({
        documento: buscarCpf,
        exato: exato.toString()
      })

      const response = await fetch(`/api/clientes/cpf?${params}`)
      const data = await response.json()
      
      setResultadoBusca({
        ...data,
        statusCode: response.status,
        tipo: exato ? 'exata' : 'flexível'
      })
    } catch (error) {
      setResultadoBusca({
        error: 'Erro na requisição',
        details: error
      })
    } finally {
      setLoadingBusca(false)
    }
  }

  const testeBuscaGeral = async () => {
    if (!buscarCpf.trim()) return

    setLoadingBusca(true)
    try {
      const params = new URLSearchParams({
        search: buscarCpf,
        limit: '5'
      })

      const response = await fetch(`/api/clientes?${params}`)
      const data = await response.json()
      
      setResultadoBusca({
        ...data,
        statusCode: response.status,
        tipo: 'busca geral'
      })
    } catch (error) {
      setResultadoBusca({
        error: 'Erro na requisição',
        details: error
      })
    } finally {
      setLoadingBusca(false)
    }
  }

  const renderCliente = (cliente: any) => (
    <div key={cliente.id} className="p-4 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{cliente.nome}</h4>
        <Badge variant={cliente.cpf_cnpj?.replace(/\D/g, '').length === 11 ? 'secondary' : 'default'}>
          {cliente.cpf_cnpj?.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'}
        </Badge>
      </div>
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span className="font-mono">{formatCPFCNPJ(cliente.cpf_cnpj)}</span>
      </div>
      <div className="text-sm">{cliente.email}</div>
      <div className="text-sm">{formatPhone(cliente.telefone || '')}</div>
      <Badge variant={cliente.ativo ? 'default' : 'secondary'}>
        {cliente.ativo ? 'Ativo' : 'Inativo'}
      </Badge>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debug - Busca por CPF/CNPJ</h1>
          <p className="text-muted-foreground">
            Teste as funcionalidades de busca por CPF/CNPJ implementadas
          </p>
        </div>

        {/* Teste de Busca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Teste de Busca por CPF/CNPJ</span>
            </CardTitle>
            <CardDescription>
              Digite um CPF ou CNPJ para testar as diferentes modalidades de busca
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Digite CPF ou CNPJ (com ou sem formatação)..."
                value={buscarCpf}
                onChange={(e) => setBuscarCpf(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => testeBuscarPorCpf(true)}
                disabled={loadingBusca || !buscarCpf.trim()}
                variant="default"
              >
                {loadingBusca ? 'Buscando...' : 'Busca Exata'}
              </Button>
              <Button 
                onClick={() => testeBuscarPorCpf(false)}
                disabled={loadingBusca || !buscarCpf.trim()}
                variant="outline"
              >
                {loadingBusca ? 'Buscando...' : 'Busca Flexível'}
              </Button>
              <Button 
                onClick={testeBuscaGeral}
                disabled={loadingBusca || !buscarCpf.trim()}
                variant="secondary"
              >
                {loadingBusca ? 'Buscando...' : 'Busca Geral'}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Busca Exata:</strong> Encontra o cliente com CPF/CNPJ exatamente igual</p>
              <p><strong>Busca Flexível:</strong> Encontra clientes com CPF/CNPJ que contenha o termo</p>
              <p><strong>Busca Geral:</strong> Busca em nome, email e documento simultaneamente</p>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultadoBusca && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Resultados da Busca
                <Badge variant={resultadoBusca.statusCode === 200 ? 'default' : 'destructive'}>
                  {resultadoBusca.statusCode}
                </Badge>
              </CardTitle>
              <CardDescription>
                Tipo de busca: <strong>{resultadoBusca.tipo}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultadoBusca.error ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive font-semibold">Erro:</p>
                  <p className="text-sm">{resultadoBusca.error}</p>
                  {resultadoBusca.details && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(resultadoBusca.details, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Busca Exata */}
                  {resultadoBusca.tipo === 'exata' && resultadoBusca.data && (
                    <div>
                      <h4 className="font-semibold mb-2">Cliente encontrado:</h4>
                      {renderCliente(resultadoBusca.data)}
                    </div>
                  )}

                  {/* Busca Flexível */}
                  {resultadoBusca.tipo === 'flexível' && resultadoBusca.data && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        {resultadoBusca.data.total} cliente(s) encontrado(s):
                      </h4>
                      <div className="space-y-2">
                        {resultadoBusca.data.clientes?.map(renderCliente)}
                      </div>
                    </div>
                  )}

                  {/* Busca Geral */}
                  {resultadoBusca.tipo === 'busca geral' && resultadoBusca.data && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        {resultadoBusca.data.length} cliente(s) encontrado(s):
                      </h4>
                      <div className="space-y-2">
                        {resultadoBusca.data?.map(renderCliente)}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <details className="space-y-2">
                    <summary className="cursor-pointer font-medium">
                      Ver resposta completa da API
                    </summary>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(resultadoBusca, null, 2)}
          </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documentação */}
        <Card>
          <CardHeader>
            <CardTitle>APIs Disponíveis para Busca por CPF/CNPJ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <code className="font-mono text-primary">GET /api/clientes/cpf?documento=12345678901&exato=true</code>
                <p className="mt-1 text-muted-foreground">Busca exata por CPF/CNPJ específico</p>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <code className="font-mono text-primary">GET /api/clientes/cpf?documento=123456789</code>
                <p className="mt-1 text-muted-foreground">Busca flexível (retorna múltiplos resultados)</p>
        </div>

              <div className="p-3 bg-muted rounded-lg">
                <code className="font-mono text-primary">GET /api/clientes?search=12345678901</code>
                <p className="mt-1 text-muted-foreground">Busca geral em nome, email e documento</p>
        </div>

              <div className="p-3 bg-muted rounded-lg">
                <code className="font-mono text-primary">GET /api/clientes/search?cpf_cnpj=12345678901</code>
                <p className="mt-1 text-muted-foreground">Busca para autocomplete específica por documento</p>
              </div>
        </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 