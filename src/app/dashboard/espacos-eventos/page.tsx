'use client';

import { useState, useMemo } from 'react';
import { useEspacosEventos, useEspacosEventosStats } from '@/hooks/useEspacosEventos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { EspacoEventoActions } from '@/components/espacos-eventos/espaco-evento-actions';
import { 
  Building2, 
  Users, 
  MapPin, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Sparkles,
  Music,
  Baby,
  Layers
} from 'lucide-react';
import Link from 'next/link';

export default function EspacosEventosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCidade, setSelectedCidade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Memoizar filtros para evitar re-criação a cada render
  const filters = useMemo(() => ({
    nome: searchTerm || undefined,
    cidade: selectedCidade && selectedCidade !== 'all' ? selectedCidade : undefined,
    ativo: selectedStatus === 'ativo' ? true : selectedStatus === 'inativo' ? false : undefined,
    page: currentPage,
    limit: 10
  }), [searchTerm, selectedCidade, selectedStatus, currentPage]);

  const { espacos, paginationInfo, loading, refetch } = useEspacosEventos(filters);

  const { stats, loading: statsLoading } = useEspacosEventosStats();

  // Extrair cidades únicas para o filtro
  const cidades = Array.from(new Set(espacos.map(e => e.cidade))).sort();

  const columns = [
    {
      key: 'nome',
      header: 'Nome do Espaço',
      render: (_value: any, espaco: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{espaco.nome}</span>
          {espaco.descricao && (
            <span className="text-sm text-muted-foreground truncate max-w-xs">
              {espaco.descricao}
            </span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'cidade',
      header: 'Cidade',
      render: (_value: any, espaco: any) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{espaco.cidade}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'layouts',
      header: 'Layouts',
      render: (_value: any, espaco: any) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {espaco.layouts?.length || 0} configurações
            </span>
          </div>
          {espaco.layouts && espaco.layouts.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Balada: {espaco.layouts.find((l: any) => l.layout === 'ESTILO_BALADA')?.capacidade || '-'}
              {espaco.layouts.find((l: any) => l.layout === 'AUDITORIO') && 
                ` • Auditório: ${espaco.layouts.find((l: any) => l.layout === 'AUDITORIO')?.capacidade}`
              }
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'ativo',
      header: 'Status',
      render: (_value: any, espaco: any) => (
        <Badge variant={espaco.ativo ? 'default' : 'secondary'}>
          {espaco.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (_value: any, espaco: any) => (
        <EspacoEventoActions espaco={espaco} onUpdate={refetch} />
      ),
    },
  ];

  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCidade('all');
    setSelectedStatus('all');
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Espaços para Eventos</h1>
          <p className="text-muted-foreground">
            Gerencie os espaços e ambientes disponíveis para eventos
          </p>
        </div>
        <Link href="/dashboard/espacos-eventos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Espaço
          </Button>
        </Link>
      </div>

      {/* Cards de Estatísticas */}
      {!statsLoading && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Espaços</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_espacos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.espacos_ativos} ativos, {stats.espacos_inativos} inativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cidades</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_cidades}</div>
              <p className="text-xs text-muted-foreground">
                Distribuídos em {stats.total_cidades} cidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maior Capacidade</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maior_capacidade}</div>
              <p className="text-xs text-muted-foreground">
                Menor: {stats.menor_capacidade} pessoas
              </p>
            </CardContent>
          </Card>


        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar espaços específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Buscar por nome
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do espaço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="text-sm font-medium mb-2 block">
                Cidade
              </label>
              <Select value={selectedCidade} onValueChange={setSelectedCidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cidades.map((cidade) => (
                    <SelectItem key={cidade} value={cidade}>
                      {cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-32">
              <label className="text-sm font-medium mb-2 block">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Espaços</CardTitle>
          <CardDescription>
            {paginationInfo.total} espaços encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={espacos}
            loading={loading}
            pagination={{
              page: currentPage,
              limit: paginationInfo.limit,
              total: paginationInfo.total,
              totalPages: paginationInfo.totalPages,
              onPageChange: setCurrentPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
} 