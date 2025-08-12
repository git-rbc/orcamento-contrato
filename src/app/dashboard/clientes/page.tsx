'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Mail, Building, BarChart3, UserCheck, Activity, TrendingUp, Edit, CreditCard, FileText, Filter, UserX } from 'lucide-react';
import { Cliente, PaginatedResponse, ClienteFilters } from '@/types/database';
import { formatCPFCNPJ, formatPhone } from '@/lib/utils';
import { ClienteActions } from '@/components/clientes/cliente-actions';
import { ClienteForm } from '@/components/clientes/cliente-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useClientes, useClientesStats } from '@/hooks/useClientes';
import { usePerformanceMetrics, logPerformanceReport } from '@/lib/performance-monitor';

export default function ClientesPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [tipoStatus, setTipoStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [tipoPessoa, setTipoPessoa] = useState<'todos' | 'pessoa_fisica' | 'empresa'>('todos');
  const [page, setPage] = useState(1);
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [limit, setLimit] = useState(10);

  // Performance metrics hook
  const { getReport } = usePerformanceMetrics();

  // Preparar filtros otimizados
  const filters = useMemo((): ClienteFilters => {
    const baseFilters: ClienteFilters = {};
    
    if (busca.trim()) {
      baseFilters.nome = busca.trim();
    }
    
    if (tipoStatus !== 'todos') {
      baseFilters.ativo = tipoStatus === 'ativos';
    }
    
    if (tipoPessoa !== 'todos') {
      baseFilters.tipo_pessoa = tipoPessoa;
    }
    
    return baseFilters;
  }, [busca, tipoStatus, tipoPessoa]);

  // Usar hooks otimizados
  const { 
    data: clientesData, 
    isLoading: isLoadingClientes, 
    error: errorClientes 
  } = useClientes(filters, page, limit);

  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useClientesStats();

  // Função para detectar se o termo de busca parece ser um CPF/CNPJ
  const isCpfCnpjSearch = (term: string) => {
    const cleanTerm = term.replace(/\D/g, '');
    return cleanTerm.length >= 8; // Se tem 8+ dígitos, provavelmente é documento
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleTipoChange = (novoTipo: 'todos' | 'pessoa_fisica' | 'empresa') => {
    setTipoPessoa(novoTipo);
    setPage(1);
  };

  const handleStatusChange = (novoStatus: 'todos' | 'ativo' | 'inativo') => {
    setTipoStatus(novoStatus === 'ativo' ? 'ativos' : 'inativos');
    setPage(1);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset page to 1 when limit changes
  };

  // Função para obter label do filtro de tipo
  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pessoa_fisica': return 'Pessoa Física';
      case 'empresa': return 'Empresa';
      default: return 'Todos os tipos';
    }
  };

  // Função para obter label do filtro de status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Apenas Ativos';
      case 'inativo': return 'Apenas Inativos';
      default: return 'Todos os Status';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    router.replace('/login');
    return null;
  }

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      render: (value: any, cliente: any) => {
        if (!cliente) return <div>-</div>;
        return (
          <div className="flex items-center">
            <Badge variant="outline" className="font-mono text-xs">
              {cliente.codigo || '-'}
            </Badge>
          </div>
        );
      }
    },
    {
      key: 'nome',
      header: 'Cliente',
      render: (value: any, cliente: any) => {
        if (!cliente) return <div>-</div>;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{cliente.nome || '-'}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatCPFCNPJ(cliente.cpf_cnpj)}</span>
              {cliente.cpf_cnpj?.replace(/\D/g, '').length === 11 ? (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  PF
                </Badge>
              ) : cliente.cpf_cnpj?.replace(/\D/g, '').length === 14 ? (
                <Badge variant="outline" className="text-xs">
                  <Building className="w-3 h-3 mr-1" />
                  PJ
                </Badge>
              ) : null}
            </div>
          </div>
        );
      }
    },
    {
      key: 'contato',
      header: 'Contato',
      render: (value: any, cliente: any) => {
        if (!cliente) return <div>-</div>;
        return (
          <div className="flex flex-col text-sm">
            {cliente.email && (
              <span className="text-muted-foreground">{cliente.email}</span>
            )}
            {cliente.telefone && (
              <span className="text-muted-foreground">{formatPhone(cliente.telefone)}</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'localizacao',
      header: 'Localização',
      render: (value: any, cliente: any) => {
        if (!cliente) return <div>-</div>;
        return (
          <div className="flex flex-col text-sm">
            {cliente.cidade && (
              <span>{cliente.cidade}</span>
            )}
            {cliente.estado && (
              <span className="text-muted-foreground">{cliente.estado}</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, cliente: any) => {
        if (!cliente) return <div>-</div>;
        return (
          <Badge 
            variant={cliente.ativo ? "default" : "secondary"}
            className={cliente.ativo 
              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
              : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
            }
          >
            {cliente.ativo ? (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <UserX className="w-3 h-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
        );
      }
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (value: any, cliente: any) => {
        if (!cliente) return <div>-</div>;
        return (
          <ClienteActions 
            cliente={cliente}
            onSuccess={() => {
              // O React Query vai invalidar automaticamente as queries
            }}
          />
        );
      }
    }
  ];

  // Estados de carregamento e erro
  if (errorClientes) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Erro ao carregar clientes: {errorClientes.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug: Log do relatório de performance (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    // Debug básico dos dados de clientes
    if (clientesData?.data && clientesData.data.length > 0) {
      console.log('📊 Clientes carregados:', clientesData.data.length);
    }
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus clientes e mantenha suas informações atualizadas
            </p>
          </div>
          <Dialog open={isNovoClienteOpen} onOpenChange={setIsNovoClienteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <ClienteForm
                mode="create"
                onSuccess={() => {
                  setIsNovoClienteOpen(false);
                  // React Query invalidará automaticamente as queries
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-6 w-12 rounded"></div>
                ) : (
                  stats?.total ?? 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-6 w-12 rounded"></div>
                ) : (
                  stats?.ativos ?? 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pessoas Físicas</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-6 w-12 rounded"></div>
                ) : (
                  stats?.pessoas_fisicas ?? 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Building className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-6 w-12 rounded"></div>
                ) : (
                  stats?.empresas ?? 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Contratos</CardTitle>
              <UserCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-6 w-12 rounded"></div>
                ) : (
                  stats?.comContratos ?? 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros de Busca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros</span>
            </CardTitle>
            <CardDescription>
              Use os filtros abaixo para encontrar clientes específicos.
              {isCpfCnpjSearch(busca) && (
                <span className="block mt-1 text-primary font-medium">
                  🔍 Buscando por documento (CPF/CNPJ)
                </span>
              )}
              {tipoPessoa !== 'todos' && (
                <span className="block mt-1 text-primary font-medium">
                  📋 Filtrando por: {getTipoLabel(tipoPessoa)}
                </span>
              )}
              {tipoStatus !== 'todos' && (
                <span className="block mt-1 text-primary font-medium">
                  🎯 Status: {getStatusLabel(tipoStatus === 'ativos' ? 'ativo' : 'inativo')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome, CPF/CNPJ..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={tipoStatus} onValueChange={(value: any) => setTipoStatus(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativos">Apenas Ativos</SelectItem>
                    <SelectItem value="inativos">Apenas Inativos</SelectItem>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={tipoPessoa} onValueChange={(value: any) => setTipoPessoa(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo de Pessoa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabela de Clientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>
                  {clientesData?.total ? (
                    `${clientesData.total} cliente${clientesData.total !== 1 ? 's' : ''} encontrado${clientesData.total !== 1 ? 's' : ''}`
                  ) : (
                    'Carregando clientes...'
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={clientesData?.data?.filter(Boolean) || []}
              columns={columns}
              pagination={{
                page,
                limit,
                total: clientesData?.total || 0,
                totalPages: clientesData?.totalPages || 0,
                onPageChange: handlePageChange,
                onLimitChange: handleLimitChange,
              }}
              loading={isLoadingClientes}
              emptyMessage={
                Object.keys(filters).length > 0 
                  ? `Nenhum cliente encontrado com os filtros aplicados.${
                      tipoStatus === 'ativos' ? ' Tente incluir clientes inativos.' : ''
                    }` 
                  : 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.'
              }
            />
          </CardContent>
        </Card>
      </div>
  );
} 