'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReuniaoFormProps {
  onSuccess?: (reuniao: any) => void;
  onCancel?: () => void;
  clienteId?: string;
  espacoId?: string;
  dataInicial?: string;
  reuniaoId?: string;
  initialData?: any;
}

interface FormData {
  cliente_id: string;
  vendedor_id: string;
  espaco_evento_id?: string;
  tipo_reuniao_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;
  descricao?: string;
  observacoes?: string;
  link_reuniao?: string;
  tipo_link?: string;
}

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
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [tiposReuniao, setTiposReuniao] = useState<TipoReuniao[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioDisponivel[]>([]);
  const [disponibilidadeChecked, setDisponibilidadeChecked] = useState(false);
  const [error, setError] = useState<string>('');

  const isEditing = !!reuniaoId && !!initialData;
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: isEditing ? {
      cliente_id: initialData.cliente_id || '',
      vendedor_id: initialData.vendedor_id || '',
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

  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      loadVendedores(),
      loadClientes(), 
      loadEspacos(),
      loadTiposReuniao()
    ]);
  }, []);

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

      onSuccess?.(result.data);
    } catch (error) {
      console.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} reunião:`, error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
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
          <Label htmlFor="vendedor_id">Vendedor *</Label>
          <Select onValueChange={(value) => setValue('vendedor_id', value)} defaultValue={isEditing ? initialData.vendedor_id : ''}>
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

      <div>
        <Label htmlFor="espaco_evento_id">Local da Reunião (Opcional)</Label>
        <Select onValueChange={(value) => setValue('espaco_evento_id', value)} defaultValue={isEditing ? initialData.espaco_evento_id : espacoId}>
          <SelectTrigger>
            <SelectValue placeholder="Reunião online ou selecione um espaço" />
          </SelectTrigger>
          <SelectContent>
            {espacos.map((espaco) => (
              <SelectItem key={espaco.id} value={espaco.id}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {espaco.nome} - {espaco.cidade}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Select onValueChange={(value) => setValue('tipo_link', value)} defaultValue={isEditing ? initialData.tipo_link : ''}>
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