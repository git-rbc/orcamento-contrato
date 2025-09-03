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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { 
  CheckCircle, XCircle, Calendar, DollarSign, 
  FileText, Clock, User, MessageCircle,
  TrendingUp, AlertCircle, ArrowRight,
  Phone, Mail, Video, Edit, Trash
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase';

interface ReuniaoResultadoProps {
  reuniao: {
    id: string;
    titulo: string;
    cliente_nome: string;
    vendedor_nome: string;
    data: string;
    hora_inicio: string;
    status: string;
  };
  onSuccess?: () => void;
  onClose?: () => void;
}

interface FormData {
  resultado: 'sucesso' | 'reagendamento' | 'cancelamento' | 'conversao' | 'sem_interesse' | 'follow_up' | 'proposta_enviada';
  valor_estimado_negocio: number;
  proximos_passos?: string;
  data_follow_up?: string;
  observacoes?: string;
}

interface HistoricoStatus {
  id: string;
  status_anterior: string;
  status_novo: string;
  data_mudanca: string;
  usuario_nome: string;
  motivo?: string;
}

interface Confirmacao {
  id: string;
  canal: 'whatsapp' | 'sms' | 'email';
  status: 'enviado' | 'entregue' | 'confirmado' | 'rejeitado';
  data_envio: string;
  data_resposta?: string;
  template_usado?: string;
}

interface FormularioVinculado {
  id: string;
  tipo: 'pre_meeting' | 'post_meeting' | 'feedback' | 'avaliacao_cliente' | 'follow_up';
  preenchido_por_nome: string;
  created_at: string;
}

export function ReuniaoResultado({ reuniao, onSuccess, onClose }: ReuniaoResultadoProps) {
  const [loading, setLoading] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [historicoStatus, setHistoricoStatus] = useState<HistoricoStatus[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [formulariosVinculados, setFormulariosVinculados] = useState<FormularioVinculado[]>([]);
  const [resultadoExistente, setResultadoExistente] = useState<any>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      resultado: 'sucesso',
      valor_estimado_negocio: 0,
      proximos_passos: '',
      data_follow_up: '',
      observacoes: ''
    }
  });

  const watchedResultado = watch('resultado');
  const supabase = createClient();

  useEffect(() => {
    loadHistorico();
    loadConfirmacoes();
    loadFormulariosVinculados();
    loadResultadoExistente();
  }, [reuniao.id]);

  async function loadHistorico() {
    try {
      // Simular carregamento de histórico de status
      // Na implementação real, isso viria de uma API
      const historico: HistoricoStatus[] = [
        {
          id: '1',
          status_anterior: 'agendada',
          status_novo: 'confirmada',
          data_mudanca: new Date().toISOString(),
          usuario_nome: 'Sistema',
          motivo: 'Confirmação automática por WhatsApp'
        }
      ];
      setHistoricoStatus(historico);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  }

  async function loadConfirmacoes() {
    try {
      const response = await fetch(`/api/reunioes/confirmacoes/${reuniao.id}`);
      if (response.ok) {
        const { data } = await response.json();
        setConfirmacoes(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar confirmações:', error);
    }
  }

  async function loadFormulariosVinculados() {
    try {
      const response = await fetch(`/api/formularios?reuniao_id=${reuniao.id}`);
      if (response.ok) {
        const { data } = await response.json();
        setFormulariosVinculados(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
    }
  }

  async function loadResultadoExistente() {
    try {
      const response = await fetch(`/api/reunioes/resultado?reuniao_id=${reuniao.id}`);
      if (response.ok) {
        const { data } = await response.json();
        if (data && data.length > 0) {
          const resultado = data[0];
          setResultadoExistente(resultado);
          // Preencher formulário com dados existentes
          setValue('resultado', resultado.resultado);
          setValue('valor_estimado_negocio', resultado.valor_estimado_negocio);
          setValue('proximos_passos', resultado.proximos_passos || '');
          setValue('data_follow_up', resultado.data_follow_up ? resultado.data_follow_up.split('T')[0] : '');
          setValue('observacoes', resultado.observacoes || '');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar resultado existente:', error);
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);

    try {
      const method = resultadoExistente ? 'PUT' : 'POST';
      const body = resultadoExistente 
        ? { ...data, id: resultadoExistente.id }
        : { ...data, reuniao_id: reuniao.id };

      const response = await fetch('/api/reunioes/resultado', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar resultado');
      }

      toast({
        title: 'Resultado salvo',
        description: 'O resultado da reunião foi salvo com sucesso'
      });

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Erro ao salvar resultado:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar resultado',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  function getResultadoIcon(resultado: string) {
    switch (resultado) {
      case 'sucesso': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'conversao': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'proposta_enviada': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'follow_up': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'reagendamento': return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'sem_interesse': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelamento': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  }

  function getResultadoLabel(resultado: string) {
    switch (resultado) {
      case 'sucesso': return 'Sucesso';
      case 'conversao': return 'Conversão';
      case 'proposta_enviada': return 'Proposta Enviada';
      case 'follow_up': return 'Follow-up';
      case 'reagendamento': return 'Reagendamento';
      case 'sem_interesse': return 'Sem Interesse';
      case 'cancelamento': return 'Cancelamento';
      default: return 'Desconhecido';
    }
  }

  function getCanalIcon(canal: string) {
    switch (canal) {
      case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'sms': return <Phone className="h-4 w-4 text-blue-600" />;
      case 'email': return <Mail className="h-4 w-4 text-gray-600" />;
      case 'video': return <Video className="h-4 w-4 text-purple-600" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  }

  function getTipoFormularioLabel(tipo: string) {
    switch (tipo) {
      case 'pre_meeting': return 'Pré-Reunião';
      case 'post_meeting': return 'Pós-Reunião';
      case 'feedback': return 'Feedback';
      case 'avaliacao_cliente': return 'Avaliação Cliente';
      case 'follow_up': return 'Follow-up';
      default: return tipo;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Informações da Reunião */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resultado da Reunião
          </CardTitle>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">
              <User className="h-3 w-3 mr-1" />
              {reuniao.cliente_nome}
            </Badge>
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              {format(parseISO(reuniao.data), 'dd/MM/yyyy', { locale: ptBR })} às {reuniao.hora_inicio}
            </Badge>
            <Badge variant="outline">
              Vendedor: {reuniao.vendedor_nome}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resultado">Resultado *</Label>
                <Select onValueChange={(value) => setValue('resultado', value as any)} defaultValue="sucesso">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sucesso">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Sucesso
                      </div>
                    </SelectItem>
                    <SelectItem value="conversao">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Conversão
                      </div>
                    </SelectItem>
                    <SelectItem value="proposta_enviada">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Proposta Enviada
                      </div>
                    </SelectItem>
                    <SelectItem value="follow_up">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        Follow-up
                      </div>
                    </SelectItem>
                    <SelectItem value="reagendamento">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        Reagendamento
                      </div>
                    </SelectItem>
                    <SelectItem value="sem_interesse">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Sem Interesse
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelamento">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Cancelamento
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.resultado && (
                  <span className="text-sm text-red-500">Resultado é obrigatório</span>
                )}
              </div>

              <div>
                <Label htmlFor="valor_estimado_negocio">Valor Estimado do Negócio</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-9"
                    {...register('valor_estimado_negocio', { valueAsNumber: true })}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="proximos_passos">Próximos Passos</Label>
              <Textarea
                {...register('proximos_passos')}
                placeholder="Descreva os próximos passos a serem tomados..."
                rows={3}
              />
            </div>

            {(watchedResultado === 'follow_up' || watchedResultado === 'reagendamento') && (
              <div>
                <Label htmlFor="data_follow_up">Data de Follow-up</Label>
                <Input
                  type="date"
                  {...register('data_follow_up')}
                />
              </div>
            )}

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                {...register('observacoes')}
                placeholder="Observações adicionais sobre a reunião..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              {onClose && (
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : (resultadoExistente ? 'Atualizar' : 'Salvar Resultado')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Timeline de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {loadingHistorico ? (
              <div className="text-center text-muted-foreground">Carregando histórico...</div>
            ) : historicoStatus.length > 0 ? (
              <div className="space-y-4">
                {historicoStatus.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-b-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{item.status_anterior}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge>{item.status_novo}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(item.data_mudanca), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - {item.usuario_nome}
                        </div>
                        {item.motivo && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.motivo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">Nenhum histórico disponível</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Histórico de Confirmações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Histórico de Confirmações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {confirmacoes.length > 0 ? (
            <div className="space-y-3">
              {confirmacoes.map((confirmacao) => (
                <div key={confirmacao.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {getCanalIcon(confirmacao.canal)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {confirmacao.canal}
                      </Badge>
                      <Badge 
                        variant={confirmacao.status === 'confirmado' ? 'default' : 
                                confirmacao.status === 'rejeitado' ? 'destructive' : 'secondary'}
                      >
                        {confirmacao.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Enviado em {format(parseISO(confirmacao.data_envio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      {confirmacao.data_resposta && (
                        <span>
                          {' • Respondido em '}
                          {format(parseISO(confirmacao.data_resposta), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Nenhuma confirmação enviada
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulários Vinculados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formulários Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formulariosVinculados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formulariosVinculados.map((formulario) => (
                <div key={formulario.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {getTipoFormularioLabel(formulario.tipo)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Por {formulario.preenchido_por_nome} em{' '}
                      {format(parseISO(formulario.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Nenhum formulário vinculado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}