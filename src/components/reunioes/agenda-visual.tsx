'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, 
  RefreshCw, Users, MapPin, Video, Clock, User, Eye,
  Grid3X3, List, Building, Palette
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
         isSameDay, parseISO, startOfDay, endOfDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { useLocaisAtendimento } from '@/hooks/useLocaisAtendimento';

interface AgendaReuniao {
  id: string;
  titulo: string;
  cliente_nome: string;
  vendedor_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  local_atendimento: string;
  local_atendimento_nome: string;
  local_atendimento_cor: string;
  espaco_nome?: string;
  tipo_reuniao_nome: string;
  tipo_reuniao_cor: string;
  link_reuniao?: string;
  confirmada_cliente: boolean;
  confirmada_vendedor: boolean;
}

interface LocalAtendimento {
  id: string;
  nome: string;
  codigo: string;
  cor: string;
  tipo: 'virtual' | 'presencial' | 'treinamento';
  cidade?: string;
  ativo: boolean;
}

interface AgendaData {
  reunioes: AgendaReuniao[];
  estatisticas: {
    total_reunioes: number;
    por_status: Record<string, number>;
    por_local: Record<string, number>;
    por_vendedor: Record<string, number>;
  };
}

type ViewMode = 'calendario' | 'vendedor' | 'local' | 'status';
type CalendarView = 'month' | 'week';

export function AgendaVisual() {
  const { locaisAtivos: locaisAtendimento } = useLocaisAtendimento();
  const [loading, setLoading] = useState(true);
  const [agendaData, setAgendaData] = useState<AgendaData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendario');
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [selectedReuniao, setSelectedReuniao] = useState<AgendaReuniao | null>(null);
  const [showReuniao, setShowReuniao] = useState(false);
  
  // Filtros
  const [filtroLocal, setFiltroLocal] = useState<string>('todos');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [showFiltros, setShowFiltros] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgendaData();
  }, [currentDate, calendarView]);

  useEffect(() => {
    if (agendaData) {
      loadAgendaData(); // Recarregar quando filtros mudarem
    }
  }, [filtroLocal, filtroVendedor, filtroStatus]);

  async function loadAgendaData() {
    try {
      setLoading(true);
      
      const startDate = calendarView === 'month' 
        ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
        : startOfWeek(currentDate, { weekStartsOn: 0 });
        
      const endDate = calendarView === 'month'
        ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
        : endOfWeek(currentDate, { weekStartsOn: 0 });

      const params = new URLSearchParams({
        data_inicio: format(startDate, 'yyyy-MM-dd'),
        data_fim: format(endDate, 'yyyy-MM-dd'),
        tipo: viewMode,
        ...(filtroLocal !== 'todos' && { local: filtroLocal }),
        ...(filtroVendedor !== 'todos' && { vendedor_id: filtroVendedor }),
        ...(filtroStatus !== 'todos' && { status: filtroStatus })
      });

      const response = await fetch(`/api/reunioes/agenda-visual?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404 || errorData.message?.includes('Nenhuma reunião')) {
          setAgendaData({
            reunioes: [],
            estatisticas: {
              total_reunioes: 0,
              por_status: {},
              por_local: {},
              por_vendedor: {}
            }
          }); // Estrutura vazia quando não há dados
          return;
        }
        throw new Error('Erro ao carregar agenda');
      }

      const { data } = await response.json();
      setAgendaData(data || []);
    } catch (error) {
      console.error('Erro ao carregar agenda:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da agenda',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }


  async function handleRefresh() {
    setRefreshing(true);
    await loadAgendaData();
    setRefreshing(false);
    
    toast({
      title: 'Atualizado',
      description: 'Agenda atualizada com sucesso'
    });
  }

  // Filtrar reuniões baseado nos filtros ativos
  const reunioesFiltradas = useMemo(() => {
    if (!agendaData) return [];
    
    return agendaData.reunioes.filter(reuniao => {
      if (filtroLocal !== 'todos' && reuniao.local_atendimento !== filtroLocal) return false;
      if (filtroVendedor !== 'todos' && reuniao.vendedor_nome !== filtroVendedor) return false;
      if (filtroStatus !== 'todos' && reuniao.status !== filtroStatus) return false;
      return true;
    });
  }, [agendaData, filtroLocal, filtroVendedor, filtroStatus]);

  // Agrupar reuniões por data para o calendário
  const reunioesPorData = useMemo(() => {
    const grupos: Record<string, AgendaReuniao[]> = {};
    
    reunioesFiltradas.forEach(reuniao => {
      const dataKey = format(parseISO(reuniao.data), 'yyyy-MM-dd');
      if (!grupos[dataKey]) {
        grupos[dataKey] = [];
      }
      grupos[dataKey].push(reuniao);
    });

    // Ordenar reuniões por horário dentro de cada data
    Object.keys(grupos).forEach(data => {
      grupos[data].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    });

    return grupos;
  }, [reunioesFiltradas]);

  // Obter dias do calendário (mês ou semana)
  const calendarDays = useMemo(() => {
    if (calendarView === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      const days = [];
      let current = start;
      
      while (current <= end) {
        days.push(current);
        current = addDays(current, 1);
      }
      return days;
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const days = [];
      
      for (let i = 0; i < 7; i++) {
        days.push(addDays(start, i));
      }
      return days;
    }
  }, [currentDate, calendarView]);

  // Navegação do calendário
  function navigateCalendar(direction: 'prev' | 'next') {
    if (calendarView === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
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
      case 'sem_resposta': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'confirmada': return 'Confirmada';
      case 'agendada': return 'Agendada';
      case 'em_andamento': return 'Em Andamento';
      case 'concluida': return 'Concluída';
      case 'cancelada': return 'Cancelada';
      case 'reagendada': return 'Reagendada';
      case 'sem_resposta': return 'Sem Resposta';
      default: return 'Desconhecido';
    }
  }

  if (loading && !agendaData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando agenda...</p>
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
            <CalendarIcon className="h-6 w-6" />
            Agenda Visual
          </h1>
          <p className="text-muted-foreground">
            Visualização com sistema de cores por local
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFiltros(!showFiltros)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
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

      {/* Filtros */}
      {showFiltros && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros da Agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Local de Atendimento</Label>
                <Select value={filtroLocal} onValueChange={setFiltroLocal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os locais</SelectItem>
                    {locaisAtendimento.map((local) => (
                      <SelectItem key={local.id} value={local.codigo}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: local.cor }}
                          />
                          {local.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vendedor</Label>
                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {agendaData && [...new Set(agendaData.reunioes.map(r => r.vendedor_nome))].map((vendedor) => (
                      <SelectItem key={vendedor} value={vendedor}>
                        {vendedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="reagendada">Reagendada</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFiltroLocal('todos');
                    setFiltroVendedor('todos');
                    setFiltroStatus('todos');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legenda de Cores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Legenda dos Locais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {locaisAtendimento.map((local) => (
              <div key={local.id} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border" 
                  style={{ backgroundColor: local.cor }}
                />
                <span className="text-sm font-medium">{local.nome}</span>
                <Badge variant="outline" className="text-xs">
                  {agendaData?.estatisticas.por_local[local.codigo] || 0}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Visualização */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="vendedor" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Por Vendedor
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Por Local
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Por Status
          </TabsTrigger>
        </TabsList>

        {/* Tab: Calendário */}
        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {format(currentDate, calendarView === 'month' ? 'MMMM yyyy' : "'Semana de' dd 'de' MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={calendarView} onValueChange={(value) => setCalendarView(value as CalendarView)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mês</SelectItem>
                      <SelectItem value="week">Semana</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => navigateCalendar('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" onClick={() => navigateCalendar('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`grid ${calendarView === 'month' ? 'grid-cols-7' : 'grid-cols-7'} gap-2`}>
                {/* Headers dos dias */}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
                    {day}
                  </div>
                ))}
                
                {/* Dias do calendário */}
                {calendarDays.map((day) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const reunioesDay = reunioesPorData[dayKey] || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={dayKey}
                      className={`p-2 border rounded-lg min-h-24 ${
                        isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                      } ${isToday ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1 mt-1">
                        {reunioesDay.slice(0, 3).map((reuniao) => (
                          <div
                            key={reuniao.id}
                            className="text-xs p-1 rounded cursor-pointer hover:opacity-80 text-white truncate"
                            style={{ backgroundColor: reuniao.local_atendimento_cor }}
                            onClick={() => {
                              setSelectedReuniao(reuniao);
                              setShowReuniao(true);
                            }}
                            title={`${reuniao.hora_inicio} - ${reuniao.cliente_nome} (${reuniao.local_atendimento_nome})`}
                          >
                            {reuniao.hora_inicio} {reuniao.cliente_nome}
                          </div>
                        ))}
                        {reunioesDay.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{reunioesDay.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Vendedor */}
        <TabsContent value="vendedor" className="space-y-4">
          {agendaData && agendaData.estatisticas.por_vendedor && Object.entries(agendaData.estatisticas.por_vendedor).map(([vendedor, count]) => {
            const reunioesVendedor = reunioesFiltradas.filter(r => r.vendedor_nome === vendedor);
            
            return (
              <Card key={vendedor}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {vendedor}
                    </div>
                    <Badge>{count} reuniões</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reunioesVendedor.map((reuniao) => (
                      <div
                        key={reuniao.id}
                        className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                        style={{ borderLeftColor: reuniao.local_atendimento_cor, borderLeftWidth: '4px' }}
                        onClick={() => {
                          setSelectedReuniao(reuniao);
                          setShowReuniao(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-medium">{reuniao.cliente_nome}</div>
                          <Badge className={`${getStatusColor(reuniao.status)} text-white text-xs`}>
                            {getStatusLabel(reuniao.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(parseISO(reuniao.data), 'dd/MM/yyyy', { locale: ptBR })} às {reuniao.hora_inicio}
                          </div>
                          <div className="flex items-center gap-1">
                            {reuniao.link_reuniao ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {reuniao.local_atendimento_nome}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab: Por Local */}
        <TabsContent value="local" className="space-y-4">
          {locaisAtendimento.map((local) => {
            const reunioesLocal = reunioesFiltradas.filter(r => r.local_atendimento === local.codigo);
            
            if (reunioesLocal.length === 0) return null;

            return (
              <Card key={local.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: local.cor }}
                      />
                      {local.nome}
                      {local.cidade && (
                        <span className="text-sm text-muted-foreground">- {local.cidade}</span>
                      )}
                    </div>
                    <Badge>{reunioesLocal.length} reuniões</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reunioesLocal.map((reuniao) => (
                      <div
                        key={reuniao.id}
                        className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedReuniao(reuniao);
                          setShowReuniao(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-medium">{reuniao.cliente_nome}</div>
                          <Badge className={`${getStatusColor(reuniao.status)} text-white text-xs`}>
                            {getStatusLabel(reuniao.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(parseISO(reuniao.data), 'dd/MM/yyyy', { locale: ptBR })} às {reuniao.hora_inicio}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {reuniao.vendedor_nome}
                          </div>
                          {reuniao.espaco_nome && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {reuniao.espaco_nome}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab: Por Status */}
        <TabsContent value="status" className="space-y-4">
          {Object.entries(agendaData?.estatisticas.por_status || {}).map(([status, count]) => {
            const reunioesStatus = reunioesFiltradas.filter(r => r.status === status);
            
            if (reunioesStatus.length === 0) return null;

            return (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`} />
                      {getStatusLabel(status)}
                    </div>
                    <Badge>{count} reuniões</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reunioesStatus.map((reuniao) => (
                      <div
                        key={reuniao.id}
                        className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                        style={{ borderLeftColor: reuniao.local_atendimento_cor, borderLeftWidth: '4px' }}
                        onClick={() => {
                          setSelectedReuniao(reuniao);
                          setShowReuniao(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-medium">{reuniao.cliente_nome}</div>
                          <div className="flex items-center gap-1">
                            {reuniao.confirmada_cliente && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" title="Cliente confirmou" />
                            )}
                            {reuniao.confirmada_vendedor && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" title="Vendedor confirmou" />
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(parseISO(reuniao.data), 'dd/MM/yyyy', { locale: ptBR })} às {reuniao.hora_inicio}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {reuniao.vendedor_nome}
                          </div>
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: reuniao.local_atendimento_cor }}
                            />
                            {reuniao.local_atendimento_nome}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes da Reunião */}
      <Dialog open={showReuniao} onOpenChange={setShowReuniao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes da Reunião
            </DialogTitle>
          </DialogHeader>
          {selectedReuniao && (
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg text-white"
                style={{ backgroundColor: selectedReuniao.local_atendimento_cor }}
              >
                <div className="font-medium">{selectedReuniao.titulo}</div>
                <div className="text-sm opacity-90">{selectedReuniao.local_atendimento_nome}</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedReuniao.cliente_nome}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Vendedor:</span>
                  <span className="font-medium">{selectedReuniao.vendedor_nome}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedReuniao.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Horário:</span>
                  <span className="font-medium">
                    {selectedReuniao.hora_inicio} às {selectedReuniao.hora_fim}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={`${getStatusColor(selectedReuniao.status)} text-white`}>
                    {getStatusLabel(selectedReuniao.status)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <Badge variant="outline" style={{ borderColor: selectedReuniao.tipo_reuniao_cor }}>
                    {selectedReuniao.tipo_reuniao_nome}
                  </Badge>
                </div>
                {selectedReuniao.espaco_nome && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Espaço:</span>
                    <span className="font-medium">{selectedReuniao.espaco_nome}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Confirmações:</span>
                  <div className="flex gap-2">
                    {selectedReuniao.confirmada_cliente && (
                      <Badge variant="outline" className="text-xs">Cliente ✓</Badge>
                    )}
                    {selectedReuniao.confirmada_vendedor && (
                      <Badge variant="outline" className="text-xs">Vendedor ✓</Badge>
                    )}
                  </div>
                </div>
              </div>

              {selectedReuniao.link_reuniao && (
                <Button asChild className="w-full">
                  <a href={selectedReuniao.link_reuniao} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Entrar na Reunião
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}