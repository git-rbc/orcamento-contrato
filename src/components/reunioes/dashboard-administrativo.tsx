'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Users, TrendingUp, Clock, CheckCircle, 
  XCircle, AlertCircle, BarChart3, Filter, Download,
  RefreshCw, Eye, MessageSquare
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReunioes } from '@/hooks/useReunioes';

interface DashboardStats {
  total: number;
  estatisticas: {
    [key: string]: number;
  };
  dashboard: {
    mes: string;
    vendedor_id: string;
    vendedor_nome: string;
    total_reunioes: number;
    reunioes_agendadas: number;
    reunioes_confirmadas: number;
    reunioes_concluidas: number;
    reunioes_canceladas: number;
    reunioes_sem_comparecimento: number;
    taxa_conclusao_pct: number;
    tempo_medio_minutos: number;
  }[];
  tipos: {
    nome: string;
    cor: string;
    total: number;
  }[];
  periodo: {
    data_inicio?: string;
    data_fim?: string;
  };
}

interface DashboardFilters {
  vendedorId?: string;
  dataInicio: string;
  dataFim: string;
}

export function DashboardAdministrativo() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    dataInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dataFim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const { fetchStats } = useReunioes();

  useEffect(() => {
    loadVendedores();
    loadStats();
  }, []);

  useEffect(() => {
    loadStats();
  }, [filters]);

  async function loadVendedores() {
    try {
      const response = await fetch('/api/vendedores');
      const { data } = await response.json();
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const data = await fetchStats(filters);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'confirmada': return 'bg-green-500';
      case 'agendada': return 'bg-blue-500';
      case 'em_andamento': return 'bg-yellow-500';
      case 'concluida': return 'bg-purple-500';
      case 'cancelada': return 'bg-red-500';
      case 'reagendada': return 'bg-orange-500';
      case 'nao_compareceu': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'confirmada': return 'Confirmadas';
      case 'agendada': return 'Agendadas';
      case 'em_andamento': return 'Em Andamento';
      case 'concluida': return 'Concluídas';
      case 'cancelada': return 'Canceladas';
      case 'reagendada': return 'Reagendadas';
      case 'nao_compareceu': return 'Não Compareceu';
      default: return 'Outras';
    }
  }

  function setMesAnterior() {
    const inicio = subMonths(new Date(filters.dataInicio), 1);
    setFilters({
      ...filters,
      dataInicio: format(startOfMonth(inicio), 'yyyy-MM-dd'),
      dataFim: format(endOfMonth(inicio), 'yyyy-MM-dd')
    });
  }

  function setProximoMes() {
    const inicio = addMonths(new Date(filters.dataInicio), 1);
    setFilters({
      ...filters,
      dataInicio: format(startOfMonth(inicio), 'yyyy-MM-dd'),
      dataFim: format(endOfMonth(inicio), 'yyyy-MM-dd')
    });
  }

  function setMesAtual() {
    setFilters({
      ...filters,
      dataInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      dataFim: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });
  }

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Reuniões</h1>
          <p className="text-muted-foreground">
            Métricas e estatísticas do sistema de agendamento
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadStats}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Período</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setMesAnterior}
                >
                  ←
                </Button>
                <Button
                  variant={filters.dataInicio === format(startOfMonth(new Date()), 'yyyy-MM-dd') ? "default" : "outline"}
                  size="sm"
                  onClick={setMesAtual}
                  className="flex-1"
                >
                  Atual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setProximoMes}
                >
                  →
                </Button>
              </div>
            </div>
            
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Vendedor</Label>
              <Select 
                value={filters.vendedorId || 'todos'}
                onValueChange={(value) => setFilters({ ...filters, vendedorId: value === 'todos' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os vendedores</SelectItem>
                  {vendedores.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Período selecionado: {format(new Date(filters.dataInicio), 'dd/MM/yyyy')} a {format(new Date(filters.dataFim), 'dd/MM/yyyy')}
          </div>
        </CardContent>
      </Card>

      {stats && (
        <>
          {/* Métricas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Reuniões
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxa de Conclusão
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total > 0 
                    ? Math.round((stats.estatisticas.concluida || 0) / stats.total * 100)
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.estatisticas.concluida || 0} de {stats.total} reuniões
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Reuniões Confirmadas
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.estatisticas.confirmada || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirmadas por ambas as partes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cancelamentos
                </CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.estatisticas.cancelada || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 
                    ? Math.round((stats.estatisticas.cancelada || 0) / stats.total * 100)
                    : 0
                  }% do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status das Reuniões */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Status das Reuniões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.estatisticas).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
                        />
                        <span className="text-sm">{getStatusLabel(status)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.total > 0 ? Math.round(count / stats.total * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tipos de Reunião */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Tipos de Reunião
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.tipos.length > 0 ? (
                  <div className="space-y-3">
                    {stats.tipos
                      .sort((a, b) => b.total - a.total)
                      .map((tipo) => (
                      <div key={tipo.nome} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tipo.cor }}
                          />
                          <span className="text-sm">{tipo.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tipo.total}</span>
                          <span className="text-xs text-muted-foreground">
                            ({stats.total > 0 ? Math.round(tipo.total / stats.total * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma reunião encontrada no período
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance por Vendedor */}
          {stats.dashboard.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.dashboard
                    .sort((a, b) => b.total_reunioes - a.total_reunioes)
                    .map((vendedor) => (
                    <div key={vendedor.vendedor_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{vendedor.vendedor_nome}</h3>
                          <p className="text-sm text-muted-foreground">
                            {vendedor.total_reunioes} reuniões no período
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-sm">
                            {vendedor.taxa_conclusao_pct}% conclusão
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            ~{vendedor.tempo_medio_minutos}min por reunião
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-blue-600">
                            {vendedor.reunioes_agendadas}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Agendadas
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium text-green-600">
                            {vendedor.reunioes_confirmadas}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Confirmadas
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium text-purple-600">
                            {vendedor.reunioes_concluidas}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Concluídas
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium text-red-600">
                            {vendedor.reunioes_canceladas}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Canceladas
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium text-gray-600">
                            {vendedor.reunioes_sem_comparecimento}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Sem Comparecimento
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Insights e Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.estatisticas.nao_compareceu > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      {stats.estatisticas.nao_compareceu} reuniões sem comparecimento. 
                      Considere implementar lembretes automáticos.
                    </span>
                  </div>
                )}
                
                {stats.estatisticas.cancelada > stats.estatisticas.concluida && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700">
                      Mais reuniões canceladas do que concluídas. 
                      Verifique a qualidade dos leads e processo de qualificação.
                    </span>
                  </div>
                )}
                
                {stats.dashboard.some(v => v.taxa_conclusao_pct < 50) && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      Alguns vendedores têm baixa taxa de conclusão. 
                      Considere treinamentos focados em conversão.
                    </span>
                  </div>
                )}
                
                {stats.total > 0 && stats.estatisticas.confirmada / stats.total > 0.8 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      Excelente taxa de confirmação! Processo de agendamento funcionando bem.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}