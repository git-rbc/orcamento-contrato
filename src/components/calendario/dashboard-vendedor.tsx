'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, subDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Timer, 
  FileText, 
  TrendingUp, 
  Clock, 
  Users, 
  AlertTriangle,
  BarChart3,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useFilaEspera } from '@/hooks/useFilaEspera';
import { createClient } from '@/lib/supabase';
import type { DashboardMetrics, ReservaTemporaria, FilaEspera } from '@/types/calendario';

interface DashboardVendedorProps {
  className?: string;
}

export function DashboardVendedor({ className }: DashboardVendedorProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [reservasExpirando, setReservasExpirando] = useState<ReservaTemporaria[]>([]);
  const [minhasFilas, setMinhasFilas] = useState<FilaEspera[]>([]);
  const [loading, setLoading] = useState(true);

  const { fetchReservasUsuario } = useReservasTemporarias();
  const { fetchFilasUsuario } = useFilaEspera();
  const supabase = createClient();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([
        carregarMetricas(),
        carregarReservasExpirando(),
        carregarMinhasFilas()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarMetricas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Período de análise: últimos 30 dias
      const dataInicio = subDays(new Date(), 30);

      // Reservas ativas
      const { data: reservasAtivas } = await supabase
        .from('reservas_temporarias')
        .select('id')
        .eq('vendedor_id', user.id)
        .eq('status', 'ativa');

      // Propostas geradas (últimos 30 dias)
      const { data: propostas } = await supabase
        .from('propostas')
        .select('id')
        .eq('vendedor_id', user.id)
        .gte('created_at', dataInicio.toISOString());

      // Histórico de conversões
      const { data: conversoes } = await supabase
        .from('historico_conversoes')
        .select('*')
        .eq('vendedor_id', user.id)
        .gte('created_at', dataInicio.toISOString());

      // Reservas temporárias do período
      const { data: reservasTemp } = await supabase
        .from('reservas_temporarias')
        .select('id, expira_em, status')
        .eq('vendedor_id', user.id)
        .gte('created_at', dataInicio.toISOString());

      // Calcular métricas
      const totalReservas = reservasTemp?.length || 0;
      const totalConversoes = conversoes?.length || 0;
      const taxaConversao = totalReservas > 0 ? (totalConversoes / totalReservas) * 100 : 0;

      const tempoMedioConversao = conversoes?.length ? 
        conversoes.reduce((acc, conv) => acc + conv.tempo_conversao_horas, 0) / conversoes.length : 0;

      // Reservas expirando (próximas 6 horas)
      const agora = new Date();
      const limite = new Date(agora.getTime() + 6 * 60 * 60 * 1000);
      const reservasExpirando = reservasTemp?.filter(r => 
        r.status === 'ativa' && 
        parseISO(r.expira_em) <= limite
      ).length || 0;

      const metricas: DashboardMetrics = {
        reservas_ativas: reservasAtivas?.length || 0,
        reservas_expirando: reservasExpirando,
        propostas_geradas: propostas?.length || 0,
        taxa_conversao: taxaConversao,
        tempo_medio_conversao: tempoMedioConversao,
        posicoes_fila: [],
        historico_conversoes: conversoes || []
      };

      setMetrics(metricas);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  const carregarReservasExpirando = async () => {
    try {
      const reservas = await fetchReservasUsuario();
      const agora = new Date();
      const limite = new Date(agora.getTime() + 6 * 60 * 60 * 1000);
      
      const expirando = reservas.filter(r => 
        r.status === 'ativa' && 
        parseISO(r.expira_em) <= limite
      );

      setReservasExpirando(expirando);
    } catch (error) {
      console.error('Erro ao carregar reservas expirando:', error);
    }
  };

  const carregarMinhasFilas = async () => {
    try {
      const filas = await fetchFilasUsuario();
      setMinhasFilas(filas);
    } catch (error) {
      console.error('Erro ao carregar filas:', error);
    }
  };

  const getTimeLeftString = (expiresAt: string) => {
    const now = new Date();
    const expires = parseISO(expiresAt);
    const hoursLeft = differenceInHours(expires, now);
    const minutesLeft = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60)) % 60;

    if (hoursLeft < 0) return 'Expirada';
    if (hoursLeft === 0) return `${minutesLeft}m`;
    return `${hoursLeft}h ${minutesLeft}m`;
  };

  const getTaxaConversaoColor = (taxa: number) => {
    if (taxa >= 70) return 'text-green-600';
    if (taxa >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Skeleton do dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Ativas</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.reservas_ativas || 0}</div>
            <p className="text-xs text-muted-foreground">
              Reservas temporárias em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirando Hoje</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.reservas_expirando || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Próximas 6 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Geradas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.propostas_geradas || 0}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getTaxaConversaoColor(metrics?.taxa_conversao || 0))}>
              {(metrics?.taxa_conversao || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas expirando */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Reservas Prestes a Expirar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reservasExpirando.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma reserva expirando</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservasExpirando.map((reserva) => {
                  const timeLeft = getTimeLeftString(reserva.expira_em);
                  const hoursLeft = differenceInHours(parseISO(reserva.expira_em), new Date());
                  
                  return (
                    <div key={reserva.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{reserva.espaco?.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(reserva.data_inicio), 'dd/MM', { locale: ptBR })} •{' '}
                          {reserva.hora_inicio}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          hoursLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        )}
                      >
                        {timeLeft}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posições em filas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Minhas Posições em Filas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {minhasFilas.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Você não está em nenhuma fila</p>
              </div>
            ) : (
              <div className="space-y-3">
                {minhasFilas.map((fila) => (
                  <div key={fila.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fila.espaco?.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(fila.data_inicio), 'dd/MM', { locale: ptBR })} •{' '}
                        {fila.hora_inicio}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {fila.posicao}º lugar
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {fila.pontuacao} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumo de Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Conversão</span>
                <span className={getTaxaConversaoColor(metrics?.taxa_conversao || 0)}>
                  {(metrics?.taxa_conversao || 0).toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics?.taxa_conversao || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">Meta: 60%</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tempo Médio Conversão</span>
                <span>{(metrics?.tempo_medio_conversao || 0).toFixed(1)}h</span>
              </div>
              <Progress 
                value={Math.min(100, ((48 - (metrics?.tempo_medio_conversao || 48)) / 48) * 100)} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">Meta: &lt; 24h</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reservas Ativas</span>
                <span>{metrics?.reservas_ativas || 0}</span>
              </div>
              <Progress 
                value={Math.min(100, ((metrics?.reservas_ativas || 0) / 5) * 100)} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">Limite: 5 simultâneas</p>
            </div>
          </div>

          <Separator />

          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Dados dos últimos 30 dias
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}