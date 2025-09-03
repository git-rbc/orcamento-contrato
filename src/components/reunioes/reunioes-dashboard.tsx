'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, 
  Target, Award, MessageCircle, RefreshCw, Filter,
  Facebook, Chrome, User, ExternalLink
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  estatisticas_gerais: {
    total_reunioes: number;
    reunioes_hoje: number;
    reunioes_confirmadas: number;
    reunioes_canceladas: number;
    taxa_conversao: number;
    valor_estimado_total: number;
  };
  por_origem: {
    origem: 'facebook' | 'google' | 'indicacao' | 'outro';
    total_reunioes: number;
    taxa_conversao: number;
    valor_estimado_medio: number;
    roi_estimado: number;
  }[];
  por_campanha: {
    campanha: string;
    origem: string;
    reunioes: number;
    conversoes: number;
    taxa_conversao: number;
    valor_estimado: number;
    roi: number;
  }[];
  top_vendedores: {
    vendedor_nome: string;
    total_reunioes: number;
    reunioes_convertidas: number;
    taxa_conversao: number;
    valor_estimado_total: number;
  }[];
  grafico_temporal: {
    data: string;
    reunioes: number;
    conversoes: number;
    valor_estimado: number;
  }[];
  funil_conversao: {
    etapa: string;
    quantidade: number;
    porcentagem: number;
  }[];
}

interface ReunioesOrigemData {
  conversao_por_origem: {
    origem: string;
    total_leads: number;
    reunioes_agendadas: number;
    conversoes: number;
    taxa_conversao_leads: number;
    taxa_conversao_reunioes: number;
    roi_estimado: number;
  }[];
  efetividade_campanhas: {
    campanha: string;
    origem: string;
    leads_gerados: number;
    reunioes: number;
    propostas: number;
    contratos: number;
    roi: number;
    custo_por_lead?: number;
  }[];
}

export function ReunioesDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [origemData, setOrigemData] = useState<ReunioesOrigemData | null>(null);
  const [periodo, setPeriodo] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadOrigemData();
  }, [periodo]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const response = await fetch(`/api/reunioes/dashboard?periodo=${periodo}`);
      const { data } = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrigemData() {
    try {
      const response = await fetch(`/api/reunioes/origem?periodo=${periodo}`);
      const { data } = await response.json();
      setOrigemData(data);
    } catch (error) {
      console.error('Erro ao carregar dados de origem:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadOrigemData()]);
    setRefreshing(false);
  }

  function getOrigemIcon(origem: string) {
    switch (origem) {
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'google': return <Chrome className="h-4 w-4" />;
      case 'indicacao': return <User className="h-4 w-4" />;
      default: return <ExternalLink className="h-4 w-4" />;
    }
  }

  function getOrigemColor(origem: string) {
    switch (origem) {
      case 'facebook': return '#1877F2';
      case 'google': return '#4285F4';
      case 'indicacao': return '#10B981';
      case 'outro': return '#6B7280';
      default: return '#8B5CF6';
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData || !origemData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Erro ao carregar dados do dashboard</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Reuniões</h1>
          <p className="text-muted-foreground">
            Análise completa de performance e conversão
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

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.estatisticas_gerais.total_reunioes}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.estatisticas_gerais.reunioes_hoje} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(dashboardData.estatisticas_gerais.taxa_conversao)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.estatisticas_gerais.reunioes_confirmadas} confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.estatisticas_gerais.valor_estimado_total)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em oportunidades ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboardData.estatisticas_gerais.reunioes_canceladas}
            </div>
            <p className="text-xs text-muted-foreground">
              Reuniões canceladas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="conversao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversao">Conversão por Origem</TabsTrigger>
          <TabsTrigger value="campanhas">Performance Campanhas</TabsTrigger>
          <TabsTrigger value="vendedores">Top Vendedores</TabsTrigger>
          <TabsTrigger value="temporal">Análise Temporal</TabsTrigger>
        </TabsList>

        {/* Tab: Conversão por Origem */}
        <TabsContent value="conversao" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza - Reuniões por Origem */}
            <Card>
              <CardHeader>
                <CardTitle>Reuniões por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.por_origem}
                      dataKey="total_reunioes"
                      nameKey="origem"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.origem}: ${entry.total_reunioes}`}
                    >
                      {dashboardData.por_origem.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getOrigemColor(entry.origem)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Taxa de Conversão por Origem */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conversão por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={origemData.conversao_por_origem}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="origem" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'taxa_conversao_reunioes' ? formatPercent(value) : value,
                        name === 'taxa_conversao_reunioes' ? 'Taxa de Conversão' : 'Reuniões'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="reunioes_agendadas" fill="#8884d8" name="Reuniões" />
                    <Bar dataKey="taxa_conversao_reunioes" fill="#82ca9d" name="Taxa de Conversão %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela detalhada por origem */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Detalhada por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {origemData.conversao_por_origem.map((origem) => (
                  <div key={origem.origem} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getOrigemIcon(origem.origem)}
                      <div>
                        <div className="font-medium capitalize">{origem.origem}</div>
                        <div className="text-sm text-muted-foreground">
                          {origem.total_leads} leads → {origem.reunioes_agendadas} reuniões
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-sm font-medium">
                          {formatPercent(origem.taxa_conversao_reunioes)}
                        </div>
                        <div className="text-xs text-muted-foreground">Taxa Conversão</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {formatCurrency(origem.roi_estimado)}
                        </div>
                        <div className="text-xs text-muted-foreground">ROI Estimado</div>
                      </div>
                      <Badge 
                        variant={origem.taxa_conversao_reunioes > 20 ? "default" : 
                                origem.taxa_conversao_reunioes > 10 ? "secondary" : "destructive"}
                      >
                        {origem.conversoes} conversões
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Performance de Campanhas */}
        <TabsContent value="campanhas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Efetividade de Campanhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {origemData.efetividade_campanhas.map((campanha, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getOrigemIcon(campanha.origem)}
                      <div>
                        <div className="font-medium">{campanha.campanha || 'Campanha sem nome'}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {campanha.origem} • {campanha.leads_gerados} leads gerados
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-sm font-medium">{campanha.reunioes}</div>
                        <div className="text-xs text-muted-foreground">Reuniões</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{campanha.propostas}</div>
                        <div className="text-xs text-muted-foreground">Propostas</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{campanha.contratos}</div>
                        <div className="text-xs text-muted-foreground">Contratos</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(campanha.roi)}
                        </div>
                        <div className="text-xs text-muted-foreground">ROI</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Top Vendedores */}
        <TabsContent value="vendedores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.top_vendedores.map((vendedor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{vendedor.vendedor_nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {vendedor.total_reunioes} reuniões realizadas
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-sm font-medium">
                          {formatPercent(vendedor.taxa_conversao)}
                        </div>
                        <div className="text-xs text-muted-foreground">Taxa Conversão</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {vendedor.reunioes_convertidas}
                        </div>
                        <div className="text-xs text-muted-foreground">Conversões</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(vendedor.valor_estimado_total)}
                        </div>
                        <div className="text-xs text-muted-foreground">Valor Estimado</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análise Temporal */}
        <TabsContent value="temporal" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de linha - Reuniões vs Conversões */}
            <Card>
              <CardHeader>
                <CardTitle>Reuniões vs Conversões</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.grafico_temporal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="reunioes" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Reuniões"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversoes" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Conversões"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de área - Valor Estimado */}
            <Card>
              <CardHeader>
                <CardTitle>Valor Estimado ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData.grafico_temporal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data"
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                      formatter={(value: any) => [formatCurrency(value), 'Valor Estimado']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="valor_estimado" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Funil de Conversão */}
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.funil_conversao.map((etapa, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 text-right text-sm font-medium">
                      {etapa.etapa}
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted rounded-full h-6 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${etapa.porcentagem}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium w-16">
                      {etapa.quantidade}
                    </div>
                    <div className="text-sm text-muted-foreground w-12">
                      {formatPercent(etapa.porcentagem)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}