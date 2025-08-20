'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, Users, MapPin, Plus, Edit, Trash, 
  Save, X, AlertCircle, CheckCircle, Settings
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase';

interface DisponibilidadeManagerProps {
  vendedorId?: string; // Se fornecido, mostra apenas a disponibilidade deste vendedor
  canEdit?: boolean; // Se pode editar a disponibilidade
}

interface Disponibilidade {
  id: string;
  vendedor_id: string;
  vendedor_nome: string;
  vendedor_email: string;
  dia_semana: number;
  dia_semana_nome: string;
  hora_inicio: string;
  hora_fim: string;
  cidade?: string;
  ambiente?: string;
  periodo: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
}

interface DisponibilidadeForm {
  vendedor_id: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  cidade?: string;
  ambiente?: string;
  periodo: string;
  observacoes?: string;
}

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

const PERIODOS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'integral', label: 'Integral' }
];

export function DisponibilidadeManager({ vendedorId, canEdit = true }: DisponibilidadeManagerProps) {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [ambientes, setAmbientes] = useState<string[]>([]);
  const [selectedDias, setSelectedDias] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DisponibilidadeForm>();
  const supabase = createClient();

  useEffect(() => {
    loadData();
    if (canEdit) {
      loadVendedores();
      loadCidadesEAmbientes();
    }
  }, [vendedorId, canEdit]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vendedorId) params.append('vendedor_id', vendedorId);
      
      const response = await fetch(`/api/vendedores/disponibilidade?${params.toString()}`);
      const { data } = await response.json();
      setDisponibilidades(data || []);
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
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

  async function loadCidadesEAmbientes() {
    try {
      // Carregar cidades únicas dos espaços de eventos
      const { data: espacos } = await supabase
        .from('espacos_eventos')
        .select('cidade, nome')
        .eq('ativo', true);

      if (espacos) {
        const cidadesUnicas = [...new Set(espacos.map(e => e.cidade))].filter(Boolean);
        const ambientesUnicos = [...new Set(espacos.map(e => e.nome))].filter(Boolean);
        
        setCidades(cidadesUnicas);
        setAmbientes(ambientesUnicos);
      }
    } catch (error) {
      console.error('Erro ao carregar cidades e ambientes:', error);
    }
  }

  async function onSubmit(data: DisponibilidadeForm) {
    setSubmitting(true);
    setError('');

    // Validar se pelo menos um dia foi selecionado
    if (selectedDias.length === 0) {
      setError('Selecione pelo menos um dia da semana');
      setSubmitting(false);
      return;
    }

    try {
      const formData = {
        ...data,
        dias_semana: selectedDias
      };

      if (editingId) {
        // Atualizar
        const response = await fetch('/api/vendedores/disponibilidade', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar disponibilidade');
        }
      } else {
        // Criar múltiplas disponibilidades (uma para cada dia selecionado)
        for (const diaSemana of selectedDias) {
          const disponibilidadeData = {
            ...data,
            dia_semana: diaSemana
          };

          const response = await fetch('/api/vendedores/disponibilidade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(disponibilidadeData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao criar disponibilidade');
          }
        }
      }

      setShowForm(false);
      setEditingId(null);
      reset();
      setSelectedDias([]);
      loadData();
    } catch (err) {
      console.error('Erro ao salvar disponibilidade:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover esta disponibilidade?')) return;

    try {
      const response = await fetch(`/api/vendedores/disponibilidade?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover disponibilidade');
      }

      loadData();
    } catch (error) {
      console.error('Erro ao remover disponibilidade:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  function handleEdit(disponibilidade: Disponibilidade) {
    setEditingId(disponibilidade.id);
    setValue('vendedor_id', disponibilidade.vendedor_id);
    setValue('hora_inicio', disponibilidade.hora_inicio);
    setValue('hora_fim', disponibilidade.hora_fim);
    setValue('cidade', disponibilidade.cidade || '');
    setValue('ambiente', disponibilidade.ambiente || '');
    setValue('periodo', disponibilidade.periodo);
    setValue('observacoes', disponibilidade.observacoes || '');
    setSelectedDias([disponibilidade.dia_semana]); // No modo edição, mostra apenas o dia atual
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    reset();
    setSelectedDias([]);
    if (vendedorId) {
      setValue('vendedor_id', vendedorId);
    }
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    reset();
    setSelectedDias([]);
    setError('');
  }

  function getPeriodoBadgeColor(periodo: string) {
    switch (periodo) {
      case 'manha': return 'bg-yellow-500';
      case 'tarde': return 'bg-orange-500';
      case 'noite': return 'bg-blue-500';
      case 'integral': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  }

  // Agrupar disponibilidades por vendedor e dia da semana
  const disponibilidadesAgrupadas = disponibilidades.reduce((acc, disp) => {
    const key = `${disp.vendedor_id}-${disp.dia_semana}`;
    if (!acc[key]) {
      acc[key] = {
        vendedor: disp.vendedor_nome,
        dia_semana: disp.dia_semana,
        dia_semana_nome: disp.dia_semana_nome,
        disponibilidades: []
      };
    }
    acc[key].disponibilidades.push(disp);
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Disponibilidade</h2>
          <p className="text-muted-foreground">
            Configure os horários disponíveis dos vendedores para agendamento
          </p>
        </div>
        
        {canEdit && (
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Disponibilidade
          </Button>
        )}
      </div>

      {/* Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : 'Nova'} Disponibilidade
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
                    defaultValue={watch('vendedor_id')}
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

              <div className="col-span-2">
                <Label>Dias da Semana *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dia-${dia.value}`}
                        checked={selectedDias.includes(dia.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDias([...selectedDias, dia.value]);
                          } else {
                            setSelectedDias(selectedDias.filter(d => d !== dia.value));
                          }
                        }}
                        disabled={editingId !== null} // Desabilita no modo edição
                      />
                      <Label 
                        htmlFor={`dia-${dia.value}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {dia.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedDias.length === 0 && (
                  <span className="text-sm text-red-500">Selecione pelo menos um dia</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_inicio">Hora Início *</Label>
                <Input
                  type="time"
                  {...register('hora_inicio', { required: 'Hora de início é obrigatória' })}
                />
                {errors.hora_inicio && (
                  <span className="text-sm text-red-500">{errors.hora_inicio.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="hora_fim">Hora Fim *</Label>
                <Input
                  type="time"
                  {...register('hora_fim', { required: 'Hora de fim é obrigatória' })}
                />
                {errors.hora_fim && (
                  <span className="text-sm text-red-500">{errors.hora_fim.message}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="periodo">Período</Label>
                <Select 
                  onValueChange={(value) => setValue('periodo', value)}
                  defaultValue={watch('periodo')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map((periodo) => (
                      <SelectItem key={periodo.value} value={periodo.value}>
                        {periodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Select 
                  onValueChange={(value) => setValue('cidade', value)}
                  defaultValue={watch('cidade')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma cidade</SelectItem>
                    {cidades.map((cidade) => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ambiente">Ambiente</Label>
                <Select 
                  onValueChange={(value) => setValue('ambiente', value)}
                  defaultValue={watch('ambiente')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ambiente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum ambiente</SelectItem>
                    {ambientes.map((ambiente) => (
                      <SelectItem key={ambiente} value={ambiente}>
                        {ambiente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                {...register('observacoes')}
                placeholder="Observações sobre a disponibilidade..."
                rows={2}
              />
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

      {/* Lista de Disponibilidades */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      ) : Object.keys(disponibilidadesAgrupadas).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma disponibilidade cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure os horários disponíveis dos vendedores para permitir agendamentos
            </p>
            {canEdit && (
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Disponibilidade
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.values(disponibilidadesAgrupadas)
            .sort((a: any, b: any) => {
              if (a.vendedor !== b.vendedor) {
                return a.vendedor.localeCompare(b.vendedor);
              }
              return a.dia_semana - b.dia_semana;
            })
            .map((grupo: any) => (
            <Card key={`${grupo.vendedor}-${grupo.dia_semana}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {grupo.vendedor}
                </CardTitle>
                <Badge variant="outline" className="w-fit">
                  {grupo.dia_semana_nome}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {grupo.disponibilidades.map((disp: Disponibilidade) => (
                    <div key={disp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {disp.hora_inicio} - {disp.hora_fim}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge 
                              className={`${getPeriodoBadgeColor(disp.periodo)} text-white text-xs`}
                            >
                              {PERIODOS.find(p => p.value === disp.periodo)?.label || disp.periodo}
                            </Badge>
                            {disp.cidade && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {disp.cidade}
                              </Badge>
                            )}
                            {disp.ambiente && (
                              <Badge variant="outline" className="text-xs">
                                {disp.ambiente}
                              </Badge>
                            )}
                          </div>
                          {disp.observacoes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {disp.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(disp)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(disp.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}