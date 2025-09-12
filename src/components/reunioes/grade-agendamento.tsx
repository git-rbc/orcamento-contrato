'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, User, MapPin,
  Calendar as CalendarIcon, Timer, Hourglass, Save, X
} from 'lucide-react';
import { format, addDays, subDays, parseISO, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';

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
  confirmada_cliente?: boolean;
  confirmada_vendedor?: boolean;
  observacoes?: string;
}

interface LocalAtendimento {
  id: string;
  nome: string;
  codigo: string;
  cor: string;
}

interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

interface GradeAgendamentoProps {
  eventos: EventoIntegrado[];
  onSlotClick: (data: string, hora: string, vendedor?: string) => void;
  locaisAtendimento: LocalAtendimento[];
  currentDate: Date;
  onNavigate: (date: Date) => void;
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
}

interface AgendamentoData {
  cliente_id: string;
  cliente_nome: string;
  telefone: string;
  vendedor_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local_atendimento: string;
  status_local: string;
  cidade: string;
  tipo: 'reuniao' | 'reserva_temporaria' | 'fila_espera';
  observacoes: string;
}

// Status/Locais disponíveis conforme planilha
const STATUS_LOCAIS = [
  { valor: 'online', nome: '🟠 ONLINE', cor: '#F97316', categoria: 'online' },
  { valor: 'itapema', nome: '🟡 ITAPEMA', cor: '#EAB308', categoria: 'cidade' },
  { valor: 'joinville', nome: '🟢 JOINVILLE', cor: '#22C55E', categoria: 'cidade' },
  { valor: 'florianopolis', nome: '🟣 FLORIANÓPOLIS', cor: '#8B5CF6', categoria: 'cidade' },
  { valor: 'blumenau', nome: '🟤 BLUMENAU', cor: '#A16207', categoria: 'cidade' },
  { valor: 'nova_veneza', nome: '⚪ NOVA VENEZA', cor: '#E5E7EB', categoria: 'cidade' },
  { valor: 'atend_pessoal', nome: '🔵 ATEND. PESSOAL / REUN. SEMANAL', cor: '#3B82F6', categoria: 'especial' },
  { valor: 'treinamento', nome: '⚫ TREINAMENTO', cor: '#1F2937', categoria: 'especial' }
];

// Cidades disponíveis para atendimento presencial
const CIDADES = [
  { valor: 'itapema', nome: 'Itapema' },
  { valor: 'joinville', nome: 'Joinville' },
  { valor: 'florianopolis', nome: 'Florianópolis' },
  { valor: 'blumenau', nome: 'Blumenau' },
  { valor: 'nova_veneza', nome: 'Nova Veneza' }
];

export function GradeAgendamento({ 
  eventos, 
  onSlotClick, 
  locaisAtendimento,
  currentDate,
  onNavigate
}: GradeAgendamentoProps) {
  
  // Debug log inicial
  console.log('GradeAgendamento - Props recebidas:', {
    totalEventos: eventos.length,
    eventos: eventos.slice(0, 3).map(e => ({ cliente: e.cliente_nome, vendedor: e.vendedor_nome, data: e.data, hora: e.hora_inicio })),
    currentDate: format(currentDate, 'yyyy-MM-dd')
  });
  const [showAgendamento, setShowAgendamento] = useState(false);
  const [tipoPeriodo, setTipoPeriodo] = useState<'dia' | 'semana'>('semana');
  const [slotSelecionado, setSlotSelecionado] = useState<{data: string, hora: string, vendedor?: string} | null>(null);
  const [eventoEditando, setEventoEditando] = useState<EventoIntegrado | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [agendamentoData, setAgendamentoData] = useState<AgendamentoData>({
    cliente_id: '',
    cliente_nome: '',
    telefone: '',
    vendedor_id: '',
    data: '',
    hora_inicio: '',
    hora_fim: '',
    local_atendimento: 'online',
    status_local: 'online',
    cidade: '',
    tipo: 'reuniao',
    observacoes: ''
  });

  // Carregar vendedores do banco de dados
  useEffect(() => {
    loadVendedores();
  }, []);
  
  // Debug log quando vendedores ou eventos mudam
  useEffect(() => {
    console.log('Estado atualizado:', {
      vendedores: vendedores.length,
      eventos: eventos.length,
      eventosHoje: eventos.filter(e => e.data === format(new Date(), 'yyyy-MM-dd')).length
    });
  }, [vendedores, eventos]);
  
  // Carregar clientes quando modal abrir
  useEffect(() => {
    if (showAgendamento && clientes.length === 0) {
      loadClientes();
    }
  }, [showAgendamento]);
  
  async function loadVendedores() {
    try {
      setLoading(true);
      const response = await fetch('/api/agendamento/vendedores');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Vendedores carregados:', data.vendedores);
        setVendedores(data.vendedores || []);
      } else {
        console.error('Erro ao carregar vendedores');
        toast({
          title: 'Aviso',
          description: 'Erro ao carregar lista de vendedores',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function loadClientes() {
    try {
      setLoadingClientes(true);
      const response = await fetch('/api/agendamento/clientes');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Clientes carregados:', data.clientes);
        setClientes(data.clientes || []);
      } else {
        console.error('Erro ao carregar clientes');
        toast({
          title: 'Aviso',
          description: 'Erro ao carregar lista de clientes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  }

  // Horários da grade (8:00 às 18:00)
  // Horários da grade (09:00 às 22:00, intervalos de 1h conforme planilha)
  const horarios = useMemo(() => {
    const horas = [];
    for (let h = 9; h <= 22; h++) {
      horas.push(`${h.toString().padStart(2, '0')}:00`);
    }
    console.log('Horários gerados (9h-22h):', horas);
    return horas;
  }, []);

  // Datas baseadas no tipo de período selecionado
  const diasPeriodo = useMemo(() => {
    const inicio = startOfDay(currentDate);
    const dias = [];
    const numeroDias = tipoPeriodo === 'dia' ? 1 : 7;
    
    for (let i = 0; i < numeroDias; i++) {
      dias.push(addDays(inicio, i));
    }
    console.log(`Dias do período (${tipoPeriodo}):`, dias.map(d => format(d, 'dd/MM')));
    return dias;
  }, [currentDate, tipoPeriodo]);

  // Organizar eventos por data e hora (para nova estrutura por dias)
  const eventosOrganizados = useMemo(() => {
    const organizados: Record<string, EventoIntegrado[]> = {};
    
    console.log('Debug - Processando eventos para múltiplos dias:', {
      totalEventos: eventos.length,
      periodoSelecionado: tipoPeriodo,
      diasPeriodo: diasPeriodo.length
    });
    
    eventos.forEach(evento => {
      // Normalizar hora_inicio para formato HH:MM (remover segundos se existir)
      const horaNormalizada = evento.hora_inicio.substring(0, 5);
      const chave = `${evento.data}_${horaNormalizada}`;
      
      if (!organizados[chave]) {
        organizados[chave] = [];
      }
      organizados[chave].push(evento);
    });
    
    console.log('Eventos organizados por data/hora:', Object.keys(organizados).length);
    return organizados;
  }, [eventos, diasPeriodo, tipoPeriodo]);

  // Cores específicas por status/local conforme planilha
  function getCorPorStatus(status: string): string {
    const statusLocal = STATUS_LOCAIS.find(s => s.valor === status);
    return statusLocal?.cor || '#6B7280'; // Gray-500 padrão
  }
  
  // Função para identificar status pelo nome do local (para eventos existentes)
  function identificarStatusPorLocal(localNome: string): string {
    const nome = localNome?.toUpperCase() || '';
    
    if (nome.includes('ONLINE')) return 'online';
    if (nome.includes('ITAPEMA')) return 'itapema';
    if (nome.includes('JOINVILLE')) return 'joinville';
    if (nome.includes('FLORIAN') || nome.includes('FLORIANÓPOLIS')) return 'florianopolis';
    if (nome.includes('BLUMENAU')) return 'blumenau';
    if (nome.includes('ATEND. PESSOAL') || nome.includes('REUN. SEMANAL')) return 'atend_pessoal';
    if (nome.includes('TREINAMENTO')) return 'treinamento';
    if (nome.includes('NOVA VENEZA')) return 'nova_veneza';
    
    return 'online'; // Padrão
  }

  // Função para verificar conflitos de horário/cidade
  function verificarConflito(data: string, hora: string) {
    const horaFormatada = hora.substring(0, 5);
    
    // Buscar eventos no mesmo horário (qualquer vendedor)
    const eventosNoHorario = eventos.filter(evento => {
      const eventoHora = evento.hora_inicio.substring(0, 5);
      return evento.data === data && eventoHora === horaFormatada;
    });
    
    // Se há eventos no mesmo horário, verificar se há conflito de cidade
    for (const evento of eventosNoHorario) {
      // Se evento for presencial e tiver cidade definida
      if (evento.local_atendimento === 'presencial' && evento.local_nome && evento.local_nome !== 'ONLINE') {
        return {
          hasConflict: true,
          cidade: evento.local_nome,
          evento: evento.cliente_nome
        };
      }
    }
    
    return { hasConflict: false };
  }

  function handleSlotClick(data: string, hora: string, vendedorId: string, vendedorNome: string) {
    const dataFormatada = format(parseISO(data), 'yyyy-MM-dd');
    const horaFim = calcularHoraFim(hora);
    
    // Verificar conflitos de horário/cidade
    const conflito = verificarConflito(dataFormatada, hora);
    
    setSlotSelecionado({ data: dataFormatada, hora, vendedor: vendedorNome });
    setAgendamentoData({
      cliente_id: '',
      cliente_nome: '',
      telefone: '',
      vendedor_id: vendedorId,
      data: dataFormatada,
      hora_inicio: hora,
      hora_fim: horaFim,
      local_atendimento: 'online',
      status_local: 'online',
      cidade: '',
      tipo: conflito.hasConflict ? 'fila_espera' : 'reuniao',
      observacoes: ''
    });
    
    // Mostrar notificação se há conflito
    if (conflito.hasConflict) {
      toast({
        title: "Conflito de Horário Detectado",
        description: `Já existe agendamento às ${hora} em ${conflito.cidade}. Será adicionado à fila de espera automaticamente.`,
        variant: "default"
      });
    }
    
    setShowAgendamento(true);
  }

  function handleEventoClick(evento: EventoIntegrado) {
    console.log('Abrindo evento para edição:', evento);
    console.log('Dados do evento completos:', {
      id: evento.id,
      cliente_nome: evento.cliente_nome,
      vendedor_nome: evento.vendedor_nome,
      local_nome: evento.local_nome,
      cidade: evento.cidade,
      tipo_evento: evento.tipo_evento,
      hora_inicio: evento.hora_inicio,
      hora_fim: evento.hora_fim,
      data: evento.data,
      local_atendimento: evento.local_atendimento
    });
    
    // Encontrar o vendedor correspondente
    const vendedor = vendedores.find(v => v.nome === evento.vendedor_nome);
    console.log('Vendedor encontrado:', vendedor);
    
    // Tentar encontrar o cliente por nome
    const cliente = clientes.find(c => c.nome === evento.cliente_nome);
    console.log('Cliente encontrado:', cliente);
    console.log('Clientes disponíveis:', clientes.map(c => ({ id: c.id, nome: c.nome })));
    
    setEventoEditando(evento);
    setModoEdicao(true);
    setSlotSelecionado({ 
      data: evento.data, 
      hora: evento.hora_inicio.substring(0, 5), 
      vendedor: evento.vendedor_nome 
    });
    
    // Preencher o formulário com os dados do evento existente
    const dadosFormulario = {
      cliente_id: cliente?.id || '', // Usar ID do cliente se encontrado
      cliente_nome: evento.cliente_nome,
      telefone: cliente?.telefone || '',
      vendedor_id: vendedor?.id || '',
      data: evento.data,
      hora_inicio: evento.hora_inicio.substring(0, 5),
      hora_fim: evento.hora_fim?.substring(0, 5) || calcularHoraFim(evento.hora_inicio.substring(0, 5)),
      local_atendimento: evento.local_atendimento || '',
      status_local: identificarStatusPorLocal(evento.local_nome),
      cidade: evento.cidade || '',
      tipo: evento.tipo_evento || 'reuniao',
      observacoes: evento.observacoes || ''
    };
    
    console.log('Dados do formulário sendo setados:', dadosFormulario);
    setAgendamentoData(dadosFormulario);
    
    setShowAgendamento(true);
  }
  
  function handleClienteChange(clienteId: string) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setAgendamentoData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente_nome: cliente.nome,
        telefone: cliente.telefone || ''
      }));
    }
  }
  
  function handleTipoAtendimentoChange(tipo: string) {
    setAgendamentoData(prev => ({
      ...prev,
      local_atendimento: tipo,
      // Reset campos dependentes
      status_local: tipo === 'online' ? 'online' : 'itapema',
      cidade: tipo === 'presencial' ? 'itapema' : ''
    }));
  }

  function calcularHoraFim(horaInicio: string): string {
    const [h, m] = horaInicio.split(':').map(Number);
    const horaFim = h + 1;
    return `${horaFim.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  async function handleSalvarAgendamento() {
    try {
      // Validação do cliente
      if (!agendamentoData.cliente_id) {
        toast({
          title: 'Erro',
          description: 'Selecione um cliente',
          variant: 'destructive'
        });
        return;
      }

      // Validação da cidade para atendimento presencial
      if (agendamentoData.local_atendimento === 'presencial' && !agendamentoData.cidade) {
        toast({
          title: 'Erro',
          description: 'Selecione uma cidade para atendimento presencial',
          variant: 'destructive'
        });
        return;
      }

      const endpoint = '/api/agendamento/agenda-integrada';
      const dados = {
        acao: agendamentoData.tipo === 'reuniao' ? 'criar_reuniao' : 
              agendamentoData.tipo === 'reserva_temporaria' ? 'criar_reserva' : 'criar_fila',
        dados: {
          cliente_id: agendamentoData.cliente_id,
          cliente_nome: agendamentoData.cliente_nome,
          telefone: agendamentoData.telefone,
          vendedor_id: agendamentoData.vendedor_id,
          vendedor_nome: slotSelecionado?.vendedor,
          data: agendamentoData.data,
          hora_inicio: agendamentoData.hora_inicio,
          hora_fim: agendamentoData.hora_fim,
          local_atendimento: agendamentoData.local_atendimento,
          status_local: agendamentoData.status_local,
          cidade: agendamentoData.cidade,
          observacoes: agendamentoData.observacoes
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: `${agendamentoData.tipo === 'reuniao' ? 'Reunião' : 
                       agendamentoData.tipo === 'reserva_temporaria' ? 'Reserva' : 
                       'Fila de espera'} agendada com sucesso`
        });
        setShowAgendamento(false);
        // Aqui deveria recarregar os dados
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao agendar');
      }
    } catch (error) {
      console.error('Erro ao agendar:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao agendar',
        variant: 'destructive'
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Navegação da semana */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Grade de Agendamento - {tipoPeriodo === 'dia' ? 'Dia' : 'Semana'}
            </CardTitle>
            <div className="flex gap-2">
              <Select value={tipoPeriodo} onValueChange={(value: 'dia' | 'semana') => setTipoPeriodo(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">📅 Por Dia</SelectItem>
                  <SelectItem value="semana">📆 Por Semana</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => onNavigate(subDays(currentDate, tipoPeriodo === 'dia' ? 1 : 7))}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate(addDays(currentDate, tipoPeriodo === 'dia' ? 1 : 7))}>
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {tipoPeriodo === 'dia' ? (
              `Dia: ${format(currentDate, 'dd/MM/yyyy', { locale: ptBR })}`
            ) : (
              `Semana: ${format(diasPeriodo[0], 'dd/MM', { locale: ptBR })} a ${format(diasPeriodo[6], 'dd/MM/yyyy', { locale: ptBR })}`
            )} | {vendedores.length} vendedores ativos
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Cabeçalho da grade - NOVA ESTRUTURA POR DIAS */}
              <div className="border rounded-lg overflow-hidden">
                {/* Header com dias da semana */}
                <div className="grid gap-1 p-2 bg-muted/30 border-b" style={{ gridTemplateColumns: '80px repeat(' + diasPeriodo.length + ', minmax(120px, 1fr))' }}>
                  <div className="p-2 text-sm font-medium text-center">
                    Horário
                  </div>
                  {diasPeriodo.map((dia) => {
                    const dataStr = format(dia, 'yyyy-MM-dd');
                    const eventosDia = eventos.filter(e => e.data === dataStr).length;
                    const isToday = isSameDay(dia, new Date());
                    
                    return (
                      <div key={dataStr} className={`p-1 text-sm font-medium text-center rounded border ${
                        isToday ? 'bg-primary/10 border-primary/20' : 'bg-background'
                      }`}>
                        <div className={`font-semibold ${isToday ? 'text-primary' : ''}`}>
                          {format(dia, 'EEE', { locale: ptBR }).toUpperCase()}
                        </div>
                        <div className={`text-xs ${isToday ? 'text-primary' : 'text-muted-foreground'} mt-1`}>
                          {format(dia, 'dd/MM')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {eventosDia} eventos
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Grade de horários - UMA LINHA POR HORÁRIO */}
                <div className="divide-y">
                  {horarios.map((hora) => (
                    <div 
                      key={hora} 
                      className="grid gap-1 p-1 hover:bg-muted/20 transition-colors" 
                      style={{ gridTemplateColumns: '80px repeat(' + diasPeriodo.length + ', minmax(120px, 1fr))' }}
                    >
                      {/* Coluna de horário */}
                      <div className="p-2 text-sm font-medium text-center border-r flex items-center justify-center bg-muted/10">
                        <Clock className="h-3 w-3 mr-1" />
                        {hora}
                      </div>
                      
                      {/* Slots por dia */}
                      {diasPeriodo.map((dia) => {
                        const dataStr = format(dia, 'yyyy-MM-dd');
                        const chaveEvento = `${dataStr}_${hora}`;
                        const eventosSlot = eventosOrganizados[chaveEvento] || [];
                        
                        if (eventosSlot.length > 0) {
                          // Slot ocupado - mostrar eventos
                          const primeiroEvento = eventosSlot[0];
                          const statusLocal = identificarStatusPorLocal(primeiroEvento.local_nome);
                          const cor = getCorPorStatus(statusLocal);
                          
                          return (
                            <div key={dataStr} className="m-1 p-2 relative" style={{ minHeight: '60px' }}>
                              {eventosSlot.slice(0, 2).map((evento, index) => (
                                <div
                                  key={evento.id}
                                  className={`mb-1 p-1 rounded cursor-pointer hover:opacity-90 text-white text-xs transition-all ${
                                    index > 0 ? 'ml-2' : ''
                                  }`}
                                  style={{ 
                                    backgroundColor: getCorPorStatus(identificarStatusPorLocal(evento.local_nome)),
                                    opacity: evento.tipo_evento === 'fila_espera' ? 0.8 : 1,
                                    border: evento.tipo_evento === 'reserva_temporaria' ? '2px dashed rgba(255,255,255,0.9)' : 'none',
                                    minHeight: '28px'
                                  }}
                                  title={`${evento.cliente_nome} - ${evento.vendedor_nome} - ${evento.status}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventoClick(evento);
                                  }}
                                >
                                  <div className="font-semibold truncate text-xs">
                                    {evento.cliente_nome}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs opacity-90 truncate">
                                      {evento.vendedor_nome?.split(' ')[0]}
                                    </span>
                                    <span className="text-xs">
                                      {evento.tipo_evento === 'reuniao' ? '📅' :
                                       evento.tipo_evento === 'reserva_temporaria' ? '⏰' : '⏳'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {eventosSlot.length > 2 && (
                                <div className="text-xs text-muted-foreground text-center mt-1">
                                  +{eventosSlot.length - 2} mais
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Slot vazio - clicável para agendar
                          return (
                            <div
                              key={dataStr}
                              className="m-1 p-2 border-2 border-dashed border-muted-foreground/30 rounded cursor-pointer hover:border-primary hover:bg-primary/5 text-center transition-all group"
                              onClick={() => handleSlotClick(dataStr, hora, '', '')}
                              title={`Agendar para ${format(dia, 'dd/MM', { locale: ptBR })} às ${hora}`}
                              style={{ minHeight: '60px' }}
                            >
                              <div className="flex flex-col items-center justify-center h-full">
                                <Plus className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary mb-1" />
                                <span className="text-xs text-muted-foreground/70 group-hover:text-primary">Agendar</span>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Agendamento */}
      <Dialog open={showAgendamento} onOpenChange={(open) => {
        setShowAgendamento(open);
        if (!open) {
          setModoEdicao(false);
          setEventoEditando(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modoEdicao ? (
                <>
                  <CalendarIcon className="h-5 w-5" />
                  Editar Agendamento
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Novo Agendamento
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Informações do slot */}
            {slotSelecionado && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">Slot Selecionado:</div>
                <div className="text-sm text-muted-foreground">
                  📅 {format(parseISO(slotSelecionado.data), 'dd/MM/yyyy', { locale: ptBR })} às {slotSelecionado.hora}
                  <br />
                  👤 {slotSelecionado.vendedor}
                </div>
              </div>
            )}

            {/* Tipo de agendamento */}
            <div>
              <Label>Tipo de Agendamento</Label>
              <Select value={agendamentoData.tipo} onValueChange={(value: any) => 
                setAgendamentoData(prev => ({ ...prev, tipo: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reuniao">📅 Reunião Confirmada</SelectItem>
                  <SelectItem value="reserva_temporaria">⏰ Reserva Temporária (48h)</SelectItem>
                  <SelectItem value="fila_espera">⏳ Fila de Espera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seleção do Cliente */}
            <div>
              <Label>Cliente *</Label>
              {loadingClientes ? (
                <div className="p-2 text-sm text-muted-foreground">Carregando clientes...</div>
              ) : (
                <Select value={agendamentoData.cliente_id} onValueChange={handleClienteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      agendamentoData.cliente_nome && !agendamentoData.cliente_id ? 
                        agendamentoData.cliente_nome : 
                        "Selecione um cliente"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {modoEdicao && agendamentoData.cliente_nome && !agendamentoData.cliente_id && (
                      <SelectItem value="__current_client__" disabled>
                        <div className="flex flex-col">
                          <span className="font-medium text-amber-600">
                            {agendamentoData.cliente_nome} (Cliente do evento)
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Cliente não encontrado na base atual
                          </span>
                        </div>
                      </SelectItem>
                    )}
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{cliente.nome}</span>
                          {cliente.telefone && (
                            <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {agendamentoData.cliente_nome && (
                <div className={`text-sm mt-1 ${
                  agendamentoData.cliente_id ? 'text-muted-foreground' : 'text-amber-600'
                }`}>
                  {agendamentoData.cliente_id ? 'Selecionado:' : 'Cliente do evento:'} {agendamentoData.cliente_nome}
                  {agendamentoData.telefone && ` - ${agendamentoData.telefone}`}
                  {!agendamentoData.cliente_id && modoEdicao && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Para alterar o cliente, selecione um da lista acima
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Tipo de Atendimento */}
            <div>
              <Label>Tipo de Atendimento *</Label>
              <Select value={agendamentoData.local_atendimento} onValueChange={handleTipoAtendimentoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">💻 Online</SelectItem>
                  <SelectItem value="presencial">🏢 Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Cidade (se presencial) */}
            {agendamentoData.local_atendimento === 'presencial' && (
              <div>
                <Label>Cidade *</Label>
                <Select value={agendamentoData.status_local || agendamentoData.cidade} onValueChange={(value) => 
                  setAgendamentoData(prev => ({ 
                    ...prev, 
                    cidade: value,
                    status_local: value
                  }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CIDADES.map((cidade) => (
                      <SelectItem key={cidade.valor} value={cidade.valor}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getCorPorStatus(cidade.valor) }}
                          />
                          {cidade.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {modoEdicao && agendamentoData.cidade && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Cidade original: {agendamentoData.cidade}
                  </div>
                )}
              </div>
            )}
            
            {/* Tipo Especial */}
            <div>
              <Label>Tipo Especial (Opcional)</Label>
              <Select value={agendamentoData.status_local} onValueChange={(value) => 
                setAgendamentoData(prev => ({ ...prev, status_local: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Normal ou especial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={agendamentoData.local_atendimento === 'online' ? 'online' : agendamentoData.cidade || 'itapema'}>
                    Normal ({agendamentoData.local_atendimento === 'online' ? 'Online' : (CIDADES.find(c => c.valor === agendamentoData.cidade)?.nome || 'Cidade')})
                  </SelectItem>
                  <SelectItem value="treinamento">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-800" />
                      ⚫ Treinamento
                    </div>
                  </SelectItem>
                  <SelectItem value="atend_pessoal">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      🔵 Atendimento Pessoal / Reunião Semanal
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground mt-1">
                Cor na grade: 
                <span 
                  className="inline-block w-3 h-3 rounded-full ml-1 align-middle" 
                  style={{ backgroundColor: getCorPorStatus(agendamentoData.status_local) }}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Input
                value={agendamentoData.observacoes}
                onChange={(e) => setAgendamentoData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Informações adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAgendamento(false);
              setModoEdicao(false);
              setEventoEditando(null);
            }}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSalvarAgendamento}>
              <Save className="h-4 w-4 mr-2" />
              {modoEdicao ? 'Salvar Alterações' : 'Agendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}