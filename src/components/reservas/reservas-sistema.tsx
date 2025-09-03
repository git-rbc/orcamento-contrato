'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { 
  Clock, Calendar, Users, AlertCircle, CheckCircle, 
  Timer, Bell, Star, TrendingUp, RefreshCw, Plus,
  User, MapPin, Building, Phone, Mail, Trophy,
  Hourglass, Zap, Target, Award
} from 'lucide-react';
import { format, parseISO, addHours, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reservaSchema, businessValidations, z } from '@/lib/schemas';

// Hooks para dados reais
import { useClientesSelect } from '@/hooks/useClientes';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
import { useLocaisSelect } from '@/hooks/useLocaisAtendimento';

interface ReservaTemporaria {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone?: string;
  data_desejada: string;
  hora_inicio_desejada: string;
  hora_fim_desejada: string;
  vendedor_id: string;
  vendedor_nome: string;
  espaco_id?: string;
  espaco_nome?: string;
  valor_estimado_proposta: number;
  observacoes?: string;
  status: 'ativa' | 'expirada' | 'convertida' | 'liberada';
  expira_em: string;
  convertida_em_proposta_id?: string;
  created_at: string;
  created_by_nome: string;
}

interface FilaEspera {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone?: string;
  data_desejada: string;
  hora_inicio_desejada: string;
  hora_fim_desejada: string;
  espaco_id?: string;
  espaco_nome?: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  pontuacao: number;
  valor_estimado_proposta: number;
  motivo_espera: string;
  notificado: boolean;
  status: 'aguardando' | 'notificado' | 'reagendado' | 'cancelado';
  created_at: string;
  updated_at: string;
}

interface DisponibilidadeCalendario {
  data: string;
  horarios: {
    hora_inicio: string;
    hora_fim: string;
    status: 'livre' | 'ocupado' | 'reservado' | 'bloqueado';
    tipo?: 'reuniao' | 'reserva' | 'bloqueio';
    detalhes?: string;
    cor?: string;
  }[];
}

// Schemas para validação dos formulários
const novaReservaSchema = z.object({
  cliente_id: z.string().uuid('Cliente é obrigatório'),
  data_desejada: z.string().min(1, 'Data é obrigatória'),
  hora_inicio_desejada: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim_desejada: z.string().min(1, 'Hora de fim é obrigatória'),
  espaco_id: z.string().uuid().optional(),
  valor_estimado_proposta: z.number().min(0, 'Valor deve ser positivo'),
  observacoes: z.string().optional()
});

const novaFilaSchema = z.object({
  cliente_id: z.string().uuid('Cliente é obrigatório'),
  data_desejada: z.string().min(1, 'Data é obrigatória'),
  hora_inicio_desejada: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim_desejada: z.string().min(1, 'Hora de fim é obrigatória'),
  espaco_id: z.string().uuid().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']),
  valor_estimado_proposta: z.number().min(0, 'Valor deve ser positivo'),
  motivo_espera: z.string().min(1, 'Motivo da espera é obrigatório')
});

type NovaReservaForm = z.infer<typeof novaReservaSchema>;
type NovaFilaForm = z.infer<typeof novaFilaSchema>;

export function ReservasSistema() {
  const [loading, setLoading] = useState(true);
  const [reservasTemporarias, setReservasTemporarias] = useState<ReservaTemporaria[]>([]);
  const [filaEspera, setFilaEspera] = useState<FilaEspera[]>([]);
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeCalendario[]>([]);
  const [showNovaReserva, setShowNovaReserva] = useState(false);
  const [showNovaFila, setShowNovaFila] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hooks para dados reais com fallback
  const { data: clientesData = [] } = useClientesSelect();
  const { espacos: espacosData = [], loading: espacosLoading } = useEspacosEventos();
  const { locaisOptions: locaisData = [], loading: locaisLoading } = useLocaisSelect();

  // Dados hardcoded como fallback (baseados nos dados reais do banco)
  const clientesHardcoded = [
    { id: "32aea77e-c90b-4410-8710-afe67b955987", nome: "Arles Robalo", email: "oarlesrobalo@gmail.com", telefone: "(47) 99917-4130", cidade: "Itapema", estado: "SC" },
    { id: "906c00e4-ca36-468d-b93b-7175b908111d", nome: "Daiane Bortoli", email: "ag.indaiaeventos@gmail.com", telefone: "(47) 99619-4565", cidade: "Itapema", estado: "SC" },
    { id: "2af3121e-4440-4b2d-873a-00193eed9b37", nome: "MINISTERIO DA JUSTICA E SEGURANCA PUBLICA", email: "emersonfilho953@gmail.com", telefone: "20257688", cidade: "Brasília", estado: "DF" },
    { id: "dbd4a5d1-c1ec-4dcd-87c2-df7546996a40", nome: "Pedro Bortoli", email: "", telefone: "(47) 9962-5558", cidade: "Itapema", estado: "SC" }
  ];

  const espacosHardcoded = [
    { id: "6838baf0-f20a-4ec9-baf7-782c19963cec", nome: "Canto da Lagoa", cidade: "Florianópolis", capacidade_maxima: 250 },
    { id: "4583856c-3aa8-495b-8e70-69bc5dd94734", nome: "Castelo Blumenau", cidade: "Blumenau", capacidade_maxima: 270 },
    { id: "e2a077e3-a7c8-418a-8c58-a7a2d2b9a244", nome: "Esp. Joinville", cidade: "Joinville", capacidade_maxima: 700 },
    { id: "82900e5b-8be7-4ccc-87c2-0fef1d07cfd0", nome: "Salão de Eventos", cidade: "Itapema", capacidade_maxima: 500 }
  ];

  // Usar dados reais se disponíveis, senão usar hardcoded
  const clientesToUse = clientesData?.length > 0 ? clientesData : clientesHardcoded;
  const espacosToUse = espacosData?.length > 0 ? espacosData : espacosHardcoded;

  // Timer para atualizar reservas temporárias
  const [currentTime, setCurrentTime] = useState(new Date());

  // Estados de carregamento dos dados reais
  const isDataLoading = espacosLoading || locaisLoading;

  const { register: registerReserva, handleSubmit: handleSubmitReserva, reset: resetReserva, formState: { errors: errorsReserva } } = useForm<NovaReservaForm>({
    resolver: zodResolver(novaReservaSchema)
  });
  const { register: registerFila, handleSubmit: handleSubmitFila, reset: resetFila, formState: { errors: errorsFila } } = useForm<NovaFilaForm>({
    resolver: zodResolver(novaFilaSchema)
  });

  useEffect(() => {
    loadReservasTemporarias();
    loadFilaEspera();
    loadDisponibilidade();
    
    // Timer para atualizar a cada minuto
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh das reservas a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      loadReservasTemporarias();
      loadFilaEspera();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadReservasTemporarias() {
    try {
      const response = await fetch('/api/reservas-temporarias');
      if (response.ok) {
        const { data } = await response.json();
        setReservasTemporarias(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar reservas temporárias:', error);
    }
  }

  async function loadFilaEspera() {
    try {
      const response = await fetch('/api/fila-espera');
      if (response.ok) {
        const { data } = await response.json();
        setFilaEspera(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar fila de espera:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDisponibilidade() {
    try {
      // Carregar próximos 7 dias
      const hoje = new Date();
      const params = new URLSearchParams({
        data_inicio: format(hoje, 'yyyy-MM-dd'),
        data_fim: format(addHours(hoje, 7 * 24), 'yyyy-MM-dd')
      });

      const response = await fetch(`/api/reunioes/agenda-visual?${params.toString()}`);
      if (response.ok) {
        const { data } = await response.json();
        // Transformar dados em formato de disponibilidade (simplificado)
        setDisponibilidade([]);
      }
    } catch (error) {
      console.error('Erro ao carregar disponibilidade:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadReservasTemporarias(),
      loadFilaEspera(),
      loadDisponibilidade()
    ]);
    setRefreshing(false);

    toast({
      title: 'Atualizado',
      description: 'Dados do sistema de reservas atualizados'
    });
  }

  async function onSubmitNovaReserva(data: NovaReservaForm) {
    try {
      // Validações de negócio adicionais
      if (!businessValidations.isNotPastDate(data.data_desejada)) {
        throw new Error('A data desejada não pode ser no passado');
      }

      if (!businessValidations.isEndTimeAfterStart(data.hora_inicio_desejada, data.hora_fim_desejada)) {
        throw new Error('A hora de fim deve ser posterior à hora de início');
      }

      if (!businessValidations.hasMinimumDuration(data.hora_inicio_desejada, data.hora_fim_desejada, 60)) {
        throw new Error('A reserva deve ter pelo menos 1 hora de duração');
      }

      const response = await fetch('/api/reservas-temporarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar reserva');
      }

      toast({
        title: 'Reserva criada',
        description: 'Reserva temporária criada com sucesso (48h)'
      });

      resetReserva();
      setShowNovaReserva(false);
      loadReservasTemporarias();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar reserva',
        variant: 'destructive'
      });
    }
  }

  async function onSubmitNovaFila(data: NovaFilaForm) {
    try {
      // Validações de negócio adicionais
      if (!businessValidations.isNotPastDate(data.data_desejada)) {
        throw new Error('A data desejada não pode ser no passado');
      }

      if (!businessValidations.isEndTimeAfterStart(data.hora_inicio_desejada, data.hora_fim_desejada)) {
        throw new Error('A hora de fim deve ser posterior à hora de início');
      }

      if (!businessValidations.hasMinimumDuration(data.hora_inicio_desejada, data.hora_fim_desejada, 60)) {
        throw new Error('O evento deve ter pelo menos 1 hora de duração');
      }

      const response = await fetch('/api/fila-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar à fila');
      }

      toast({
        title: 'Adicionado à fila',
        description: 'Cliente adicionado à fila de espera com sucesso'
      });

      resetFila();
      setShowNovaFila(false);
      loadFilaEspera();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao adicionar à fila',
        variant: 'destructive'
      });
    }
  }

  async function converterReservaEmProposta(reservaId: string) {
    try {
      const response = await fetch(`/api/reservas-temporarias/${reservaId}/converter`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao converter reserva');
      }

      toast({
        title: 'Convertido',
        description: 'Reserva convertida em proposta com sucesso'
      });

      loadReservasTemporarias();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao converter reserva',
        variant: 'destructive'
      });
    }
  }

  async function estenderReserva(reservaId: string) {
    try {
      const response = await fetch(`/api/reservas-temporarias/${reservaId}/estender`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao estender reserva');
      }

      toast({
        title: 'Reserva estendida',
        description: 'Prazo da reserva estendido por mais 48h'
      });

      loadReservasTemporarias();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao estender reserva',
        variant: 'destructive'
      });
    }
  }

  async function notificarFilaEspera(filaId: string) {
    try {
      const response = await fetch(`/api/fila-espera/${filaId}/notificar`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao notificar cliente');
      }

      toast({
        title: 'Cliente notificado',
        description: 'Cliente foi notificado sobre a disponibilidade'
      });

      loadFilaEspera();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao notificar cliente',
        variant: 'destructive'
      });
    }
  }

  function getTempoRestante(expiraEm: string) {
    const expiracao = parseISO(expiraEm);
    const agora = currentTime;
    
    if (isPast(expiracao)) {
      return { expirado: true, horas: 0, minutos: 0 };
    }

    const horasRestantes = differenceInHours(expiracao, agora);
    const minutosRestantes = differenceInMinutes(expiracao, agora) % 60;

    return { 
      expirado: false, 
      horas: horasRestantes, 
      minutos: minutosRestantes,
      porcentagem: Math.max(0, Math.min(100, ((48 * 60 - differenceInMinutes(expiracao, agora)) / (48 * 60)) * 100))
    };
  }

  function getPrioridadeColor(prioridade: string) {
    switch (prioridade) {
      case 'critica': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'media': return 'bg-yellow-500';
      case 'baixa': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }

  function getPrioridadeIcon(pontuacao: number) {
    if (pontuacao >= 90) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (pontuacao >= 75) return <Award className="h-4 w-4 text-orange-500" />;
    if (pontuacao >= 60) return <Star className="h-4 w-4 text-blue-500" />;
    if (pontuacao >= 40) return <Target className="h-4 w-4 text-green-500" />;
    return <Users className="h-4 w-4 text-gray-500" />;
  }

  if (loading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sistema de reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hourglass className="h-6 w-6" />
            Sistema de Reservas e Filas
          </h1>
          <p className="text-muted-foreground">
            Gestão de reservas temporárias e fila de espera inteligente
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNovaReserva(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reserva
          </Button>
          <Button onClick={() => setShowNovaFila(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar à Fila
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

      {/* Tabs principais */}
      <Tabs defaultValue="reservas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reservas" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Reservas Temporárias
          </TabsTrigger>
          <TabsTrigger value="fila" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Fila de Espera
          </TabsTrigger>
          <TabsTrigger value="disponibilidade" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dashboard Disponibilidade
          </TabsTrigger>
        </TabsList>

        {/* Tab: Reservas Temporárias */}
        <TabsContent value="reservas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservasTemporarias.map((reserva) => {
              const tempoRestante = getTempoRestante(reserva.expira_em);
              
              return (
                <Card key={reserva.id} className={`${tempoRestante.expirado ? 'border-red-500 bg-red-50' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{reserva.cliente_nome}</CardTitle>
                      <Badge variant={reserva.status === 'ativa' ? 'default' : 'secondary'}>
                        {reserva.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Timer Visual */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Tempo Restante:</span>
                        <span className={`font-medium ${tempoRestante.expirado ? 'text-red-600' : 'text-primary'}`}>
                          {tempoRestante.expirado ? 'EXPIRADO' : `${tempoRestante.horas}h ${tempoRestante.minutos}m`}
                        </span>
                      </div>
                      {!tempoRestante.expirado && (
                        <Progress value={100 - (tempoRestante.porcentagem || 0)} className="h-2" />
                      )}
                    </div>

                    <Separator />

                    {/* Detalhes da Reserva */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(parseISO(reserva.data_desejada), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {reserva.hora_inicio_desejada} às {reserva.hora_fim_desejada}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{reserva.vendedor_nome}</span>
                      </div>
                      {reserva.espaco_nome && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{reserva.espaco_nome}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-green-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(reserva.valor_estimado_proposta)}
                        </span>
                      </div>
                      {reserva.cliente_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{reserva.cliente_email}</span>
                        </div>
                      )}
                      {reserva.cliente_telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{reserva.cliente_telefone}</span>
                        </div>
                      )}
                    </div>

                    {reserva.observacoes && (
                      <div className="p-2 bg-muted rounded text-sm">
                        {reserva.observacoes}
                      </div>
                    )}

                    {/* Ações */}
                    {reserva.status === 'ativa' && !tempoRestante.expirado && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => converterReservaEmProposta(reserva.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Converter
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => estenderReserva(reserva.id)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Estender
                        </Button>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Criado por {reserva.created_by_nome} em {format(parseISO(reserva.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {reservasTemporarias.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Timer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma reserva ativa</h3>
                <p className="text-muted-foreground">
                  Crie uma nova reserva temporária de 48h
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Fila de Espera */}
        <TabsContent value="fila" className="space-y-4">
          <div className="space-y-3">
            {filaEspera
              .sort((a, b) => b.pontuacao - a.pontuacao) // Ordenar por pontuação
              .map((item, index) => (
                <Card key={item.id} className={`${index < 3 ? 'border-l-4 border-l-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Posição e Pontuação */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-1">
                            {getPrioridadeIcon(item.pontuacao)}
                            <Badge variant="outline" className="text-xs">
                              {item.pontuacao} pts
                            </Badge>
                          </div>
                        </div>

                        {/* Informações do Cliente */}
                        <div>
                          <div className="font-medium">{item.cliente_nome}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(item.data_desejada), 'dd/MM/yyyy', { locale: ptBR })} 
                              às {item.hora_inicio_desejada}
                            </span>
                            {item.espaco_nome && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {item.espaco_nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Prioridade */}
                        <Badge className={`${getPrioridadeColor(item.prioridade)} text-white`}>
                          {item.prioridade.toUpperCase()}
                        </Badge>

                        {/* Valor Estimado */}
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(item.valor_estimado_proposta)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Valor estimado
                          </div>
                        </div>

                        {/* Status e Ações */}
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={item.status === 'aguardando' ? 'secondary' : 'outline'}
                          >
                            {item.status}
                          </Badge>
                          
                          {!item.notificado && item.status === 'aguardando' && (
                            <Button 
                              size="sm" 
                              onClick={() => notificarFilaEspera(item.id)}
                            >
                              <Bell className="h-4 w-4 mr-1" />
                              Notificar
                            </Button>
                          )}

                          {item.notificado && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Notificado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Motivo da Espera */}
                    {item.motivo_espera && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Motivo:</strong> {item.motivo_espera}
                      </div>
                    )}

                    {/* Contato */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      {item.cliente_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {item.cliente_email}
                        </span>
                      )}
                      {item.cliente_telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {item.cliente_telefone}
                        </span>
                      )}
                      <span>
                        Na fila desde {format(parseISO(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {filaEspera.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Fila de espera vazia</h3>
                <p className="text-muted-foreground">
                  Nenhum cliente aguardando na fila no momento
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Dashboard de Disponibilidade */}
        <TabsContent value="disponibilidade" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reservas Ativas</span>
                  <Badge variant="default">{reservasTemporarias.filter(r => r.status === 'ativa').length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Na Fila de Espera</span>
                  <Badge variant="secondary">{filaEspera.filter(f => f.status === 'aguardando').length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reservas Expiradas</span>
                  <Badge variant="destructive">
                    {reservasTemporarias.filter(r => {
                      const tempo = getTempoRestante(r.expira_em);
                      return tempo.expirado;
                    }).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Notificações Pendentes</span>
                  <Badge variant="outline">{filaEspera.filter(f => !f.notificado && f.status === 'aguardando').length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Indicadores Visuais */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Legenda de Cores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500"></div>
                      <span className="text-sm">Horário Livre</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-500"></div>
                      <span className="text-sm">Reunião Marcada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-500"></div>
                      <span className="text-sm">Reserva Temporária</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-500"></div>
                      <span className="text-sm">Bloqueado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-500"></div>
                      <span className="text-sm">Em Andamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gray-500"></div>
                      <span className="text-sm">Fora do Horário</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder para calendário de disponibilidade */}
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <p>Vista de calendário com indicadores visuais será implementada aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {/* Modal Nova Reserva */}
      <Dialog open={showNovaReserva} onOpenChange={setShowNovaReserva}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Reserva Temporária</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitReserva(onSubmitNovaReserva)} className="space-y-4">
            <div>
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select onValueChange={(value) => {
                registerReserva('cliente_id').onChange({ target: { value } });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientesToUse?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex flex-col">
                        <span>{cliente.nome}</span>
                        {cliente.email && (
                          <span className="text-xs text-muted-foreground">{cliente.email}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorsReserva.cliente_id && (
                <span className="text-sm text-red-500">Cliente é obrigatório</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_desejada">Data *</Label>
                <Input type="date" {...registerReserva('data_desejada', { required: true })} />
              </div>
              <div>
                <Label htmlFor="espaco_id">Espaço do Evento</Label>
                <Select onValueChange={(value) => {
                  registerReserva('espaco_id').onChange({ target: { value } });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar espaço" />
                  </SelectTrigger>
                  <SelectContent>
                    {espacosToUse?.map((espaco) => (
                      <SelectItem key={espaco.id} value={espaco.id}>
                        <div className="flex flex-col">
                          <span>{espaco.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            {espaco.cidade} - Capacidade: {espaco.capacidade_maxima}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_inicio_desejada">Hora Início *</Label>
                <Input type="time" {...registerReserva('hora_inicio_desejada', { required: true })} />
              </div>
              <div>
                <Label htmlFor="hora_fim_desejada">Hora Fim *</Label>
                <Input type="time" {...registerReserva('hora_fim_desejada', { required: true })} />
              </div>
            </div>
            
            <div>
              <Label htmlFor="valor_estimado_proposta">Valor Estimado</Label>
              <Input 
                type="number" 
                step="0.01"
                {...registerReserva('valor_estimado_proposta', { valueAsNumber: true })} 
                placeholder="0,00" 
              />
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea {...registerReserva('observacoes')} placeholder="Observações sobre a reserva..." />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNovaReserva(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Reserva (48h)
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Fila */}
      <Dialog open={showNovaFila} onOpenChange={setShowNovaFila}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar à Fila de Espera</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitFila(onSubmitNovaFila)} className="space-y-4">
            <div>
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select onValueChange={(value) => {
                registerFila('cliente_id').onChange({ target: { value } });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientesToUse?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex flex-col">
                        <span>{cliente.nome}</span>
                        {cliente.email && (
                          <span className="text-xs text-muted-foreground">{cliente.email}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorsFila.cliente_id && (
                <span className="text-sm text-red-500">Cliente é obrigatório</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_desejada">Data Desejada *</Label>
                <Input type="date" {...registerFila('data_desejada', { required: true })} />
              </div>
              <div>
                <Label htmlFor="prioridade">Prioridade *</Label>
                <Select onValueChange={(value) => registerFila('prioridade').onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_inicio_desejada">Hora Início *</Label>
                <Input type="time" {...registerFila('hora_inicio_desejada', { required: true })} />
              </div>
              <div>
                <Label htmlFor="hora_fim_desejada">Hora Fim *</Label>
                <Input type="time" {...registerFila('hora_fim_desejada', { required: true })} />
              </div>
            </div>
            
            <div>
              <Label htmlFor="espaco_id">Espaço do Evento</Label>
              <Select onValueChange={(value) => {
                registerFila('espaco_id').onChange({ target: { value } });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar espaço" />
                </SelectTrigger>
                <SelectContent>
                  {espacosData?.map((espaco) => (
                    <SelectItem key={espaco.id} value={espaco.id}>
                      <div className="flex flex-col">
                        <span>{espaco.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {espaco.cidade} - Capacidade: {espaco.capacidade_maxima}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="valor_estimado_proposta">Valor Estimado</Label>
              <Input 
                type="number" 
                step="0.01"
                {...registerFila('valor_estimado_proposta', { valueAsNumber: true })} 
                placeholder="0,00" 
              />
            </div>
            
            <div>
              <Label htmlFor="motivo_espera">Motivo da Espera *</Label>
              <Textarea 
                {...registerFila('motivo_espera', { required: true })} 
                placeholder="Por que o cliente está na fila de espera?" 
              />
              {errorsFila.motivo_espera && (
                <span className="text-sm text-red-500">Motivo é obrigatório</span>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNovaFila(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Adicionar à Fila
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}