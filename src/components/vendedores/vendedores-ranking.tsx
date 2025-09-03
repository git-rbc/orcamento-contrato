'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Trophy, Medal, Award, Crown, TrendingUp, TrendingDown, 
  Users, Calendar, Target, DollarSign, Video, MapPin,
  RefreshCw, Filter, Zap, Star, Flame
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';

interface VendedorRanking {
  vendedor_id: string;
  vendedor_nome: string;
  vendedor_email: string;
  posicao: number;
  posicao_anterior?: number;
  total_reunioes: number;
  reunioes_convertidas: number;
  taxa_conversao: number;
  valor_estimado_total: number;
  valor_medio_por_reuniao: number;
  ranking_geral: number;
  ranking_online: number;
  ranking_presencial: number;
  ranking_10_dias: number;
  tendencia: 'up' | 'down' | 'stable';
  pontuacao_total: number;
}

interface VendedorPerformance {
  vendedor_id: string;
  vendedor_nome: string;
  performance_temporal: {
    data: string;
    reunioes: number;
    conversoes: number;
    valor_estimado: number;
    taxa_conversao: number;
  }[];
  metricas_comparativas: {
    reunioes_online: number;
    reunioes_presenciais: number;
    taxa_conversao_online: number;
    taxa_conversao_presencial: number;
    valor_medio_online: number;
    valor_medio_presencial: number;
  };
  evolucao_rankings: {
    data: string;
    ranking_geral: number;
    ranking_online: number;
    ranking_presencial: number;
    ranking_10_dias: number;
  }[];
}

type RankingType = 'geral' | 'online' | 'presencial' | '10_dias';

export function VendedoresRanking() {
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<VendedorRanking[]>([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('');
  const [performanceData, setPerformanceData] = useState<VendedorPerformance | null>(null);
  const [activeRanking, setActiveRanking] = useState<RankingType>('geral');
  const [periodo, setPeriodo] = useState('30d');
  const [localFiltro, setLocalFiltro] = useState<string>('todos');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRankings();
  }, [periodo, localFiltro, activeRanking]);

  useEffect(() => {
    if (vendedorSelecionado) {
      loadVendedorPerformance(vendedorSelecionado);
    }
  }, [vendedorSelecionado, periodo]);

  async function loadRankings() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        periodo,
        tipo: activeRanking,
        ...(localFiltro !== 'todos' && { local: localFiltro })
      });

      const response = await fetch(`/api/vendedores/ranking?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar rankings');

      const { data } = await response.json();
      setRankings(data || []);

      // Selecionar o primeiro vendedor se nenhum estiver selecionado
      if (!vendedorSelecionado && data && data.length > 0) {
        setVendedorSelecionado(data[0].vendedor_id);
      }
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar rankings dos vendedores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadVendedorPerformance(vendedorId: string) {
    try {
      const params = new URLSearchParams({ periodo });
      const response = await fetch(`/api/vendedores/performance/${vendedorId}?${params.toString()}`);
      
      if (!response.ok) throw new Error('Erro ao carregar performance');

      const { data } = await response.json();
      setPerformanceData(data);
    } catch (error) {
      console.error('Erro ao carregar performance:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de performance do vendedor',
        variant: 'destructive'
      });
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadRankings();
    if (vendedorSelecionado) {
      await loadVendedorPerformance(vendedorSelecionado);
    }
    setRefreshing(false);
    
    toast({
      title: 'Atualizado',
      description: 'Rankings atualizados com sucesso'
    });
  }

  function getRankingIcon(posicao: number, tipo: RankingType) {
    if (posicao === 1) {
      switch (tipo) {
        case 'geral': return <Crown className="h-5 w-5 text-yellow-500" />;
        case 'online': return <Video className="h-5 w-5 text-blue-500" />;
        case 'presencial': return <MapPin className="h-5 w-5 text-green-500" />;
        case '10_dias': return <Zap className="h-5 w-5 text-purple-500" />;
      }
    }
    if (posicao === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (posicao === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <Trophy className="h-4 w-4 text-muted-foreground" />;
  }

  function getTendenciaIcon(tendencia: 'up' | 'down' | 'stable') {
    switch (tendencia) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function getRankingColor(tipo: RankingType) {
    switch (tipo) {
      case 'geral': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'online': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      case 'presencial': return 'bg-gradient-to-r from-green-400 to-green-600';
      case '10_dias': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
  }

  if (loading && rankings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Ranking de Vendedores
          </h1>
          <p className="text-muted-foreground">
            Performance e classificação dos vendedores
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={localFiltro} onValueChange={setLocalFiltro}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os locais</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs dos Rankings */}
      <Tabs value={activeRanking} onValueChange={(value) => setActiveRanking(value as RankingType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Online
          </TabsTrigger>
          <TabsTrigger value="presencial" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Presencial
          </TabsTrigger>
          <TabsTrigger value="10_dias" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            10 Dias
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeRanking} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Ranking */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getRankingIcon(1, activeRanking)}
                    Ranking {activeRanking === '10_dias' ? 'Últimos 10 Dias' : 
                              activeRanking.charAt(0).toUpperCase() + activeRanking.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankings.map((vendedor) => (
                      <div 
                        key={vendedor.vendedor_id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          vendedorSelecionado === vendedor.vendedor_id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setVendedorSelecionado(vendedor.vendedor_id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {/* Badge de posição */}
                            <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${getRankingColor(activeRanking)} flex items-center justify-center text-white text-xs font-bold`}>
                              {vendedor.posicao}
                            </div>
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{vendedor.vendedor_nome.split(' ').map(n => n[0]).join('').substring(0, 2)}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {vendedor.vendedor_nome}
                              {vendedor.posicao <= 3 && getRankingIcon(vendedor.posicao, activeRanking)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {vendedor.total_reunioes} reuniões • {vendedor.reunioes_convertidas} conversões
                              {getTendenciaIcon(vendedor.tendencia)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatPercent(vendedor.taxa_conversao)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(vendedor.valor_estimado_total)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 3 Destaque */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pódio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rankings.slice(0, 3).map((vendedor, index) => (
                    <div key={vendedor.vendedor_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0">
                        {getRankingIcon(index + 1, activeRanking)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {vendedor.vendedor_nome}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatPercent(vendedor.taxa_conversao)} • {vendedor.total_reunioes} reuniões
                        </div>
                        <Progress 
                          value={vendedor.taxa_conversao} 
                          className="h-2 mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Estatísticas Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de Vendedores</span>
                    <Badge variant="secondary">{rankings.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Média de Conversão</span>
                    <span className="text-sm font-medium">
                      {formatPercent(rankings.reduce((acc, v) => acc + v.taxa_conversao, 0) / rankings.length || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Reuniões</span>
                    <span className="text-sm font-medium">
                      {rankings.reduce((acc, v) => acc + v.total_reunioes, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Total</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(rankings.reduce((acc, v) => acc + v.valor_estimado_total, 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance do Vendedor Selecionado */}
          {vendedorSelecionado && performanceData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Performance Temporal */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Performance de {performanceData.vendedor_nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData.performance_temporal}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="data"
                        tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="reunioes" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Reuniões"
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="conversoes" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Conversões"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="taxa_conversao" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        name="Taxa Conversão %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Comparativo Online vs Presencial */}
              <Card>
                <CardHeader>
                  <CardTitle>Online vs Presencial</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      {
                        tipo: 'Online',
                        reunioes: performanceData.metricas_comparativas.reunioes_online,
                        taxa_conversao: performanceData.metricas_comparativas.taxa_conversao_online,
                        valor_medio: performanceData.metricas_comparativas.valor_medio_online
                      },
                      {
                        tipo: 'Presencial',
                        reunioes: performanceData.metricas_comparativas.reunioes_presenciais,
                        taxa_conversao: performanceData.metricas_comparativas.taxa_conversao_presencial,
                        valor_medio: performanceData.metricas_comparativas.valor_medio_presencial
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="reunioes" fill="#8884d8" name="Reuniões" />
                      <Bar yAxisId="right" dataKey="taxa_conversao" fill="#82ca9d" name="Taxa Conversão %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Evolução de Rankings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução dos Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData.evolucao_rankings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="data"
                        tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                      />
                      <YAxis domain={[1, 'dataMax']} />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="ranking_geral" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        name="Geral"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ranking_online" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Online"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ranking_presencial" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Presencial"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ranking_10_dias" 
                        stroke="#ff7300" 
                        strokeWidth={2}
                        name="10 Dias"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}