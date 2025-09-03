'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { 
  Calendar, Clock, Users, MapPin, Video, Phone, Mail, 
  MoreVertical, Edit, Trash, CheckCircle, XCircle,
  Filter, Search, Plus, Download, RefreshCw, Eye,
  MessageCircle, MessageSquare, Calendar as CalendarIcon,
  AlertCircle, UserCheck, Building, Home
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, parseISO, isToday, addDays, startOfToday, endOfDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase';
import { DataTable } from '@/components/ui/data-table';
import { useReunioes, type Reuniao, type ReuniaoFilters } from '@/hooks/useReunioes';

// Interfaces movidas para useReunioes hook

type TabView = 'hoje' | 'proximas' | 'sem_resposta' | 'confirmadas' | 'canceladas' | 'reagendadas';

interface ConfirmacaoModal {
  isOpen: boolean;
  reuniao?: Reuniao;
  canal: 'whatsapp' | 'sms' | 'email' | null;
}

interface ReagendarModal {
  isOpen: boolean;
  reuniao?: Reuniao;
}

interface CancelarModal {
  isOpen: boolean;
  reuniao?: Reuniao;
}

interface ReuniaoListProps {
  onEdit?: (reuniao: Reuniao) => void;
  onDelete?: (reuniao: Reuniao) => void;
  onView?: (reuniao: Reuniao) => void;
  onNew?: () => void;
  showActions?: boolean;
  filtros?: ReuniaoFilters;
  vendedorId?: string; // Para filtrar apenas reuniões do vendedor logado
}

export function ReunioesList({ 
  onEdit, 
  onDelete, 
  onView, 
  onNew, 
  showActions = true,
  filtros = {},
  vendedorId 
}: ReuniaoListProps) {
  const [filters, setFilters] = useState<ReuniaoFilters>(filtros);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [preVendedores, setPreVendedores] = useState<any[]>([]);
  const [locaisAtendimento, setLocaisAtendimento] = useState<any[]>([]);
  const [espacosSalas, setEspacosSalas] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('hoje');
  const [confirmacaoModal, setConfirmacaoModal] = useState<ConfirmacaoModal>({ isOpen: false, canal: null });
  const [reagendarModal, setReagendarModal] = useState<ReagendarModal>({ isOpen: false });
  const [cancelarModal, setCancelarModal] = useState<CancelarModal>({ isOpen: false });
  const [motivo, setMotivo] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novaHoraInicio, setNovaHoraInicio] = useState('');
  const [novaHoraFim, setNovaHoraFim] = useState('');

  const { 
    reunioes, 
    tiposReuniao, 
    loading, 
    error, 
    fetchReuniones, 
    confirmarReuniao, 
    reagendarReuniao, 
    cancelReuniao,
    enviarEmail
  } = useReunioes();

  const supabase = createClient();

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const tabFilters = getTabFilters(activeTab);
    fetchReuniones({ ...filters, ...tabFilters, vendedorId });
  }, [filters, vendedorId, activeTab, fetchReuniones]);

  // Filtros baseados na tab ativa
  const getTabFilters = (tab: TabView): Partial<ReuniaoFilters> => {
    const hoje = startOfToday();
    const proximos7Dias = addDays(hoje, 7);
    
    switch (tab) {
      case 'hoje':
        return {
          dataInicio: format(hoje, 'yyyy-MM-dd'),
          dataFim: format(hoje, 'yyyy-MM-dd')
        };
      case 'proximas':
        return {
          dataInicio: format(addDays(hoje, 1), 'yyyy-MM-dd'),
          dataFim: format(proximos7Dias, 'yyyy-MM-dd')
        };
      case 'sem_resposta':
        return { status: 'sem_resposta' };
      case 'confirmadas':
        return { status: 'confirmada' };
      case 'canceladas':
        return { status: 'cancelada' };
      case 'reagendadas':
        return { status: 'reagendada' };
      default:
        return {};
    }
  };

  // Reuniões filtradas baseadas na tab atual
  const reunioesFiltradas = useMemo(() => {
    if (!reunioes || !Array.isArray(reunioes)) return [];
    
    let filtradas = [...reunioes];
    
    // Aplicar filtro de busca local
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtradas = filtradas.filter((reuniao: Reuniao) =>
        reuniao.titulo?.toLowerCase().includes(searchLower) ||
        reuniao.cliente_nome?.toLowerCase().includes(searchLower) ||
        reuniao.vendedor_nome?.toLowerCase().includes(searchLower) ||
        reuniao.pre_vendedor_nome?.toLowerCase().includes(searchLower) ||
        reuniao.tipo_reuniao_nome?.toLowerCase().includes(searchLower) ||
        reuniao.cliente_telefone?.toLowerCase().includes(searchLower) ||
        reuniao.cliente_email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenar por data/hora (mais próximas primeiro)
    filtradas.sort((a, b) => {
      const dateTimeA = new Date(`${a.data}T${a.hora_inicio}`);
      const dateTimeB = new Date(`${b.data}T${b.hora_inicio}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
    
    return filtradas;
  }, [reunioes, filters.search]);

  async function loadFilterOptions() {
    try {
      // Carregar vendedores
      const { data: vendedoresData } = await supabase
        .from('users')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setVendedores(vendedoresData || []);

      // Carregar pré-vendedores (usuários com role pré-vendedor)
      const { data: preVendedoresData } = await supabase
        .from('users')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setPreVendedores(preVendedoresData || []);

      // Carregar locais de atendimento
      const locaisResponse = await fetch('/api/locais-atendimento');
      const { data: locaisData } = await locaisResponse.json();
      setLocaisAtendimento(locaisData || []);

      // Carregar espaços/salas
      const espacosResponse = await fetch('/api/espacos-salas');
      const { data: espacosData } = await espacosResponse.json();
      setEspacosSalas(espacosData || []);
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error);
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
      case 'nao_compareceu': return 'Não Compareceu';
      case 'sem_resposta': return 'Sem Resposta';
      default: return 'Desconhecido';
    }
  }

  function getLocalColor(cor?: string) {
    return cor || '#6b7280'; // gray-500 como padrão
  }

  function formatDateTime(data: string, hora: string) {
    try {
      const dateTime = new Date(`${data}T${hora}`);
      return format(dateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return `${data} às ${hora}`;
    }
  }

  // Handlers para ações rápidas
  const handleConfirmarPorCanal = async (reuniao: Reuniao, canal: 'whatsapp' | 'sms' | 'email') => {
    try {
      // Enviar confirmação pelo canal escolhido
      const response = await fetch('/api/reunioes/confirmacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reuniao_id: reuniao.id,
          canal,
          tipo: 'confirmacao'
        })
      });

      if (!response.ok) throw new Error('Erro ao enviar confirmação');

      toast({
        title: 'Confirmação enviada',
        description: `Confirmação enviada por ${canal} para ${reuniao.cliente_nome}`
      });

      // Recarregar dados
      const tabFilters = getTabFilters(activeTab);
      fetchReuniones({ ...filters, ...tabFilters, vendedorId });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar confirmação',
        variant: 'destructive'
      });
    }
  };

  // Handler para confirmar reunião diretamente (sem modal)
  const handleConfirmar = async (id: string, tipo: 'cliente' | 'vendedor') => {
    try {
      await confirmarReuniao(id, tipo);
      
      toast({
        title: 'Reunião confirmada',
        description: `Reunião confirmada pelo ${tipo} com sucesso!`
      });

      // Recarregar dados
      const tabFilters = getTabFilters(activeTab);
      fetchReuniones({ ...filters, ...tabFilters, vendedorId });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao confirmar reunião',
        variant: 'destructive'
      });
    }
  };

  const handleReagendar = async () => {
    if (!reagendarModal.reuniao || !novaData || !novaHoraInicio || !novaHoraFim) return;

    try {
      await reagendarReuniao(
        reagendarModal.reuniao.id,
        novaData,
        novaHoraInicio,
        novaHoraFim,
        motivo
      );

      toast({
        title: 'Reunião reagendada',
        description: 'Reunião reagendada com sucesso'
      });

      setReagendarModal({ isOpen: false });
      setMotivo('');
      setNovaData('');
      setNovaHoraInicio('');
      setNovaHoraFim('');
      
      // Recarregar dados
      const tabFilters = getTabFilters(activeTab);
      fetchReuniones({ ...filters, ...tabFilters, vendedorId });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao reagendar reunião',
        variant: 'destructive'
      });
    }
  };

  const handleCancelar = async () => {
    if (!cancelarModal.reuniao) return;

    try {
      await cancelReuniao(cancelarModal.reuniao.id);

      toast({
        title: 'Reunião cancelada',
        description: 'Reunião cancelada com sucesso'
      });

      setCancelarModal({ isOpen: false });
      setMotivo('');
      
      // Recarregar dados
      const tabFilters = getTabFilters(activeTab);
      fetchReuniones({ ...filters, ...tabFilters, vendedorId });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar reunião',
        variant: 'destructive'
      });
    }
  };

  const handleCheckIn = async (reuniao: Reuniao) => {
    try {
      const response = await fetch('/api/reunioes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reuniao.id,
          status: 'em_andamento'
        })
      });

      if (!response.ok) throw new Error('Erro ao fazer check-in');

      toast({
        title: 'Check-in realizado',
        description: 'Reunião marcada como em andamento'
      });

      // Recarregar dados
      const tabFilters = getTabFilters(activeTab);
      fetchReuniones({ ...filters, ...tabFilters, vendedorId });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao fazer check-in',
        variant: 'destructive'
      });
    }
  };

  const handleEnviarLembrete = async (reuniao: Reuniao) => {
    try {
      await enviarEmail(reuniao.id, 'lembrete');
      
      toast({
        title: 'Lembrete enviado',
        description: `Lembrete enviado para ${reuniao.cliente_nome}`
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar lembrete',
        variant: 'destructive'
      });
    }
  };

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      render: (value: any, reuniao: Reuniao) => (
        <div className="font-mono text-sm">
          #{reuniao.id.slice(-6).toUpperCase()}
        </div>
      ),
    },
    {
      key: 'cliente_nome',
      header: 'Cliente',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {reuniao.cliente_nome?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col max-w-48">
            <span className="font-medium truncate" title={reuniao.cliente_nome}>
              {reuniao.cliente_nome}
            </span>
            <div className="flex flex-col text-xs text-muted-foreground">
              {reuniao.cliente_email && (
                <span className="truncate" title={reuniao.cliente_email}>
                  {reuniao.cliente_email}
                </span>
              )}
              {reuniao.cliente_telefone && (
                <span className="truncate" title={reuniao.cliente_telefone}>
                  {reuniao.cliente_telefone}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'local',
      header: 'Local',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: getLocalColor(reuniao.local_atendimento_cor) }}
          />
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {reuniao.local_atendimento_nome || 'Não definido'}
            </span>
            <span className="text-xs text-muted-foreground">
              {reuniao.espaco_nome}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'pre_vendedor_nome',
      header: 'Pré-vendedor',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex items-center gap-1">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {reuniao.pre_vendedor_nome || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'vendedor_nome',
      header: 'Vendedor',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {reuniao.vendedor_nome}
          </span>
        </div>
      ),
    },
    {
      key: 'data',
      header: 'Data/Hora',
      render: (value: any, reuniao: Reuniao) => {
        const dataAtual = new Date();
        const dataReuniao = new Date(`${reuniao.data}T${reuniao.hora_inicio}`);
        const isHoje = isToday(dataReuniao);
        const isPast = dataReuniao < dataAtual;
        
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className={`font-medium text-sm ${
                isPast ? 'text-muted-foreground' : 
                isHoje ? 'text-blue-600 font-semibold' : 'text-foreground'
              }`}>
                {format(dataReuniao, 'dd/MM', { locale: ptBR })}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {reuniao.hora_inicio} - {reuniao.hora_fim}
            </span>
            {isHoje && (
              <Badge variant="outline" className="text-xs mt-1 w-fit px-1">
                Hoje
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (value: any, reuniao: Reuniao) => (
        <Badge 
          variant="outline" 
          className="text-xs"
          style={{ 
            borderColor: reuniao.tipo_reuniao_cor,
            color: reuniao.tipo_reuniao_cor
          }}
        >
          {reuniao.tipo_reuniao_nome}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex flex-col space-y-1">
          <Badge 
            className={`${getStatusColor(reuniao.status)} text-white text-xs`}
          >
            {getStatusLabel(reuniao.status)}
          </Badge>
          <div className="flex gap-1">
            {reuniao.confirmada_cliente && (
              <Badge variant="outline" className="text-xs px-1">
                Cliente ✓
              </Badge>
            )}
            {reuniao.confirmada_vendedor && (
              <Badge variant="outline" className="text-xs px-1">
                Vendedor ✓
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'origem_campanha',
      header: 'Origem/Campanha',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex flex-col space-y-1">
          {reuniao.cliente_origem && (
            <Badge variant="secondary" className="text-xs">
              {reuniao.cliente_origem}
            </Badge>
          )}
          {reuniao.cliente_campanha && (
            <span className="text-xs text-muted-foreground">
              {reuniao.cliente_campanha}
            </span>
          )}
          {!reuniao.cliente_origem && !reuniao.cliente_campanha && (
            <span className="text-xs text-muted-foreground italic">
              Não informado
            </span>
          )}
        </div>
      ),
    }
  ];

  if (showActions) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      render: (value: any, reuniao: Reuniao) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(reuniao)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
              )}
              
              {onEdit && reuniao.status !== 'cancelada' && (
                <DropdownMenuItem onClick={() => onEdit(reuniao)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => handleEnviarLembrete(reuniao)}
                disabled={reuniao.status === 'cancelada'}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar lembrete
              </DropdownMenuItem>
              
              {reuniao.status === 'agendada' && (
                <DropdownMenuItem onClick={() => handleCheckIn(reuniao)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Check-in
                </DropdownMenuItem>
              )}
              
              {reuniao.status !== 'cancelada' && reuniao.status !== 'concluida' && (
                <DropdownMenuItem 
                  onClick={() => {
                    setReagendarModal({ isOpen: true, reuniao });
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reagendar
                </DropdownMenuItem>
              )}
              
              {!reuniao.confirmada_cliente && reuniao.status === 'agendada' && (
                <DropdownMenuItem onClick={() => handleConfirmar(reuniao.id, 'cliente')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Cliente
                </DropdownMenuItem>
              )}
              
              {!reuniao.confirmada_vendedor && reuniao.status === 'agendada' && (
                <DropdownMenuItem onClick={() => handleConfirmar(reuniao.id, 'vendedor')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Vendedor
                </DropdownMenuItem>
              )}
              
              {reuniao.link_reuniao && (
                <DropdownMenuItem asChild>
                  <a href={reuniao.link_reuniao} target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-4 w-4" />
                    Entrar na reunião
                  </a>
                </DropdownMenuItem>
              )}
              
              {reuniao.cliente_email && (
                <DropdownMenuItem asChild>
                  <a href={`mailto:${reuniao.cliente_email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar email
                  </a>
                </DropdownMenuItem>
              )}
              
              {reuniao.status !== 'cancelada' && (
                <DropdownMenuItem 
                  onClick={() => {
                    setCancelarModal({ isOpen: true, reuniao });
                  }}
                  className="text-red-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reuniões</h2>
          <p className="text-muted-foreground">
            {reunioesFiltradas.length} de {reunioes.length} reunião{reunioes.length !== 1 ? 'ões' : ''} 
            {filters.search || Object.values(filters).some(v => v && v !== 'todos') ? 'filtrada' : 'encontrada'}{reunioes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReuniones({ ...filters, ...getTabFilters(activeTab), vendedorId })}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Exportar para CSV
              const csvContent = reunioesFiltradas.map(r => [
                r.id.slice(-6).toUpperCase(),
                r.cliente_nome,
                r.cliente_email,
                r.cliente_telefone,
                r.vendedor_nome,
                r.pre_vendedor_nome || '',
                formatDateTime(r.data, r.hora_inicio),
                r.hora_fim,
                r.tipo_reuniao_nome,
                getStatusLabel(r.status),
                r.local_atendimento_nome || '',
                r.espaco_nome || ''
              ].join(',')).join('\n');
              
              const header = 'Código,Cliente,Email,Telefone,Vendedor,Pré-vendedor,Data/Hora,Hora Fim,Tipo,Status,Local,Espaço\n';
              const blob = new Blob([header + csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `reunioes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          
          {onNew && (
            <Button onClick={onNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Reunião
            </Button>
          )}
        </div>
      </div>

      {/* Tabs de Visões */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabView)} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="hoje" className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            Hoje
          </TabsTrigger>
          <TabsTrigger value="proximas" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Próximas
          </TabsTrigger>
          <TabsTrigger value="sem_resposta" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Sem Resposta
          </TabsTrigger>
          <TabsTrigger value="confirmadas" className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Confirmadas
          </TabsTrigger>
          <TabsTrigger value="canceladas" className="flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            Canceladas
          </TabsTrigger>
          <TabsTrigger value="reagendadas" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Reagendadas
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Tabs */}
        <TabsContent value={activeTab} className="space-y-4">
          {/* Filtros Avançados */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros Avançados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Buscar</Label>
                    <Input
                      placeholder="Título, cliente, vendedor..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Unidade/Local</Label>
                    <Select 
                      value={filters.localAtendimento || 'todos'}
                      onValueChange={(value) => setFilters({ ...filters, localAtendimento: value === 'todos' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar local" />
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
                    <Label>Espaço/Sala</Label>
                    <Select 
                      value={filters.espacoSalaId || 'todos'}
                      onValueChange={(value) => setFilters({ ...filters, espacoSalaId: value === 'todos' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar espaço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os espaços</SelectItem>
                        {espacosSalas
                          .filter(espaco => !filters.localAtendimento || espaco.local_id === filters.localAtendimento)
                          .map((espaco) => (
                          <SelectItem key={espaco.id} value={espaco.id}>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              {espaco.nome} ({espaco.capacidade} pessoas)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!vendedorId && (
                    <div>
                      <Label>Vendedor</Label>
                      <Select 
                        value={filters.vendedorId || 'todos'}
                        onValueChange={(value) => setFilters({ ...filters, vendedorId: value === 'todos' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar vendedor" />
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
                  )}
                  
                  <div>
                    <Label>Pré-vendedor</Label>
                    <Select 
                      value={filters.preVendedorId || 'todos'}
                      onValueChange={(value) => setFilters({ ...filters, preVendedorId: value === 'todos' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar pré-vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os pré-vendedores</SelectItem>
                        {preVendedores.map((preVendedor) => (
                          <SelectItem key={preVendedor.id} value={preVendedor.id}>
                            {preVendedor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Tipo de Evento</Label>
                    <Select 
                      value={filters.tipoReuniaoId || 'todos'}
                      onValueChange={(value) => setFilters({ ...filters, tipoReuniaoId: value === 'todos' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        {tiposReuniao.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: tipo.cor }}
                              />
                              {tipo.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Origem</Label>
                    <Select 
                      value={filters.origem || 'todos'}
                      onValueChange={(value) => setFilters({ ...filters, origem: value === 'todos' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as origens</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Campanha</Label>
                    <Input
                      placeholder="Nome da campanha..."
                      value={filters.campanha || ''}
                      onChange={(e) => setFilters({ ...filters, campanha: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={filters.dataInicio || ''}
                      onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={filters.dataFim || ''}
                      onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={filters.status || 'todos'} 
                      onValueChange={(value) => setFilters({ ...filters, status: value === 'todos' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar status" />
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
                  
                  <div>
                    <Label>Confirmação</Label>
                    <Select 
                      value={filters.confirmada?.toString() || 'todos'} 
                      onValueChange={(value) => setFilters({ 
                        ...filters, 
                        confirmada: value === 'todos' ? undefined : value === 'true'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status confirmação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        <SelectItem value="true">Confirmadas</SelectItem>
                        <SelectItem value="false">Não confirmadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setFilters({})}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela */}
          <DataTable
            columns={columns}
            data={reunioesFiltradas}
            loading={loading}
            emptyMessage="Nenhuma reunião encontrada"
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {/* Modal de Reagendamento */}
      <Dialog open={reagendarModal.isOpen} onOpenChange={(open) => setReagendarModal({ isOpen: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nova-data">Nova Data</Label>
              <Input
                id="nova-data"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nova-hora-inicio">Hora Início</Label>
                <Input
                  id="nova-hora-inicio"
                  type="time"
                  value={novaHoraInicio}
                  onChange={(e) => setNovaHoraInicio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nova-hora-fim">Hora Fim</Label>
                <Input
                  id="nova-hora-fim"
                  type="time"
                  value={novaHoraFim}
                  onChange={(e) => setNovaHoraFim(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="motivo-reagendamento">Motivo (opcional)</Label>
              <Textarea
                id="motivo-reagendamento"
                placeholder="Motivo do reagendamento..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReagendarModal({ isOpen: false })}>
                Cancelar
              </Button>
              <Button onClick={handleReagendar}>
                Reagendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={cancelarModal.isOpen} onOpenChange={(open) => setCancelarModal({ isOpen: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja cancelar a reunião com {cancelarModal.reuniao?.cliente_nome}?
            </p>
            <div>
              <Label htmlFor="motivo-cancelamento">Motivo (opcional)</Label>
              <Textarea
                id="motivo-cancelamento"
                placeholder="Motivo do cancelamento..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelarModal({ isOpen: false })}>
                Não cancelar
              </Button>
              <Button variant="destructive" onClick={handleCancelar}>
                Sim, cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}