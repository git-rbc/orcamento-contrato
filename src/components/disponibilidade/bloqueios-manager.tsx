'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Ban, Calendar, Clock, Users, Plus, Edit, Trash, 
  Save, X, AlertCircle, Filter, RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataTable } from '@/components/ui/data-table';

interface BloqueiosManagerProps {
  vendedorId?: string;
  canEdit?: boolean;
}

interface Bloqueio {
  id: string;
  vendedor_id: string;
  vendedor_nome: string;
  vendedor_email: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo: string;
  tipo: string;
  bloqueio_dia_todo: boolean;
  duracao_dias: number;
  ativo: boolean;
  created_at: string;
  criado_por_nome?: string;
}

interface BloqueioForm {
  vendedor_id: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo: string;
  tipo: string;
}

interface BloqueioFilters {
  vendedorId?: string;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
  ativo?: string;
}

const TIPOS_BLOQUEIO = [
  { value: 'temporario', label: 'Temporário', color: 'bg-yellow-500' },
  { value: 'permanente', label: 'Permanente', color: 'bg-red-500' },
  { value: 'ferias', label: 'Férias', color: 'bg-blue-500' },
  { value: 'licenca', label: 'Licença', color: 'bg-purple-500' }
];

export function BloqueiosManager({ vendedorId, canEdit = true }: BloqueiosManagerProps) {
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BloqueioFilters>({ vendedorId });
  const [error, setError] = useState<string>('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BloqueioForm>({
    defaultValues: {
      tipo: 'temporario'
    }
  });

  const watchHoraInicio = watch('hora_inicio');
  const watchHoraFim = watch('hora_fim');
  const [bloqueioIntegral, setBloqueioIntegral] = useState(true);

  useEffect(() => {
    loadData();
    if (canEdit) {
      loadVendedores();
    }
  }, [vendedorId, canEdit]);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.vendedorId) params.append('vendedor_id', filters.vendedorId);
      if (filters.tipo && filters.tipo !== 'todos') params.append('tipo', filters.tipo);
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.append('data_fim', filters.dataFim);
      if (filters.ativo && filters.ativo !== 'todos') params.append('ativo', filters.ativo);
      
      const response = await fetch(`/api/vendedores/bloqueios?${params.toString()}`);
      const { data } = await response.json();
      setBloqueios(data || []);
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVendedores() {
    try {
      const response = await fetch('/api/vendedores');
      const { data } = await response.json();
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  }

  async function onSubmit(data: BloqueioForm) {
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...data,
        hora_inicio: bloqueioIntegral ? null : data.hora_inicio,
        hora_fim: bloqueioIntegral ? null : data.hora_fim
      };

      if (editingId) {
        const response = await fetch('/api/vendedores/bloqueios', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar bloqueio');
        }
      } else {
        const response = await fetch('/api/vendedores/bloqueios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) {
            throw new Error('Já existe bloqueio no período solicitado');
          }
          throw new Error(errorData.error || 'Erro ao criar bloqueio');
        }
      }

      setShowForm(false);
      setEditingId(null);
      reset();
      loadData();
    } catch (err) {
      console.error('Erro ao salvar bloqueio:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover este bloqueio?')) return;

    try {
      const response = await fetch(`/api/vendedores/bloqueios?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover bloqueio');
      }

      loadData();
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  function handleEdit(bloqueio: Bloqueio) {
    setEditingId(bloqueio.id);
    setValue('vendedor_id', bloqueio.vendedor_id);
    setValue('data_inicio', bloqueio.data_inicio);
    setValue('data_fim', bloqueio.data_fim);
    setValue('hora_inicio', bloqueio.hora_inicio || '');
    setValue('hora_fim', bloqueio.hora_fim || '');
    setValue('motivo', bloqueio.motivo);
    setValue('tipo', bloqueio.tipo);
    
    // Determinar se é bloqueio integral baseado na ausência de horários
    setBloqueioIntegral(bloqueio.bloqueio_dia_todo);
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    reset();
    setBloqueioIntegral(true); // Padrão para dia todo
    if (vendedorId) {
      setValue('vendedor_id', vendedorId);
    }
    setValue('tipo', 'temporario');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    reset();
    setError('');
  }

  function getTipoInfo(tipo: string) {
    return TIPOS_BLOQUEIO.find(t => t.value === tipo) || TIPOS_BLOQUEIO[0];
  }

  function formatPeriodo(bloqueio: Bloqueio) {
    const inicio = format(parseISO(bloqueio.data_inicio), 'dd/MM/yyyy', { locale: ptBR });
    const fim = format(parseISO(bloqueio.data_fim), 'dd/MM/yyyy', { locale: ptBR });
    
    if (bloqueio.data_inicio === bloqueio.data_fim) {
      if (bloqueio.bloqueio_dia_todo) {
        return `${inicio} (dia todo)`;
      } else {
        return `${inicio} ${bloqueio.hora_inicio}-${bloqueio.hora_fim}`;
      }
    } else {
      const dias = bloqueio.duracao_dias;
      if (bloqueio.bloqueio_dia_todo) {
        return `${inicio} a ${fim} (${dias} dia${dias > 1 ? 's' : ''})`;
      } else {
        return `${inicio} a ${fim} ${bloqueio.hora_inicio}-${bloqueio.hora_fim}`;
      }
    }
  }

  function isAtivo(bloqueio: Bloqueio) {
    const hoje = new Date();
    const fim = parseISO(bloqueio.data_fim);
    return bloqueio.ativo && fim >= hoje;
  }

  const columns = [
    {
      key: 'vendedor_nome',
      header: 'Vendedor',
      render: (value: any, bloqueio: Bloqueio) => (
        <div className="flex items-center space-x-2">
          <div>
            <p className="font-medium">{bloqueio.vendedor_nome}</p>
            <p className="text-sm text-muted-foreground">{bloqueio.vendedor_email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'periodo',
      header: 'Período',
      render: (value: any, bloqueio: Bloqueio) => (
        <div>
          <p className="font-medium">{formatPeriodo(bloqueio)}</p>
        </div>
      ),
    },
    {
      key: 'motivo',
      header: 'Motivo',
      render: (value: any, bloqueio: Bloqueio) => (
        <div>
          <p className="text-sm">{bloqueio.motivo}</p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (value: any, bloqueio: Bloqueio) => {
        const tipoInfo = getTipoInfo(bloqueio.tipo);
        return (
          <Badge className={`${tipoInfo.color} text-white`}>
            {tipoInfo.label}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, bloqueio: Bloqueio) => {
        const ativo = isAtivo(bloqueio);
        return (
          <Badge variant={ativo ? "default" : "secondary"}>
            {ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        );
      },
    }
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      render: (value: any, bloqueio: Bloqueio) => {
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(bloqueio)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(bloqueio.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Bloqueios de Vendedores</h2>
          <p className="text-muted-foreground">
            Gerencie bloqueios temporários e permanentes de vendedores
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
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {canEdit && (
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Bloqueio
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label>Tipo</Label>
                <Select 
                  value={filters.tipo || 'todos'}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value === 'todos' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {TIPOS_BLOQUEIO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ vendedorId })}
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : 'Novo'} Bloqueio
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!vendedorId && (
                <div>
                  <Label htmlFor="vendedor_id">Vendedor *</Label>
                  <Select 
                    onValueChange={(value) => setValue('vendedor_id', value)}
                    value={watch('vendedor_id')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vendedor_id && (
                    <span className="text-sm text-red-500">Vendedor é obrigatório</span>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="tipo">Tipo de Bloqueio *</Label>
                <Select 
                  onValueChange={(value) => setValue('tipo', value)}
                  value={watch('tipo')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_BLOQUEIO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${tipo.color}`} />
                          {tipo.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <span className="text-sm text-red-500">Tipo é obrigatório</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_inicio">Data Início *</Label>
                <Input
                  type="date"
                  {...register('data_inicio', { required: 'Data de início é obrigatória' })}
                />
                {errors.data_inicio && (
                  <span className="text-sm text-red-500">{errors.data_inicio.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="data_fim">Data Fim *</Label>
                <Input
                  type="date"
                  {...register('data_fim', { required: 'Data de fim é obrigatória' })}
                />
                {errors.data_fim && (
                  <span className="text-sm text-red-500">{errors.data_fim.message}</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bloqueio_dia_todo"
                checked={bloqueioIntegral}
                onCheckedChange={(checked) => {
                  setBloqueioIntegral(!!checked);
                  if (checked) {
                    // Limpar horários quando for dia todo
                    setValue('hora_inicio', '');
                    setValue('hora_fim', '');
                  }
                }}
              />
              <Label htmlFor="bloqueio_dia_todo">Bloqueio de dia todo</Label>
            </div>

            {!bloqueioIntegral && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hora_inicio">Hora Início *</Label>
                  <Input
                    type="time"
                    {...register('hora_inicio', { 
                      required: !bloqueioIntegral ? 'Hora de início é obrigatória' : false 
                    })}
                  />
                  {errors.hora_inicio && (
                    <span className="text-sm text-red-500">{errors.hora_inicio.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="hora_fim">Hora Fim *</Label>
                  <Input
                    type="time"
                    {...register('hora_fim', { 
                      required: !bloqueioIntegral ? 'Hora de fim é obrigatória' : false 
                    })}
                  />
                  {errors.hora_fim && (
                    <span className="text-sm text-red-500">{errors.hora_fim.message}</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="motivo">Motivo do Bloqueio *</Label>
              <Textarea
                {...register('motivo', { required: 'Motivo é obrigatório' })}
                placeholder="Descreva o motivo do bloqueio..."
                rows={3}
              />
              {errors.motivo && (
                <span className="text-sm text-red-500">{errors.motivo.message}</span>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelForm}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabela de Bloqueios */}
      <DataTable
        columns={columns}
        data={bloqueios}
        loading={loading}
        emptyMessage="Nenhum bloqueio encontrado"
      />
    </div>
  );
}