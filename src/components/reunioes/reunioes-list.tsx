'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, Clock, Users, MapPin, Video, Phone, Mail, 
  MoreVertical, Edit, Trash, CheckCircle, XCircle,
  Filter, Search, Plus, Download, RefreshCw, Eye
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase';
import { DataTable } from '@/components/ui/data-table';

interface Reuniao {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;
  status: string;
  cliente_nome: string;
  cliente_email: string;
  vendedor_nome: string;
  tipo_reuniao_nome: string;
  tipo_reuniao_cor: string;
  espaco_nome?: string;
  link_reuniao?: string;
  confirmada_cliente: boolean;
  confirmada_vendedor: boolean;
  observacoes?: string;
}

interface ReuniaoFilters {
  vendedorId?: string;
  clienteId?: string;
  status?: string;
  tipoReuniaoId?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
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
  const [reunioes, setReuniones] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReuniaoFilters>(filtros);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [tiposReuniao, setTiposReuniao] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters, vendedorId]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.append('data_fim', filters.dataFim);
      if (filters.vendedorId) params.append('vendedor_id', filters.vendedorId);
      if (filters.clienteId) params.append('cliente_id', filters.clienteId);
      if (filters.status) params.append('status', filters.status);
      if (filters.tipoReuniaoId) params.append('tipo_reuniao_id', filters.tipoReuniaoId);
      if (vendedorId) params.append('vendedor_id', vendedorId);

      const response = await fetch(`/api/reunioes?${params.toString()}`);
      const { data } = await response.json();
      
      let reunioesFiltradas = data || [];
      
      // Filtro de busca local
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        reunioesFiltradas = reunioesFiltradas.filter((reuniao: Reuniao) =>
          reuniao.titulo.toLowerCase().includes(searchLower) ||
          reuniao.cliente_nome.toLowerCase().includes(searchLower) ||
          reuniao.vendedor_nome.toLowerCase().includes(searchLower) ||
          reuniao.tipo_reuniao_nome.toLowerCase().includes(searchLower)
        );
      }
      
      setReuniones(reunioesFiltradas);
    } catch (error) {
      console.error('Erro ao carregar reuniões:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilterOptions() {
    try {
      // Carregar vendedores
      const { data: vendedoresData } = await supabase
        .from('users')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setVendedores(vendedoresData || []);

      // Carregar tipos de reunião
      const tiposResponse = await fetch('/api/reunioes/tipos');
      const { data: tiposData } = await tiposResponse.json();
      setTiposReuniao(tiposData || []);
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
      default: return 'Desconhecido';
    }
  }

  function formatDateTime(data: string, hora: string) {
    try {
      const dateTime = new Date(`${data}T${hora}`);
      return format(dateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return `${data} às ${hora}`;
    }
  }

  async function handleConfirmar(reuniaoId: string, tipo: 'cliente' | 'vendedor') {
    try {
      await fetch(`/api/reunioes/${reuniaoId}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_confirmacao: tipo })
      });
      loadData(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao confirmar reunião:', error);
    }
  }

  async function handleCancelar(reuniaoId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta reunião?')) return;
    
    try {
      await fetch(`/api/reunioes?id=${reuniaoId}`, {
        method: 'DELETE'
      });
      loadData(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao cancelar reunião:', error);
    }
  }

  const columns = [
    {
      key: 'data',
      header: 'Data/Hora',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {formatDateTime(reuniao.data, reuniao.hora_inicio)}
          </span>
          <span className="text-sm text-muted-foreground">
            até {reuniao.hora_fim}
          </span>
        </div>
      ),
    },
    {
      key: 'titulo',
      header: 'Reunião',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex flex-col space-y-1">
          <span className="font-medium">{reuniao.titulo}</span>
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: reuniao.tipo_reuniao_cor }}
            />
            <span className="text-sm text-muted-foreground">
              {reuniao.tipo_reuniao_nome}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'cliente_nome',
      header: 'Cliente',
      render: (value: any, reuniao: Reuniao) => {
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{reuniao.cliente_nome[0]}</AvatarFallback>
              <AvatarFallback>{reuniao.cliente_nome[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{reuniao.cliente_nome}</span>
              <span className="text-sm text-muted-foreground">
                {reuniao.cliente_email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'vendedor_nome',
      header: 'Vendedor',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex flex-col space-y-1">
          <Badge 
            className={`${getStatusColor(reuniao.status)} text-white`}
          >
            {getStatusLabel(reuniao.status)}
          </Badge>
          <div className="flex gap-1">
            {reuniao.confirmada_cliente && (
              <Badge variant="outline" className="text-xs">
                Cliente ✓
              </Badge>
            )}
            {reuniao.confirmada_vendedor && (
              <Badge variant="outline" className="text-xs">
                Vendedor ✓
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'local',
      header: 'Local',
      render: (value: any, reuniao: Reuniao) => (
        <div className="flex items-center gap-1 text-sm">
          {reuniao.espaco_nome ? (
            <>
              <MapPin className="h-4 w-4" />
              {reuniao.espaco_nome}
            </>
          ) : reuniao.link_reuniao ? (
            <>
              <Video className="h-4 w-4" />
              Online
            </>
          ) : (
            <span className="text-muted-foreground">Não definido</span>
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
                  onClick={() => handleCancelar(reuniao.id)}
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
            {reunioes.length} reunião{reunioes.length !== 1 ? 'ões' : ''} encontrada{reunioes.length !== 1 ? 's' : ''}
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
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          {onNew && (
            <Button onClick={onNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Reunião
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="reagendada">Reagendada</SelectItem>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
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
                <Label>Tipo de Reunião</Label>
                <Select 
                  value={filters.tipoReuniaoId || 'todos'}
                  onValueChange={(value) => setFilters({ ...filters, tipoReuniaoId: value === 'todos' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
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
        data={reunioes}
        loading={loading}
        emptyMessage="Nenhuma reunião encontrada"
      />
    </div>
  );
}