'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Timer, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  FileText,
  Trophy,
  Clock,
  Target,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useFilaEspera } from '@/hooks/useFilaEspera';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReservaTemporaria, FilaEspera, EspacoEvento } from '@/types/calendario';
import { 
  calcularTempoMedioConversao, 
  calcularTaxaConversao, 
  calcularMetricasVendedores, 
  calcularMetricasEspacos,
  calcularEstatisticasBasicas,
  type ReservaMetrics
} from '@/lib/utils/calendario-metrics';

interface MetricasGerais {
  total_reservas_temporarias: number;
  reservas_ativas: number;
  reservas_expiradas: number;
  reservas_convertidas: number;
  taxa_conversao_geral: number;
  tempo_medio_conversao: number;
  total_vendedores_ativos: number;
  total_filas_ativas: number;
  espacos_mais_procurados: Array<{
    espaco_id: string;
    espaco_nome: string;
    total_reservas: number;
    taxa_conversao: number;
  }>;
  vendedores_top: Array<{
    vendedor_id: string;
    vendedor_nome: string;
    total_reservas: number;
    total_conversoes: number;
    taxa_conversao: number;
    tempo_medio: number;
  }>;
}

export default function MetricasPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metricas, setMetricas] = useState<MetricasGerais | null>(null);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d' | 'mes'>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { user, userProfile } = useAuth();
  const { fetchTodasReservas } = useReservasTemporarias();
  const { fetchTodasFilas } = useFilaEspera();
  const { espacos, fetchEspacos } = useEspacosEventos();

  const isAdminOrSuperAdmin = userProfile?.role_nome?.toLowerCase().includes('admin') || 
                              userProfile?.role === 'admin';

  const supabase = createClient();

  useEffect(() => {
    if (!user || !userProfile) {
      setLoading(false);
      return;
    }

    if (!isAdminOrSuperAdmin) {
      setLoading(false);
      return;
    }

    loadMetricas();
  }, [user, userProfile, periodo]);

  const getDateRange = () => {
    const hoje = new Date();
    switch (periodo) {
      case '7d':
        return { inicio: subDays(hoje, 7), fim: hoje };
      case '30d':
        return { inicio: subDays(hoje, 30), fim: hoje };
      case '90d':
        return { inicio: subDays(hoje, 90), fim: hoje };
      case 'mes':
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
      default:
        return { inicio: subDays(hoje, 30), fim: hoje };
    }
  };

  const loadMetricas = async () => {
    if (!isAdminOrSuperAdmin) return;

    try {
      setLoading(true);
      const { inicio, fim } = getDateRange();

      // Buscar todas as reservas temporárias do período
      const reservas = await fetchTodasReservas();
      const reservasPeriodo = reservas.filter(r => {
        const createdAt = new Date(r.created_at);
        return createdAt >= inicio && createdAt <= fim;
      });

      // Buscar todas as filas
      const filas = await fetchTodasFilas();
      const filasAtivas = filas.filter(f => f.status === 'ativo');

      // Usar espaços do estado (já carregados pelo hook)
      if (!espacos || espacos.length === 0) {
        await fetchEspacos(); // Recarrega se necessário
      }

      // Converter reservas para o formato das métricas
      const reservasMetrics: ReservaMetrics[] = reservasPeriodo.map(r => ({
        id: r.id,
        status: r.status as any,
        created_at: r.created_at,
        converted_at: r.converted_at,
        usuario_id: r.usuario_id,
        espaco_evento_id: r.espaco_evento_id
      }));

      // Calcular métricas básicas usando utilitários
      const estatisticas = calcularEstatisticasBasicas(reservasMetrics);
      const taxaConversaoGeral = calcularTaxaConversao(reservasMetrics);

      // Buscar vendedores únicos
      const { data: vendedores, error: vendedoresError } = await supabase
        .from('profiles')
        .select('id, nome')
        .neq('role', 'admin');

      if (vendedoresError) {
        console.error('Erro ao buscar vendedores:', vendedoresError);
      }

      const vendedoresAtivos = new Set(reservasPeriodo.map(r => r.usuario_id)).size;

      // Calcular espaços mais procurados usando utilitário
      const espacosMaisProcurados = calcularMetricasEspacos(
        reservasMetrics, 
        espacos || []
      ).slice(0, 5);

      // Calcular vendedores top usando utilitário
      const vendedoresTop = calcularMetricasVendedores(
        reservasMetrics, 
        vendedores || []
      ).slice(0, 5);

      const metricasCalculadas: MetricasGerais = {
        total_reservas_temporarias: estatisticas.total,
        reservas_ativas: estatisticas.ativas,
        reservas_expiradas: estatisticas.expiradas,
        reservas_convertidas: estatisticas.convertidas,
        taxa_conversao_geral: Math.round(taxaConversaoGeral),
        tempo_medio_conversao: calcularTempoMedioConversao(reservasMetrics),
        total_vendedores_ativos: vendedoresAtivos,
        total_filas_ativas: filasAtivas.length,
        espacos_mais_procurados: espacosMaisProcurados,
        vendedores_top: vendedoresTop
      };

      setMetricas(metricasCalculadas);

    } catch (error) {
      toast.error('Erro ao carregar métricas');
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetricas();
    setRefreshing(false);
    toast.success('Métricas atualizadas');
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Você precisa estar logado para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdminOrSuperAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Esta página é exclusiva para Administradores e Super Administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Métricas e Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise completa de performance e conversões do sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={(value: any) => setPeriodo(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Reservas</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {metricas?.total_reservas_temporarias || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Timer className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                      <p className="text-2xl font-bold text-green-600">
                        {metricas?.taxa_conversao_geral || 0}%
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Vendedores Ativos</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {metricas?.total_vendedores_ativos || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Filas Ativas</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {metricas?.total_filas_ativas || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Activity className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribuição de Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">Ativas</p>
                    <p className="text-xl font-bold text-blue-600">
                      {metricas?.reservas_ativas || 0}
                    </p>
                  </div>
                  <Progress 
                    value={metricas?.total_reservas_temporarias ? 
                      (metricas.reservas_ativas / metricas.total_reservas_temporarias) * 100 : 0
                    } 
                    className="w-full h-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">Convertidas</p>
                    <p className="text-xl font-bold text-green-600">
                      {metricas?.reservas_convertidas || 0}
                    </p>
                  </div>
                  <Progress 
                    value={metricas?.total_reservas_temporarias ? 
                      (metricas.reservas_convertidas / metricas.total_reservas_temporarias) * 100 : 0
                    } 
                    className="w-full h-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">Expiradas</p>
                    <p className="text-xl font-bold text-red-600">
                      {metricas?.reservas_expiradas || 0}
                    </p>
                  </div>
                  <Progress 
                    value={metricas?.total_reservas_temporarias ? 
                      (metricas.reservas_expiradas / metricas.total_reservas_temporarias) * 100 : 0
                    } 
                    className="w-full h-2"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance Geral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Indicadores de Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Conversão Global</span>
                        <span className="font-medium">{metricas?.taxa_conversao_geral || 0}%</span>
                      </div>
                      <Progress 
                        value={metricas?.taxa_conversao_geral || 0} 
                        className="w-full h-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Meta: 60%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Tempo Médio de Conversão</span>
                        <span className="font-medium">{metricas?.tempo_medio_conversao || 0}h</span>
                      </div>
                      <Progress 
                        value={metricas?.tempo_medio_conversao ? 
                          ((24 - metricas.tempo_medio_conversao) / 24) * 100 : 0
                        } 
                        className="w-full h-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Meta: converter em até 12 horas
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {metricas?.tempo_medio_conversao || 0}h
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tempo médio para converter
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Espaços */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Espaços Mais Procurados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metricas?.espacos_mais_procurados?.map((espaco, index) => (
                      <div key={espaco.espaco_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold">{espaco.espaco_nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              {espaco.total_reservas} reservas
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {Math.round(espaco.taxa_conversao)}% conversão
                        </Badge>
                      </div>
                    )) || (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum dado disponível para o período selecionado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Vendedores */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Vendedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metricas?.vendedores_top?.map((vendedor, index) => (
                      <div key={vendedor.vendedor_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold">{vendedor.vendedor_nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              {vendedor.total_reservas} reservas • {vendedor.total_conversoes} conversões
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {Math.round(vendedor.taxa_conversao)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(vendedor.tempo_medio)}h médio
                          </p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum dado disponível para o período selecionado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}