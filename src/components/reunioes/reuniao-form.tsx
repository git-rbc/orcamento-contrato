'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, Video, AlertCircle, CheckCircle, Building, Home, UserCheck, Tag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { reuniaoSchema, businessValidations, type ReuniaoFormData } from '@/lib/schemas';

interface ReuniaoFormProps {
  onSuccess?: (reuniao: any) => void;
  onCancel?: () => void;
  clienteId?: string;
  espacoId?: string;
  dataInicial?: string;
  reuniaoId?: string;
  initialData?: any;
}

// Interface substituída pelo ReuniaoFormData do schema
type FormData = ReuniaoFormData;

interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

interface Cliente {
  id: string;
  nome: string;
}

interface EspacoEvento {
  id: string;
  nome: string;
  cidade: string;
}

interface LocalAtendimento {
  id: string;
  nome: string;
  codigo: string;
  cor: string;
  tipo: 'virtual' | 'presencial' | 'treinamento';
  cidade?: string;
}

interface EspacoSala {
  id: string;
  local_id: string;
  nome: string;
  capacidade: number;
  tipo: string;
  local_nome?: string;
  local_cor?: string;
}

interface CupomDesconto {
  id: string;
  codigo: string;
  descricao: string;
  valor: number;
  tipo: 'percentual' | 'fixo';
  ativo: boolean;
}

interface TipoReuniao {
  id: string;
  nome: string;
  duracao_padrao_minutos: number;
  cor: string;
}

interface HorarioDisponivel {
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
}

export function ReuniaoForm({ onSuccess, onCancel, clienteId, espacoId, dataInicial, reuniaoId, initialData }: ReuniaoFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [preVendedores, setPreVendedores] = useState<Vendedor[]>([]);
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [locaisAtendimento, setLocaisAtendimento] = useState<LocalAtendimento[]>([]);
  const [espacosSalas, setEspacosSalas] = useState<EspacoSala[]>([]);
  const [cuponsDesconto, setCuponsDesconto] = useState<CupomDesconto[]>([]);
  const [tiposReuniao, setTiposReuniao] = useState<TipoReuniao[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioDisponivel[]>([]);
  const [disponibilidadeChecked, setDisponibilidadeChecked] = useState(false);
  const [error, setError] = useState<string>('');
  const [localSelecionado, setLocalSelecionado] = useState<string>('');
  const [showPreviewCor, setShowPreviewCor] = useState(false);

  const isEditing = !!reuniaoId && !!initialData;
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(reuniaoSchema),
    defaultValues: isEditing ? {
      cliente_id: initialData.cliente_id || '',
      vendedor_id: initialData.vendedor_id || '',
      pre_vendedor_id: initialData.pre_vendedor_id || '',
      espaco_evento_id: initialData.espaco_evento_id || '',
      tipo_reuniao_id: initialData.tipo_reuniao_id || '',
      data: initialData.data || '',
      hora_inicio: initialData.hora_inicio?.substring(0, 5) || '',
      hora_fim: initialData.hora_fim?.substring(0, 5) || '',
      titulo: initialData.titulo || '',
      descricao: initialData.descricao || '',
      observacoes: initialData.observacoes || '',
      link_reuniao: initialData.link_reuniao || '',
      tipo_link: initialData.tipo_link || '',
      local_atendimento: initialData.local_atendimento || '',
      cupom_desconto_id: initialData.cupom_desconto_id || '',
      data_entrada_lead: initialData.data_entrada_lead ? initialData.data_entrada_lead.split('T')[0] : '',
    } : {
      cliente_id: clienteId || '',
      espaco_evento_id: espacoId || '',
      data: dataInicial || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    }
  });

  const supabase = createClient();
  const watchedVendedor = watch('vendedor_id');
  const watchedData = watch('data');
  const watchedTipoReuniao = watch('tipo_reuniao_id');
  const watchedLocalAtendimento = watch('local_atendimento');

  // Atualizar local selecionado quando valor muda
  useEffect(() => {
    setLocalSelecionado(watchedLocalAtendimento || '');
  }, [watchedLocalAtendimento]);

  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      loadVendedores(),
      loadPreVendedores(),
      loadClientes(), 
      loadEspacos(),
      loadLocaisAtendimento(),
      loadEspacosSalas(),
      loadCuponsDesconto(),
      loadTiposReuniao()
    ]);
  }, []);

  // Atualizar espaços quando local muda
  useEffect(() => {
    if (localSelecionado) {
      const localObj = locaisAtendimento.find(local => local.codigo === localSelecionado);
      if (localObj) {
        setShowPreviewCor(true);
        // Filtrar espaços do local selecionado
        const espacosDoLocal = espacosSalas.filter(espaco => espaco.local_id === localObj.id);
        // Você pode usar esses espaços para popular o dropdown de espaços
      }
    } else {
      setShowPreviewCor(false);
    }
  }, [localSelecionado, locaisAtendimento, espacosSalas]);

  // Verificar disponibilidade quando vendedor ou data mudam
  useEffect(() => {
    if (watchedVendedor && watchedData) {
      checkDisponibilidade();
    }
  }, [watchedVendedor, watchedData]);

  // Ajustar horário quando tipo de reunião muda
  useEffect(() => {
    if (watchedTipoReuniao && horariosDisponiveis.length > 0) {
      const tipoSelecionado = tiposReuniao.find(t => t.id === watchedTipoReuniao);
      if (tipoSelecionado) {
        const primeiroHorario = horariosDisponiveis[0];
        setValue('hora_inicio', primeiroHorario.hora_inicio);
        
        const [horas, minutos] = primeiroHorario.hora_inicio.split(':').map(Number);
        const fimMinutos = horas * 60 + minutos + tipoSelecionado.duracao_padrao_minutos;
        const horaFim = `${Math.floor(fimMinutos / 60).toString().padStart(2, '0')}:${(fimMinutos % 60).toString().padStart(2, '0')}`;
        setValue('hora_fim', horaFim);
      }
    }
  }, [watchedTipoReuniao, horariosDisponiveis, tiposReuniao, setValue]);

  async function loadVendedores() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, nome, email')
        .eq('ativo', true)
        .in('role', ['vendedor', 'admin'])
        .order('nome');
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  }

  async function loadPreVendedores() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, nome, email')
        .eq('ativo', true)
        // Assumindo que pré-vendedores têm role específico ou campo
        .order('nome');
      setPreVendedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar pré-vendedores:', error);
    }
  }

  async function loadLocaisAtendimento() {
    try {
      const response = await fetch('/api/locais-atendimento');
      const { data } = await response.json();
      setLocaisAtendimento(data || []);
    } catch (error) {
      console.error('Erro ao carregar locais de atendimento:', error);
    }
  }

  async function loadEspacosSalas() {
    try {
      const response = await fetch('/api/espacos-salas');
      const { data } = await response.json();
      setEspacosSalas(data || []);
    } catch (error) {
      console.error('Erro ao carregar espaços/salas:', error);
    }
  }

  async function loadCuponsDesconto() {
    try {
      // Assumindo que existe uma API para cupons
      const response = await fetch('/api/cupons-desconto');
      if (response.ok) {
        const { data } = await response.json();
        setCuponsDesconto(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar cupons de desconto:', error);
    }
  }

  async function loadClientes() {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome')
        .limit(100);
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  async function loadEspacos() {
    try {
      const { data } = await supabase
        .from('espacos_eventos')
        .select('id, nome, cidade')
        .eq('ativo', true)
        .order('nome');
      setEspacos(data || []);
    } catch (error) {
      console.error('Erro ao carregar espaços:', error);
    }
  }

  async function loadTiposReuniao() {
    try {
      const response = await fetch('/api/reunioes/tipos');
      const { data } = await response.json();
      setTiposReuniao(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de reunião:', error);
    }
  }

  async function checkDisponibilidade() {
    if (!watchedVendedor || !watchedData) return;

    setCheckingAvailability(true);
    setDisponibilidadeChecked(false);
    setError('');

    try {
      const response = await fetch('/api/vendedores/disponibilidade/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor_id: watchedVendedor,
          data: watchedData,
          hora_inicio: '09:00',
          hora_fim: '10:00',
          excludeReuniaoId: isEditing ? reuniaoId : undefined
        })
      });

      const { data } = await response.json();

      if (!data.tem_disponibilidade_cadastrada) {
        setError('Vendedor não possui disponibilidade cadastrada para esta data.');
        setHorariosDisponiveis([]);
      } else if (data.tem_bloqueios) {
        setError('Vendedor possui bloqueio na data selecionada.');
        setHorariosDisponiveis([]);
      } else {
        setHorariosDisponiveis(data.horarios_disponiveis || []);
        if (data.horarios_disponiveis?.length === 0) {
          setError('Não há horários disponíveis para esta data.');
        }
      }

      setDisponibilidadeChecked(true);
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setError('Erro ao verificar disponibilidade.');
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');

    try {
      // Validações de negócio adicionais
      if (!businessValidations.isNotPastDate(data.data)) {
        throw new Error('A data da reunião não pode ser no passado');
      }

      if (!businessValidations.isEndTimeAfterStart(data.hora_inicio, data.hora_fim)) {
        throw new Error('A hora de fim deve ser posterior à hora de início');
      }

      if (!businessValidations.hasMinimumDuration(data.hora_inicio, data.hora_fim, 30)) {
        throw new Error('A reunião deve ter pelo menos 30 minutos de duração');
      }

      if (!businessValidations.isBusinessHours(data.hora_inicio) || !businessValidations.isBusinessHours(data.hora_fim)) {
        toast({
          title: 'Aviso',
          description: 'Reunião agendada fora do horário comercial (8h às 22h)',
          variant: 'default'
        });
      }

      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing ? { ...data, id: reuniaoId } : data;
      
      const response = await fetch('/api/reunioes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} reunião`);
      }

      // Enviar email de confirmação (apenas para novas reuniões)
      if (!isEditing) {
        try {
          await fetch(`/api/reunioes/${result.data.id}/enviar-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_email: 'agendada',
              opcoes: { notificarVendedor: true }
            })
          });
        } catch (emailError) {
          console.warn('Erro ao enviar email, mas reunião foi criada:', emailError);
        }
      }

      // Toast de sucesso
      toast({
        title: 'Sucesso!',
        description: `Reunião ${isEditing ? 'atualizada' : 'criada'} com sucesso!`
      });

      onSuccess?.(result.data);
    } catch (error) {
      console.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} reunião:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      
      // Toast de erro
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cliente_id">Cliente *</Label>
          <Select onValueChange={(value) => setValue('cliente_id', value)} defaultValue={isEditing ? initialData.cliente_id : clienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.cliente_id && (
            <span className="text-sm text-red-500">Cliente é obrigatório</span>
          )}
        </div>

        <div>
          <Label htmlFor="pre_vendedor_id">Pré-vendedor</Label>
          <Select onValueChange={(value) => setValue('pre_vendedor_id', value)} defaultValue={isEditing ? initialData.pre_vendedor_id : ''}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um pré-vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum pré-vendedor</SelectItem>
              {preVendedores.map((preVendedor) => (
                <SelectItem key={preVendedor.id} value={preVendedor.id}>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    {preVendedor.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vendedor_id">Vendedor *</Label>
          <Select onValueChange={(value) => setValue('vendedor_id', value)} defaultValue={isEditing ? initialData.vendedor_id : ''}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um vendedor" />
            </SelectTrigger>
            <SelectContent>
              {vendedores.map((vendedor) => (
                <SelectItem key={vendedor.id} value={vendedor.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {vendedor.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vendedor_id && (
            <span className="text-sm text-red-500">Vendedor é obrigatório</span>
          )}
        </div>

        <div>
          <Label htmlFor="local_atendimento">Local de Atendimento *</Label>
          <Select onValueChange={(value) => setValue('local_atendimento', value)} defaultValue={isEditing ? initialData.local_atendimento : ''}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o local" />
            </SelectTrigger>
            <SelectContent>
              {locaisAtendimento.map((local) => (
                <SelectItem key={local.id} value={local.codigo}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: local.cor }}
                    />
                    <Building className="h-4 w-4" />
                    {local.nome}
                    {local.cidade && (
                      <span className="text-muted-foreground">- {local.cidade}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showPreviewCor && localSelecionado && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <div 
                className="w-4 h-4 rounded-full border-2" 
                style={{ backgroundColor: locaisAtendimento.find(l => l.codigo === localSelecionado)?.cor }}
              />
              Cor da agenda: {locaisAtendimento.find(l => l.codigo === localSelecionado)?.nome}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tipo_reuniao_id">Tipo de Reunião *</Label>
          <Select onValueChange={(value) => setValue('tipo_reuniao_id', value)} defaultValue={isEditing ? initialData.tipo_reuniao_id : ''}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposReuniao.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tipo.cor }}
                    />
                    {tipo.nome} ({tipo.duracao_padrao_minutos}min)
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo_reuniao_id && (
            <span className="text-sm text-red-500">Tipo de reunião é obrigatório</span>
          )}
        </div>

        <div>
          <Label htmlFor="data">Data *</Label>
          <Input
            type="date"
            {...register('data', { required: 'Data é obrigatória' })}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
          {errors.data && (
            <span className="text-sm text-red-500">{errors.data.message}</span>
          )}
        </div>
      </div>

      {watchedVendedor && watchedData && (
        <div>
          {checkingAvailability ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Verificando disponibilidade do vendedor...
              </AlertDescription>
            </Alert>
          ) : disponibilidadeChecked ? (
            error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {horariosDisponiveis.length} horários disponíveis encontrados
                </AlertDescription>
              </Alert>
            )
          ) : null}
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={() => setStep(2)} 
          disabled={!disponibilidadeChecked || horariosDisponiveis.length === 0}
        >
          Próximo: Horários
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Horários Disponíveis</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {horariosDisponiveis.slice(0, 12).map((horario, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setValue('hora_inicio', horario.hora_inicio);
                  setValue('hora_fim', horario.hora_fim);
                }}
              >
                <Clock className="h-4 w-4 mr-2" />
                {horario.hora_inicio} - {horario.hora_fim}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="espaco_evento_id">Espaço/Sala (Opcional)</Label>
          <Select 
            onValueChange={(value) => setValue('espaco_evento_id', value)} 
            defaultValue={isEditing ? initialData.espaco_evento_id : espacoId}
            disabled={!localSelecionado}
          >
            <SelectTrigger>
              <SelectValue placeholder={localSelecionado ? "Selecione um espaço" : "Primeiro selecione o local"} />
            </SelectTrigger>
            <SelectContent>
              {/* Espaços antigos - manter compatibilidade */}
              {espacos.map((espaco) => (
                <SelectItem key={espaco.id} value={espaco.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {espaco.nome} - {espaco.cidade}
                  </div>
                </SelectItem>
              ))}
              
              {/* Novos espaços filtrados por local */}
              {localSelecionado && espacosSalas
                .filter(espaco => {
                  const localObj = locaisAtendimento.find(l => l.codigo === localSelecionado);
                  return localObj && espaco.local_id === localObj.id;
                })
                .map((espaco) => (
                  <SelectItem key={`sala-${espaco.id}`} value={espaco.id}>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {espaco.nome}
                      <Badge variant="outline" className="ml-1">
                        {espaco.capacidade} pessoas
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {localSelecionado && (
            <div className="text-xs text-muted-foreground mt-1">
              Espaços disponíveis para {locaisAtendimento.find(l => l.codigo === localSelecionado)?.nome}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="data_entrada_lead">Data Entrada Lead (Opcional)</Label>
          <Input
            type="date"
            {...register('data_entrada_lead')}
            placeholder="Quando o lead foi captado"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Data de entrada do lead no sistema
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          Voltar
        </Button>
        <Button onClick={() => setStep(3)}>
          Próximo: Detalhes
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="titulo">Título da Reunião *</Label>
        <Input
          {...register('titulo', { required: 'Título é obrigatório' })}
          placeholder="Ex: Reunião comercial - Evento de casamento"
        />
        {errors.titulo && (
          <span className="text-sm text-red-500">{errors.titulo.message}</span>
        )}
      </div>

      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          {...register('descricao')}
          placeholder="Detalhes sobre a reunião, pauta, objetivos..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="link_reuniao">Link da Reunião Online</Label>
          <Input
            {...register('link_reuniao')}
            placeholder="https://meet.google.com/abc-def-ghi"
          />
        </div>

        <div>
          <Label htmlFor="tipo_link">Tipo de Link</Label>
          <Select onValueChange={(value) => setValue('tipo_link', value as any)} defaultValue={isEditing ? initialData.tipo_link || '' : ''}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google_meet">Google Meet</SelectItem>
              <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="cupom_desconto_id">Cupom de Desconto (Opcional)</Label>
        <Select onValueChange={(value) => setValue('cupom_desconto_id', value)} defaultValue={isEditing ? initialData.cupom_desconto_id : ''}>
          <SelectTrigger>
            <SelectValue placeholder="Buscar e selecionar cupom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum cupom</SelectItem>
            {cuponsDesconto.filter(cupom => cupom.ativo).map((cupom) => (
              <SelectItem key={cupom.id} value={cupom.id}>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {cupom.codigo}
                  <Badge variant="secondary">
                    {cupom.tipo === 'percentual' ? `${cupom.valor}%` : `R$ ${cupom.valor}`}
                  </Badge>
                  {cupom.descricao && (
                    <span className="text-muted-foreground text-sm">- {cupom.descricao}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          {...register('observacoes')}
          placeholder="Informações adicionais, lembranças especiais..."
          rows={2}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          Voltar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (isEditing ? 'Atualizando...' : 'Agendando...') : (isEditing ? 'Atualizar Reunião' : 'Agendar Reunião')}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isEditing ? 'Editar Reunião' : 'Agendar Nova Reunião'}
        </CardTitle>
        <div className="flex gap-2">
          {[1, 2, 3].map((stepNumber) => (
            <Badge 
              key={stepNumber} 
              variant={step === stepNumber ? "default" : step > stepNumber ? "secondary" : "outline"}
              className="px-3"
            >
              {stepNumber === 1 ? 'Cliente & Vendedor' : 
               stepNumber === 2 ? 'Data & Horário' : 
               'Detalhes'}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </form>

        {onCancel && (
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}