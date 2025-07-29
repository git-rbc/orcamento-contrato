'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Package, 
  DollarSign, 
  Box, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Filter,
  Tag,
  Percent,
  Upload,
  Building
} from 'lucide-react';
import { Produto, CategoriaProduto, PaginatedResponse } from '@/types/database';
import { toast } from 'sonner';
import { ProdutoActions } from '@/components/produtos/produto-actions';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

export default function ProdutosPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'Ativo' | 'Inativo'>('Ativo');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchProdutos = async (page = 1, limit = pageSize, search = '', categoria = categoriaFiltro, status = statusFiltro) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search
      });

      // Adicionar filtros
      if (categoria !== 'todos') {
        params.append('categoria', categoria);
      }

      if (status !== 'todos') {
        params.append('status', status);
      }

      const response = await fetch(`/api/produtos?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data: PaginatedResponse<Produto> = await response.json();
      setProdutos(data.data);
      setTotalPages(data.totalPages);
      setTotalProdutos(data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/produtos/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/produtos/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    fetchProdutos();
    fetchCategorias();
    fetchStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProdutos(1, pageSize, searchTerm, categoriaFiltro, statusFiltro);
  };

  const handleCategoriaChange = (novaCategoria: string) => {
    setCategoriaFiltro(novaCategoria);
    fetchProdutos(1, pageSize, searchTerm, novaCategoria, statusFiltro);
  };

  const handleStatusChange = (novoStatus: 'todos' | 'Ativo' | 'Inativo') => {
    setStatusFiltro(novoStatus);
    fetchProdutos(1, pageSize, searchTerm, categoriaFiltro, novoStatus);
  };

  const handlePageChange = (page: number) => {
    fetchProdutos(page, pageSize, searchTerm, categoriaFiltro, statusFiltro);
  };

  const handleLimitChange = (newLimit: number) => {
    setPageSize(newLimit);
    fetchProdutos(1, newLimit, searchTerm, categoriaFiltro, statusFiltro);
  };

  // Função para formatar valor em reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
      key: 'codigo' as keyof Produto,
      header: 'Código',
      sortable: true,
      render: (value: any, produto: Produto) => (
        <div className="font-mono text-sm font-medium">
          {produto.codigo}
        </div>
      )
    },
    {
      key: 'nome' as keyof Produto,
      header: 'Produto',
      sortable: true,
      render: (value: any, produto: Produto) => (
        <div>
          <div className="font-medium">{produto.nome}</div>
          {produto.descricao && (
            <div className="text-sm text-muted-foreground line-clamp-1">{produto.descricao}</div>
          )}
        </div>
      )
    },
    {
      key: 'categoria_nome' as keyof Produto,
      header: 'Categoria',
      sortable: true,
      render: (value: any, produto: Produto) => (
        <Badge variant="outline" className="font-normal">
          <Tag className="h-3 w-3 mr-1" />
          {produto.categoria_nome}
        </Badge>
      )
    },
    {
      key: 'valor' as keyof Produto,
      header: 'Valor',
      sortable: true,
      render: (value: any, produto: Produto) => (
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{formatCurrency(produto.valor)}</span>
        </div>
      )
    },
    {
      key: 'desconto_percentual',
      header: 'Desconto Máx.',
      sortable: true,
      render: (_: any, produto: Produto) => (
        <div className="flex items-center space-x-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <span>
            {produto.desconto_percentual && produto.desconto_percentual > 0
              ? `${produto.desconto_percentual}%`
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'status' as keyof Produto,
      header: 'Status',
      sortable: true,
      render: (value: any, produto: Produto) => (
        <Badge 
          variant={produto.status === 'Ativo' ? 'default' : 'secondary'} 
          className={produto.status === 'Ativo'
            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100' 
            : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
          }
        >
          {produto.status}
        </Badge>
      )
    },
    {
      key: 'acoes',
      header: 'Ações',
      sortable: false,
      render: (value: any, produto: Produto) => (
        <ProdutoActions 
          produto={produto} 
          onUpdate={() => {
            fetchProdutos(currentPage, pageSize, searchTerm, categoriaFiltro, statusFiltro);
            fetchStats();
          }} 
        />
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie o catálogo de produtos e serviços oferecidos
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/produtos/importar">
                <Upload className="mr-2 h-4 w-4" />
                Importar Planilha
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/produtos/categorias">
                <Tag className="mr-2 h-4 w-4" />
                Gerenciar Categorias
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/produtos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Link>
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.ativos} ativos, {stats.inativos} inativos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Com Taxa</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.comTaxa}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.semTaxa} sem taxa
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorias.length}</div>
                <p className="text-xs text-muted-foreground">
                  Categorias ativas
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros de Busca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros</span>
            </CardTitle>
            <CardDescription>
              Use os filtros abaixo para encontrar produtos específicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Buscar por código, nome ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="w-48">
                  <Select value={categoriaFiltro} onValueChange={handleCategoriaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as categorias</SelectItem>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select value={statusFiltro} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Apenas Ativos</SelectItem>
                      <SelectItem value="Inativo">Apenas Inativos</SelectItem>
                      <SelectItem value="todos">Todos os Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" variant="outline" className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>Buscar</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabela de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <CardDescription>
              {totalProdutos} produto{totalProdutos !== 1 ? 's' : ''} encontrado{totalProdutos !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={produtos}
              columns={columns}
              loading={isLoading}
              pagination={{
                page: currentPage,
                limit: pageSize,
                total: totalProdutos,
                totalPages: totalPages,
                onPageChange: handlePageChange,
                onLimitChange: handleLimitChange,
              }}
              emptyMessage="Nenhum produto encontrado"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 