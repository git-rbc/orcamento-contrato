'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, 
  RefreshCw, Users, MapPin, Video, Clock, User, Eye,
  Grid3X3, List, Building, Palette, CheckCircle, XCircle,
  AlertTriangle, MessageSquare, Mail, Phone, Plus,
  Timer, Star, Hash, Hourglass, CalendarDays, Save
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
         isSameDay, parseISO, startOfDay, endOfDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { useLocaisAtendimento } from '@/hooks/useLocaisAtendimento';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GradeAgendamento } from './grade-agendamento';

// Interfaces expandidas para incluir todos os tipos de eventos
interface EventoIntegrado {
  id: string;
  tipo_evento: 'reuniao' | 'reserva_temporaria' | 'fila_espera';
  titulo: string;
  cliente_nome: string;
  vendedor_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  local_atendimento: string;
  local_nome: string;
  cor_local: string;
  cidade?: string;
  espaco_nome?: string;
  tipo_reuniao_nome?: string;
  tipo_reuniao_cor?: string;
  link_reuniao?: string;
  confirmada_cliente: boolean;
  confirmada_vendedor: boolean;
  lembrete_enviado: boolean;
  descricao?: string;
  // Campos específicos
  expira_em?: string; // Para reservas temporárias
  horas_ate_expirar?: number;
  pontuacao_fila?: number; // Para fila de espera  
  prioridade_fila?: number;
  precisa_confirmacao_cliente: boolean;
  precisa_confirmacao_vendedor: boolean;
}

interface EstatisticasIntegradas {
  total_reunioes: number;
  total_reservas_temp: number;
  total_fila_espera: number;
  confirmacoes_pendentes: number;
  reservas_expirando: number;
  fila_alta_prioridade: number;
  taxa_ocupacao: number;
  por_status: Record<string, number>;
  por_local: Record<string, number>;
  por_vendedor: Record<string, number>;
}

interface AgendaIntegradaData {
  eventos: EventoIntegrado[];
  estatisticas: EstatisticasIntegradas;
}

type ViewMode = 'grade' | 'planilha' | 'calendario' | 'lista';
type CalendarView = 'month' | 'week';

export function AgendaIntegrada() {
  const { locaisAtivos: locaisAtendimento } = useLocaisAtendimento();
  const [loading, setLoading] = useState(true);
  const [agendaData, setAgendaData] = useState<AgendaIntegradaData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('grade');
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [selectedEvento, setSelectedEvento] = useState<EventoIntegrado | null>(null);
  const [showEvento, setShowEvento] = useState(false);
  
  // Filtros
  const [filtroLocal, setFiltroLocal] = useState<string>('todos');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string>('todos');
  const [filtroCidade, setFiltroCidade] = useState<string>('todas');
  const [showFiltros, setShowFiltros] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para ações rápidas
  const [showConfirmacaoDialog, setShowConfirmacaoDialog] = useState(false);
  const [showConversaoDialog, setShowConversaoDialog] = useState(false);
  
  // Estados para criação de eventos
  const [showCriarEvento, setShowCriarEvento] = useState(false);
  const [tipoEventoCriar, setTipoEventoCriar] = useState<'reuniao' | 'reserva_temporaria' | 'fila_espera'>('reuniao');
  const [slotSelecionado, setSlotSelecionado] = useState<{data: string, hora: string, vendedor?: string} | null>(null);
  const [dadosNovoEvento, setDadosNovoEvento] = useState({
    cliente_nome: '',
    vendedor_id: '',
    data: '',
    hora_inicio: '',
    hora_fim: '',
    local_atendimento: 'presencial',
    observacoes: ''
  });

  useEffect(() => {
    loadAgendaData();
  }, [currentDate, calendarView]);

  useEffect(() => {
    if (agendaData) {
      loadAgendaData(); // Recarregar quando filtros mudarem
    }
  }, [filtroLocal, filtroVendedor, filtroStatus, filtroTipoEvento, filtroCidade]);

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
        ...(filtroLocal !== 'todos' && { local: filtroLocal }),
        ...(filtroVendedor !== 'todos' && { vendedor_id: filtroVendedor }),
        ...(filtroStatus !== 'todos' && { status: filtroStatus }),
        ...(filtroTipoEvento !== 'todos' && { tipo_evento: filtroTipoEvento }),
        ...(filtroCidade !== 'todas' && { cidade: filtroCidade })
      });

      const response = await fetch(`/api/agendamento/agenda-integrada?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404 || errorData.message?.includes('Nenhum evento')) {
          setAgendaData({
            eventos: [],
            estatisticas: {
              total_reunioes: 0,
              total_reservas_temp: 0,
              total_fila_espera: 0,
              confirmacoes_pendentes: 0,
              reservas_expirando: 0,
              fila_alta_prioridade: 0,
              taxa_ocupacao: 0,
              por_status: {},
              por_local: {},
              por_vendedor: {}
            }
          });
          return;
        }
        throw new Error('Erro ao carregar agenda integrada');
      }

      const data = await response.json();
      setAgendaData(data);
    } catch (error) {
      console.error('Erro ao carregar agenda integrada:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da agenda integrada',
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
      description: 'Agenda integrada atualizada com sucesso'
    });
  }

  // Filtrar eventos baseado nos filtros ativos
  const eventosFiltrados = useMemo(() => {
    if (!agendaData) return [];
    
    return agendaData.eventos.filter(evento => {
      if (filtroLocal !== 'todos' && evento.local_atendimento !== filtroLocal) return false;
      if (filtroVendedor !== 'todos' && evento.vendedor_nome !== filtroVendedor) return false;
      if (filtroStatus !== 'todos' && evento.status !== filtroStatus) return false;
      if (filtroTipoEvento !== 'todos' && evento.tipo_evento !== filtroTipoEvento) return false;
      return true;
    });
  }, [agendaData, filtroLocal, filtroVendedor, filtroStatus, filtroTipoEvento]);

  // Agrupar eventos por data para o calendário
  const eventosPorData = useMemo(() => {
    const grupos: Record<string, EventoIntegrado[]> = {};
    
    eventosFiltrados.forEach(evento => {
      const dataKey = format(parseISO(evento.data), 'yyyy-MM-dd');
      if (!grupos[dataKey]) {
        grupos[dataKey] = [];
      }
      grupos[dataKey].push(evento);
    });

    // Ordenar eventos por horário e prioridade
    Object.keys(grupos).forEach(data => {
      grupos[data].sort((a, b) => {
        // Primeiro por tipo (reuniao > reserva > fila)
        const tipoOrder = { reuniao: 3, reserva_temporaria: 2, fila_espera: 1 };
        if (tipoOrder[a.tipo_evento] !== tipoOrder[b.tipo_evento]) {
          return tipoOrder[b.tipo_evento] - tipoOrder[a.tipo_evento];
        }
        // Depois por horário
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
    });

    return grupos;
  }, [eventosFiltrados]);

  // Obter dias do calendário
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

  function getTipoEventoIcon(tipo: string) {
    switch (tipo) {
      case 'reuniao': return <CalendarIcon className="h-3 w-3" />;
      case 'reserva_temporaria': return <Timer className="h-3 w-3" />;
      case 'fila_espera': return <Hourglass className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  }

  function getTipoEventoLabel(tipo: string) {
    switch (tipo) {
      case 'reuniao': return 'Reunião';
      case 'reserva_temporaria': return 'Reserva Temporária';
      case 'fila_espera': return 'Fila de Espera';
      default: return 'Evento';
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
      case 'ativa': return 'bg-green-600'; // Para reservas temporárias
      case 'fila_espera': return 'bg-gray-500';
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
      case 'ativa': return 'Ativa';
      case 'fila_espera': return 'Na Fila';
      default: return 'Desconhecido';
    }
  }

  // Ações rápidas
  async function handleConfirmarEvento(evento: EventoIntegrado) {
    try {
      const response = await fetch(`/api/agendamento/agenda-integrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'confirmar',
          eventoId: evento.id,
          tipoEvento: evento.tipo_evento
        })
      });

      if (response.ok) {
        toast({
          title: 'Confirmado',
          description: 'Evento confirmado com sucesso'
        });
        await loadAgendaData();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao confirmar evento',
        variant: 'destructive'
      });
    }
  }

  async function handleConverterReserva(evento: EventoIntegrado) {
    try {
      const response = await fetch(`/api/agendamento/agenda-integrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'converter_reserva',
          eventoId: evento.id
        })
      });

      if (response.ok) {
        toast({
          title: 'Convertido',
          description: 'Reserva convertida em reunião'
        });
        await loadAgendaData();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao converter reserva',
        variant: 'destructive'
      });
    }
  }

  async function handleEnviarLembretes() {
    try {
      setRefreshing(true);
      
      // Contar eventos que precisam de lembretes
      const eventosParaLembrete = eventosFiltrados.filter(e => {
        if (e.tipo_evento === 'reuniao') {
          return !e.confirmada_cliente || !e.confirmada_vendedor || !e.lembrete_enviado;
        }
        if (e.tipo_evento === 'reserva_temporaria') {
          return e.horas_ate_expirar && e.horas_ate_expirar <= 24;
        }
        return false;
      });
      
      const response = await fetch(`/api/agendamento/agenda-integrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'enviar_lembretes_massa'
        })
      });

      if (response.ok) {
        toast({
          title: 'Lembretes Enviados',
          description: `${eventosParaLembrete.length} lembretes enviados com sucesso`
        });
        await loadAgendaData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar lembretes');
      }
    } catch (error) {
      console.error('Erro ao enviar lembretes:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar lembretes',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  }
  
  async function handleEnviarLembrete(evento: EventoIntegrado) {
    try {
      const response = await fetch(`/api/agendamento/agenda-integrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'enviar_lembrete',
          eventoId: evento.id,
          tipoEvento: evento.tipo_evento
        })
      });

      if (response.ok) {
        toast({
          title: 'Lembrete Enviado',
          description: `Lembrete enviado para ${evento.cliente_nome}`
        });
        await loadAgendaData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar lembrete');
      }
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar lembrete',
        variant: 'destructive'
      });
    }
  }
  
  async function handleCancelarEvento(evento: EventoIntegrado) {
    if (!confirm(`Tem certeza que deseja cancelar este ${getTipoEventoLabel(evento.tipo_evento).toLowerCase()}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/agendamento/agenda-integrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'cancelar_evento',
          eventoId: evento.id,
          tipoEvento: evento.tipo_evento
        })
      });

      if (response.ok) {
        toast({
          title: 'Cancelado',
          description: `${getTipoEventoLabel(evento.tipo_evento)} cancelado com sucesso`
        });
        await loadAgendaData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cancelar evento');
      }
    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao cancelar evento',
        variant: 'destructive'
      });
    }
  }
  
  // Funções para criação de eventos
  function handleSlotClick(data: string, hora: string, vendedor?: string) {
    setSlotSelecionado({ data, hora, vendedor });
    setDadosNovoEvento({
      cliente_nome: '',
      vendedor_id: vendedor || '',
      data: data,
      hora_inicio: hora,
      hora_fim: addHourToTime(hora),
      local_atendimento: 'presencial',
      observacoes: ''
    });
    setShowCriarEvento(true);
  }
  
  function addHourToTime(time: string): string {
    if (!time) return '10:00';
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  async function handleCriarEvento() {
    try {
      if (!dadosNovoEvento.cliente_nome.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome do cliente é obrigatório',
          variant: 'destructive'
        });
        return;
      }
      
      const dados = {
        acao: tipoEventoCriar === 'reuniao' ? 'criar_reuniao' : 
              tipoEventoCriar === 'reserva_temporaria' ? 'criar_reserva' : 'criar_fila',
        dados: {
          cliente_nome: dadosNovoEvento.cliente_nome,
          vendedor_id: dadosNovoEvento.vendedor_id || null,
          data: dadosNovoEvento.data,
          hora_inicio: dadosNovoEvento.hora_inicio,
          hora_fim: dadosNovoEvento.hora_fim,
          local_atendimento: dadosNovoEvento.local_atendimento,
          observacoes: dadosNovoEvento.observacoes
        }
      };
      
      const response = await fetch('/api/agendamento/agenda-integrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      
      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: `${getTipoEventoLabel(tipoEventoCriar)} criado com sucesso`
        });
        setShowCriarEvento(false);
        setDadosNovoEvento({
          cliente_nome: '',
          vendedor_id: '',
          data: '',
          hora_inicio: '',
          hora_fim: '',
          local_atendimento: 'presencial',
          observacoes: ''
        });
        await loadAgendaData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar evento');
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar evento',
        variant: 'destructive'
      });
    }
  }

  if (loading && !agendaData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando agenda integrada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Agenda Integrada
          </h1>
          <p className="text-muted-foreground">
            Visualização unificada com reuniões, reservas temporárias e fila de espera
          </p>
          
          {/* Resumo dos filtros ativos */}
          {(filtroLocal !== 'todos' || filtroVendedor !== 'todos' || filtroStatus !== 'todos' || filtroTipoEvento !== 'todos') && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filtroTipoEvento !== 'todos' && (
                <Badge variant="secondary" className="text-xs">
                  {getTipoEventoLabel(filtroTipoEvento)}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                    onClick={() => setFiltroTipoEvento('todos')}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filtroStatus !== 'todos' && (
                <Badge variant="secondary" className="text-xs">
                  Status: {getStatusLabel(filtroStatus)}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                    onClick={() => setFiltroStatus('todos')}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filtroVendedor !== 'todos' && (
                <Badge variant="secondary" className="text-xs">
                  {filtroVendedor}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                    onClick={() => setFiltroVendedor('todos')}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant={showFiltros ? "default" : "outline"}
            onClick={() => setShowFiltros(!showFiltros)}
            className="flex-1 sm:flex-none"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros {showFiltros ? '(Abertos)' : ''}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas rápidas - Interativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroStatus('agendada')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {eventosFiltrados.filter(e => e.tipo_evento === 'reuniao' && (!e.confirmada_cliente || !e.confirmada_vendedor)).length}
            </div>
            <p className="text-sm text-muted-foreground">Confirmações Pendentes</p>
            <Button size="sm" className="mt-2 w-full" onClick={(e) => {
              e.stopPropagation();
              handleEnviarLembretes();
            }}>
              <MessageSquare className="h-3 w-3 mr-1" />
              Enviar Lembretes
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroTipoEvento('fila_espera')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {eventosFiltrados.filter(e => e.tipo_evento === 'fila_espera').length}
            </div>
            <p className="text-sm text-muted-foreground">Na Fila de Espera</p>
            {eventosFiltrados.filter(e => e.tipo_evento === 'fila_espera' && e.pontuacao_fila && e.pontuacao_fila >= 70).length > 0 && (
              <Badge variant="secondary" className="mt-1">
                <Star className="h-3 w-3 mr-1" />
                {eventosFiltrados.filter(e => e.tipo_evento === 'fila_espera' && e.pontuacao_fila && e.pontuacao_fila >= 70).length} prioritários
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroTipoEvento('reserva_temporaria')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {eventosFiltrados.filter(e => e.tipo_evento === 'reserva_temporaria' && e.horas_ate_expirar && e.horas_ate_expirar <= 24).length}
            </div>
            <p className="text-sm text-muted-foreground">Reservas Expirando</p>
            <Badge variant="destructive" className="mt-1">Próx. 24h</Badge>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroTipoEvento('reuniao')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((eventosFiltrados.filter(e => e.tipo_evento === 'reuniao' && (e.status === 'confirmada' || e.status === 'agendada')).length / Math.max(eventosFiltrados.length, 1)) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
            <div className="text-xs text-muted-foreground mt-1">
              {eventosFiltrados.filter(e => e.tipo_evento === 'reuniao').length} reuniões totais
            </div>
            <div className="text-xs text-blue-600 mt-1 font-medium">
              Clique para filtrar reuniões
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      {showFiltros && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros da Agenda Integrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Tipo de Evento</Label>
                <Select value={filtroTipoEvento} onValueChange={setFiltroTipoEvento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="reuniao">Reuniões</SelectItem>
                    <SelectItem value="reserva_temporaria">Reservas Temporárias</SelectItem>
                    <SelectItem value="fila_espera">Fila de Espera</SelectItem>
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
                    <SelectItem value="ativa">Ativa (Reserva)</SelectItem>
                    <SelectItem value="fila_espera">Fila de Espera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                    {agendaData && [...new Set(agendaData.eventos.map(e => e.vendedor_nome))].map((vendedor) => (
                      <SelectItem key={vendedor} value={vendedor}>
                        {vendedor}
                      </SelectItem>
                    ))}
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
                    setFiltroTipoEvento('todos');
                    setFiltroCidade('todas');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legenda de Cores e Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Legenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Legenda de locais */}
            <div>
              <h4 className="font-medium mb-2">Locais de Atendimento</h4>
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
            </div>

            {/* Legenda de tipos */}
            <div>
              <h4 className="font-medium mb-2">Tipos de Eventos</h4>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Reunião Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">Reserva Temporária</span>
                  <Badge variant="outline" className="border-dashed">48h</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Fila de Espera</span>
                  <Badge variant="secondary" className="opacity-50">Aguardando</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Visualização */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="grade" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Grade de Agendamento
          </TabsTrigger>
          <TabsTrigger value="planilha" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Por Cidade
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        {/* Tab: Grade de Agendamento (Nova - Principal) */}
        <TabsContent value="grade" className="space-y-4">
          <GradeAgendamento 
            eventos={eventosFiltrados}
            onSlotClick={handleSlotClick}
            locaisAtendimento={locaisAtendimento}
            currentDate={currentDate}
            onNavigate={setCurrentDate}
          />
        </TabsContent>

        {/* Tab: Visualização Por Cidade */}
        <TabsContent value="planilha" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Visualização Estilo Planilha</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {format(currentDate, "'Período:' dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cabeçalhos por cidade */}
                {['ITAPEMA', 'FLORIANÓPOLIS', 'JOINVILLE', 'BLUMENAU'].map(cidade => {
                  const eventosCidade = eventosFiltrados.filter(e => {
                    // Buscar pela nova coluna cidade primeiro, depois fallback para local_nome
                    const cidadeEvento = e.cidade?.toUpperCase() || e.local_nome?.toUpperCase() || e.espaco_nome?.toUpperCase() || '';
                    
                    console.log('Debug Cidade - Evento:', {
                      cliente: e.cliente_nome,
                      cidade: e.cidade,
                      local_nome: e.local_nome,
                      espaco_nome: e.espaco_nome,
                      cidadeProcessada: cidadeEvento,
                      cidadeFiltro: cidade,
                      match: cidadeEvento.includes(cidade)
                    });
                    
                    return cidadeEvento.includes(cidade);
                  });
                  
                  const corCidade = cidade === 'ITAPEMA' ? '#FFA500' : 
                                   cidade === 'FLORIANÓPOLIS' ? '#8B4CF7' :
                                   cidade === 'JOINVILLE' ? '#22C55E' : '#DC2626';
                  
                  return (
                    <div key={cidade} className="border rounded-lg overflow-hidden">
                      <div 
                        className="px-4 py-3 text-white font-semibold flex items-center justify-between"
                        style={{ backgroundColor: corCidade }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {cidade === 'FLORIANÓPOLIS' ? 'FLORIANÓPOLIS' : cidade}
                        </div>
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          {eventosCidade.length} eventos
                        </Badge>
                      </div>
                      
                      <div className="p-4">
                        {eventosCidade.length === 0 ? (
                          <div className="text-center text-muted-foreground py-4">
                            <CalendarIcon className="h-8 w-8 mx-auto mb-2" />
                            <p>Nenhum evento nesta cidade</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {eventosCidade.map((evento) => (
                              <div 
                                key={evento.id}
                                className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                                style={{
                                  borderLeft: `4px solid ${evento.cor_local}`,
                                  backgroundColor: `${evento.cor_local}10`
                                }}
                                onClick={() => {
                                  setSelectedEvento(evento);
                                  setShowEvento(true);
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getTipoEventoIcon(evento.tipo_evento)}
                                    <span className="font-medium text-sm">
                                      {getTipoEventoLabel(evento.tipo_evento)}
                                    </span>
                                  </div>
                                  <Badge 
                                    className={`${getStatusColor(evento.status)} text-white text-xs`}
                                  >
                                    {getStatusLabel(evento.status)}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-1 text-sm">
                                  <div className="font-semibold truncate">{evento.cliente_nome}</div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {evento.vendedor_nome}
                                  </div>
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {format(parseISO(evento.data), 'dd/MM', { locale: ptBR })}
                                    {evento.tipo_evento !== 'fila_espera' && (
                                      <span> às {evento.hora_inicio}</span>
                                    )}
                                  </div>
                                  
                                  {/* Indicadores específicos */}
                                  {evento.tipo_evento === 'reserva_temporaria' && evento.horas_ate_expirar && (
                                    <div className="flex items-center gap-1 text-orange-600">
                                      <Timer className="h-3 w-3" />
                                      <span className="text-xs">
                                        {evento.horas_ate_expirar <= 24 ? 'Expira em breve!' : `${Math.round(evento.horas_ate_expirar)}h restantes`}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {evento.tipo_evento === 'fila_espera' && (
                                    <div className="flex items-center gap-1 text-gray-600">
                                      <Hash className="h-3 w-3" />
                                      <span className="text-xs">#{evento.prioridade_fila} na fila</span>
                                    </div>
                                  )}
                                  
                                  {evento.tipo_evento === 'reuniao' && (evento.precisa_confirmacao_cliente || evento.precisa_confirmacao_vendedor) && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span className="text-xs">Precisa confirmação</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Ações rápidas na planilha */}
                                <div className="flex gap-1 mt-3 pt-2 border-t">
                                  {evento.tipo_evento === 'reserva_temporaria' && (
                                    <Button 
                                      size="sm" 
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConverterReserva(evento);
                                      }}
                                    >
                                      Converter
                                    </Button>
                                  )}
                                  
                                  {evento.tipo_evento === 'reuniao' && evento.precisa_confirmacao_cliente && (
                                    <Button 
                                      size="sm" 
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmarEvento(evento);
                                      }}
                                    >
                                      Confirmar
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEnviarLembrete(evento);
                                    }}
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Lembrete
                                  </Button>
                                </div>
                              </div>
                            ))}
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

        {/* Tab: Calendário (Adaptado) */}
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
                  const eventosDay = eventosPorData[dayKey] || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={dayKey}
                      className={`p-2 border rounded-lg min-h-28 ${
                        isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                      } ${isToday ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {eventosDay.slice(0, 3).map((evento) => {
                          // Determinar cor baseada na cidade do evento
                          let corEvento = evento.cor_local;
                          
                          // Cores específicas por cidade conforme planilhas
                          const nomeCompleto = (evento.local_nome || evento.espaco_nome || '').toUpperCase();
                          if (nomeCompleto.includes('ITAPEMA')) {
                            corEvento = '#FFA500'; // Laranja
                          } else if (nomeCompleto.includes('FLORIAN') || nomeCompleto.includes('FLORIANOPOLIS')) {
                            corEvento = '#8B4CF7'; // Roxo
                          } else if (nomeCompleto.includes('JOINVILLE')) {
                            corEvento = '#22C55E'; // Verde
                          } else if (nomeCompleto.includes('BLUMENAU')) {
                            corEvento = '#DC2626'; // Vermelho
                          } else if (nomeCompleto.includes('ONLINE')) {
                            corEvento = '#F97316'; // Orange-500 para Online
                          } else if (nomeCompleto.includes('TREINAMENTO')) {
                            corEvento = '#1F2937'; // Gray-800 para Treinamento
                          }
                          
                          return (
                            <div
                              key={evento.id}
                              className="text-xs p-1.5 rounded cursor-pointer hover:opacity-90 text-white truncate relative shadow-sm"
                              style={{ 
                                backgroundColor: corEvento,
                                opacity: evento.tipo_evento === 'fila_espera' ? 0.7 : 1,
                                border: evento.tipo_evento === 'reserva_temporaria' ? '2px dashed rgba(255,255,255,0.8)' : 'none',
                                borderLeft: evento.tipo_evento === 'reuniao' && (!evento.confirmada_cliente || !evento.confirmada_vendedor) ? '3px solid #EF4444' : 'none'
                              }}
                              onClick={() => {
                                setSelectedEvento(evento);
                                setShowEvento(true);
                              }}
                              title={`${evento.tipo_evento !== 'fila_espera' ? evento.hora_inicio + ' - ' : ''}${evento.cliente_nome} (${getTipoEventoLabel(evento.tipo_evento)})${evento.vendedor_nome ? ' - ' + evento.vendedor_nome : ''}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  {getTipoEventoIcon(evento.tipo_evento)}
                                  <span className="font-medium text-xs">
                                    {evento.tipo_evento === 'fila_espera' 
                                      ? `#${evento.prioridade_fila || '?'}`
                                      : evento.hora_inicio?.substring(0, 5) || 'S/H'
                                    }
                                  </span>
                                </div>
                                
                                {/* Status badge mini */}
                                {evento.tipo_evento === 'reserva_temporaria' && evento.horas_ate_expirar && evento.horas_ate_expirar <= 6 && (
                                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" title="Expira em breve!" />
                                )}
                                
                                {evento.tipo_evento === 'reuniao' && (!evento.confirmada_cliente || !evento.confirmada_vendedor) && (
                                  <div className="w-2 h-2 bg-red-400 rounded-full" title="Precisa confirmar" />
                                )}
                              </div>
                              
                              <div className="text-xs font-medium truncate">
                                {evento.cliente_nome}
                              </div>
                              
                              <div className="text-xs opacity-90 truncate">
                                {evento.vendedor_nome}
                              </div>
                              
                              {/* Indicador do tipo de evento */}
                              <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  evento.tipo_evento === 'reuniao' ? 'bg-blue-200' :
                                  evento.tipo_evento === 'reserva_temporaria' ? 'bg-orange-200' :
                                  'bg-gray-200'
                                }`} />
                              </div>
                            </div>
                          );
                        })}
                        {eventosDay.length > 3 && (
                          <div 
                            className="text-xs text-muted-foreground bg-gray-100 rounded px-2 py-1 cursor-pointer hover:bg-gray-200"
                            onClick={() => {
                              // Aqui poderia abrir um modal com todos os eventos do dia
                              toast({
                                title: `${eventosDay.length} eventos neste dia`,
                                description: `Clique nos eventos para ver detalhes`
                              });
                            }}
                          >
                            +{eventosDay.length - 3} mais eventos
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

        {/* Tab: Lista (Melhorada) */}
        <TabsContent value="lista" className="space-y-4">
          {eventosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum evento encontrado para os filtros selecionados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {eventosFiltrados.map((evento) => (
                <Card key={evento.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTipoEventoIcon(evento.tipo_evento)}
                          <h3 className="font-semibold">{evento.titulo}</h3>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ borderColor: evento.cor_local }}
                          >
                            {getTipoEventoLabel(evento.tipo_evento)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {evento.cliente_nome}
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(parseISO(evento.data), 'dd/MM', { locale: ptBR })} {evento.hora_inicio}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {evento.local_nome}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {evento.vendedor_nome}
                          </div>
                        </div>

                        {/* Informações específicas por tipo */}
                        {evento.tipo_evento === 'reserva_temporaria' && (
                          <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                            <div className="flex items-center gap-1 text-orange-700">
                              <Timer className="h-3 w-3" />
                              Expira em: {evento.horas_ate_expirar && evento.horas_ate_expirar > 0 
                                ? `${Math.round(evento.horas_ate_expirar)}h`
                                : 'Expirado'
                              }
                            </div>
                          </div>
                        )}

                        {evento.tipo_evento === 'fila_espera' && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Hash className="h-3 w-3" />
                              Posição #{evento.prioridade_fila} | Pontuação: {evento.pontuacao_fila}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Indicadores de confirmação */}
                        {evento.tipo_evento === 'reuniao' && (
                          <div className="flex gap-1">
                            <div 
                              className={`w-3 h-3 rounded-full ${evento.confirmada_cliente ? 'bg-green-500' : 'bg-red-500'}`}
                              title={evento.confirmada_cliente ? 'Cliente confirmou' : 'Cliente não confirmou'}
                            />
                            <div 
                              className={`w-3 h-3 rounded-full ${evento.confirmada_vendedor ? 'bg-green-500' : 'bg-red-500'}`}
                              title={evento.confirmada_vendedor ? 'Vendedor confirmou' : 'Vendedor não confirmou'}
                            />
                          </div>
                        )}
                        
                        <Badge className={`${getStatusColor(evento.status)} text-white text-xs`}>
                          {getStatusLabel(evento.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Evento (Expandido) */}
      <Dialog open={showEvento} onOpenChange={setShowEvento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do {selectedEvento && getTipoEventoLabel(selectedEvento.tipo_evento)}
            </DialogTitle>
          </DialogHeader>
          {selectedEvento && (
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg text-white"
                style={{ 
                  backgroundColor: selectedEvento.cor_local,
                  opacity: selectedEvento.tipo_evento === 'fila_espera' ? 0.8 : 1,
                  border: selectedEvento.tipo_evento === 'reserva_temporaria' ? '2px dashed white' : 'none'
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getTipoEventoIcon(selectedEvento.tipo_evento)}
                  <div className="font-medium">{selectedEvento.titulo}</div>
                </div>
                <div className="text-sm opacity-90">{selectedEvento.local_nome}</div>
                {selectedEvento.descricao && (
                  <div className="text-xs opacity-80 mt-1">{selectedEvento.descricao}</div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedEvento.cliente_nome}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Vendedor:</span>
                  <span className="font-medium">{selectedEvento.vendedor_nome}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedEvento.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                
                {selectedEvento.tipo_evento !== 'fila_espera' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Horário:</span>
                    <span className="font-medium">
                      {selectedEvento.hora_inicio} às {selectedEvento.hora_fim}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={`${getStatusColor(selectedEvento.status)} text-white`}>
                    {getStatusLabel(selectedEvento.status)}
                  </Badge>
                </div>

                {selectedEvento.tipo_evento === 'reserva_temporaria' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tempo restante:</span>
                    <Badge variant={selectedEvento.horas_ate_expirar && selectedEvento.horas_ate_expirar <= 6 ? "destructive" : "secondary"}>
                      {selectedEvento.horas_ate_expirar && selectedEvento.horas_ate_expirar > 0 
                        ? `${Math.round(selectedEvento.horas_ate_expirar)}h`
                        : 'Expirado'
                      }
                    </Badge>
                  </div>
                )}

                {selectedEvento.tipo_evento === 'fila_espera' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Posição na fila:</span>
                      <Badge variant="secondary">#{selectedEvento.prioridade_fila}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pontuação:</span>
                      <Badge variant="outline">{selectedEvento.pontuacao_fila} pontos</Badge>
                    </div>
                  </>
                )}

                {selectedEvento.tipo_evento === 'reuniao' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Confirmações:</span>
                    <div className="flex gap-2">
                      {selectedEvento.confirmada_cliente ? (
                        <Badge variant="outline" className="text-xs text-green-600">Cliente ✓</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Cliente ✗</Badge>
                      )}
                      {selectedEvento.confirmada_vendedor ? (
                        <Badge variant="outline" className="text-xs text-green-600">Vendedor ✓</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Vendedor ✗</Badge>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvento.espaco_nome && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Espaço:</span>
                    <span className="font-medium">{selectedEvento.espaco_nome}</span>
                  </div>
                )}
              </div>

              {/* Ações rápidas baseadas no tipo de evento */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedEvento.tipo_evento === 'reuniao' && (
                  <>
                    {selectedEvento.precisa_confirmacao_cliente && (
                      <Button size="sm" onClick={() => handleConfirmarEvento(selectedEvento)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmar
                      </Button>
                    )}
                    {selectedEvento.link_reuniao && (
                      <Button size="sm" asChild>
                        <a href={selectedEvento.link_reuniao} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1" />
                          Entrar
                        </a>
                      </Button>
                    )}
                  </>
                )}

                {selectedEvento.tipo_evento === 'reserva_temporaria' && (
                  <Button size="sm" onClick={() => handleConverterReserva(selectedEvento)}>
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Converter em Reunião
                  </Button>
                )}
                
                <Button size="sm" variant="outline" onClick={() => handleEnviarLembrete(selectedEvento)}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Enviar Lembrete
                </Button>
                
                <Button size="sm" variant="destructive" onClick={() => handleCancelarEvento(selectedEvento)}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>

              {selectedEvento.link_reuniao && selectedEvento.tipo_evento === 'reuniao' && (
                <Button asChild className="w-full">
                  <a href={selectedEvento.link_reuniao} target="_blank" rel="noopener noreferrer">
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