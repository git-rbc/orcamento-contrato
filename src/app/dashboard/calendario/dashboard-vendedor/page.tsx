'use client';

import { useState, useEffect } from 'react';
import { 
  Timer, 
  FileText, 
  TrendingUp, 
  Clock, 
  Users, 
  AlertTriangle,
  BarChart3,
  Target,
  RefreshCw,
  Trophy,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardVendedor } from '@/components/calendario/dashboard-vendedor';
import { useAuth } from '@/contexts/auth-context';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useFilaEspera } from '@/hooks/useFilaEspera';
import { toast } from 'sonner';
import { format, parseISO, differenceInHours, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReservaTemporaria, FilaEspera, DashboardMetrics } from '@/types/calendario';
import { calcularTempoMedioConversao, type ReservaMetrics } from '@/lib/utils/calendario-metrics';

export default function DashboardVendedorPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [reservasExpirando, setReservasExpirando] = useState<ReservaTemporaria[]>([]);
  const [minhasFilas, setMinhasFilas] = useState<FilaEspera[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const { user, userProfile } = useAuth();
  const { fetchReservasUsuario, converterParaProposta } = useReservasTemporarias();
  const { fetchFilasUsuario, sairDaFila } = useFilaEspera();

  const isVendedor = userProfile?.role === 'vendedor' || 
                    userProfile?.role_nome?.toLowerCase().includes('vendedor') ||
                    userProfile?.role_nome?.toLowerCase().includes('pré-vendedor');

  useEffect(() => {
    if (!user || !userProfile) {
      setLoading(false);
      return;
    }

    if (!isVendedor && !userProfile?.role_nome?.toLowerCase().includes('admin')) {
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [user, userProfile]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Carregar reservas do usuário
      const reservas = await fetchReservasUsuario();
      
      // Carregar filas do usuário
      const filas = await fetchFilasUsuario();
      
      // Filtrar reservas que estão expirando (próximas 6 horas)
      const agora = new Date();
      const expirando = reservas.filter(reserva => {
        if (reserva.status !== 'ativa') return false;
        const horasRestantes = differenceInHours(parseISO(reserva.expira_em), agora);
        return horasRestantes <= 6 && horasRestantes > 0;
      });

      // Calcular métricas
      const reservasAtivas = reservas.filter(r => r.status === 'ativa').length;
      const reservasConvertidas = reservas.filter(r => r.status === 'convertida').length;
      const taxaConversao = reservas.length > 0 ? (reservasConvertidas / reservas.length) * 100 : 0;
      
      // Converter reservas para o formato das métricas e calcular tempo médio
      const reservasMetrics: ReservaMetrics[] = reservas.map(r => ({
        id: r.id,
        status: r.status as any,
        created_at: r.created_at,
        converted_at: r.converted_at,
        usuario_id: r.usuario_id,
        espaco_evento_id: r.espaco_evento_id
      }));
      
      const tempoMedioConversao = calcularTempoMedioConversao(reservasMetrics);
      
      const dashboardMetrics: DashboardMetrics = {
        reservas_ativas: reservasAtivas,
        reservas_expirando: expirando.length,
        propostas_geradas: reservasConvertidas,
        taxa_conversao: Math.round(taxaConversao),
        tempo_medio_conversao: tempoMedioConversao,
        posicoes_fila: filas,
        historico_conversoes: []
      };

      setMetrics(dashboardMetrics);
      setReservasExpirando(expirando);
      setMinhasFilas(filas);

    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard atualizado');
  };

  const handleConverterProposta = async (reservaId: string) => {
    try {
      await converterParaProposta(reservaId);
      toast.success('Proposta gerada com sucesso!');
      await loadDashboardData();
    } catch (error) {
      toast.error('Erro ao gerar proposta');
    }
  };

  const handleSairFila = async (filaId: string) => {
    try {
      await sairDaFila(filaId);
      toast.success('Você saiu da fila de espera');
      await loadDashboardData();
    } catch (error) {
      toast.error('Erro ao sair da fila');
    }
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

  if (!isVendedor && !userProfile?.role_nome?.toLowerCase().includes('admin')) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Esta página é exclusiva para vendedores e pré-vendedores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Dashboard do Vendedor
          </h1>
          <p className="text-muted-foreground mt-1">
            Seu painel personalizado com métricas e alertas importantes
          </p>
          <p className="text-sm text-muted-foreground">
            Olá, <strong>{userProfile?.nome}</strong>! Aqui está um resumo da sua performance.
          </p>
        </div>
        
        <div className="flex gap-2">
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
          <p className="text-muted-foreground">Carregando seu dashboard...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="reservas">Reservas</TabsTrigger>
            <TabsTrigger value="filas">Filas de Espera</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Reservas Ativas</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {metrics?.reservas_ativas || 0}
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
                      <p className="text-sm text-muted-foreground">Expirando</p>
                      <p className="text-2xl font-bold text-red-600">
                        {metrics?.reservas_expirando || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Propostas Geradas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {metrics?.propostas_geradas || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {metrics?.taxa_conversao || 0}%
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxa de Conversão</span>
                    <span className="font-medium">{metrics?.taxa_conversao || 0}%</span>
                  </div>
                  <Progress 
                    value={metrics?.taxa_conversao || 0} 
                    className="w-full h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tempo Médio de Conversão</span>
                    <span className="font-medium">{metrics?.tempo_medio_conversao || 0}h</span>
                  </div>
                  <Progress 
                    value={((24 - (metrics?.tempo_medio_conversao || 0)) / 24) * 100} 
                    className="w-full h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Meta: converter em até 12 horas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservas" className="space-y-6">
            {/* Reservas Expirando */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Reservas Expirando (Próximas 6 horas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reservasExpirando.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma reserva expirando no momento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reservasExpirando.map((reserva) => {
                      const horasRestantes = differenceInHours(parseISO(reserva.expira_em), new Date());
                      return (
                        <div key={reserva.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-semibold">{reserva.espaco?.nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                              {' - '}
                              {reserva.hora_inicio} às {reserva.hora_fim}
                            </p>
                            <Badge variant="destructive" className="mt-1">
                              Expira em {horasRestantes}h
                            </Badge>
                          </div>
                          <Button
                            onClick={() => handleConverterProposta(reserva.id)}
                            size="sm"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar Proposta
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filas" className="space-y-6">
            {/* Minhas Filas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Minhas Posições na Fila ({minhasFilas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {minhasFilas.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Você não está em nenhuma fila de espera</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {minhasFilas.map((fila) => (
                      <div key={fila.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-full font-bold">
                            #{fila.posicao}
                          </div>
                          <div>
                            <h4 className="font-semibold">{fila.espaco?.nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(fila.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                              {' - '}
                              {fila.hora_inicio} às {fila.hora_fim}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Trophy className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium">{fila.pontuacao} pontos</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={fila.status === 'ativo' ? 'default' : 'secondary'}>
                            {fila.status === 'ativo' ? 'Ativo' : fila.status}
                          </Badge>
                          {fila.status === 'ativo' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSairFila(fila.id)}
                            >
                              Sair da Fila
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}