'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, Clock, Users, MapPin, Video, Phone, Mail, 
  Edit, Trash, CheckCircle, XCircle, RotateCcw,
  MessageSquare, History, Bell, Copy, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReuniaoDetailsProps {
  reuniaoId: string;
  open: boolean;
  onClose: () => void;
  onEdit?: (reuniao: any) => void;
  onDelete?: (reuniao: any) => void;
  onReagendar?: (reuniao: any) => void;
}

interface Reuniao {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;
  descricao?: string;
  observacoes?: string;
  status: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone?: string;
  vendedor_nome: string;
  vendedor_email: string;
  tipo_reuniao_nome: string;
  tipo_reuniao_cor: string;
  duracao_padrao_minutos: number;
  espaco_nome?: string;
  espaco_cidade?: string;
  link_reuniao?: string;
  tipo_link?: string;
  confirmada_cliente: boolean;
  confirmada_vendedor: boolean;
  lembrete_enviado: boolean;
  created_at: string;
  updated_at: string;
}

interface ReuniaoHistorico {
  id: string;
  data_anterior: string;
  hora_inicio_anterior: string;
  hora_fim_anterior: string;
  data_nova: string;
  hora_inicio_nova: string;
  hora_fim_nova: string;
  motivo?: string;
  reagendada_em: string;
}

export function ReuniaoDetails({
  reuniaoId,
  open,
  onClose,
  onEdit,
  onDelete,
  onReagendar
}: ReuniaoDetailsProps) {
  const [reuniao, setReuniao] = useState<Reuniao | null>(null);
  const [historico, setHistorico] = useState<ReuniaoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open && reuniaoId) {
      loadReuniaoDetails();
      loadHistorico();
    }
  }, [open, reuniaoId]);

  async function loadReuniaoDetails() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reunioes/${reuniaoId}`);
      const { data } = await response.json();
      setReuniao(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da reunião:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistorico() {
    try {
      const response = await fetch(`/api/reunioes/${reuniaoId}/historico`);
      if (response.ok) {
        const { data } = await response.json();
        setHistorico(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  async function handleConfirmar(tipo: 'cliente' | 'vendedor') {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/reunioes/${reuniaoId}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_confirmacao: tipo })
      });

      if (response.ok) {
        loadReuniaoDetails(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao confirmar reunião:', error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnviarEmail(tipo: 'lembrete' | 'reagendada') {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/reunioes/${reuniaoId}/enviar-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_email: tipo,
          opcoes: { notificarVendedor: true }
        })
      });

      if (response.ok) {
        loadReuniaoDetails(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    } finally {
      setActionLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // Aqui você pode adicionar um toast de sucesso
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
      return format(dateTime, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return `${data} às ${hora}`;
    }
  }

  function isReuniaoPendente() {
    if (!reuniao) return false;
    const agora = new Date();
    const dataReuniao = new Date(`${reuniao.data}T${reuniao.hora_inicio}`);
    return dataReuniao > agora && reuniao.status !== 'cancelada';
  }

  function isReuniaoHoje() {
    if (!reuniao) return false;
    const hoje = new Date();
    const dataReuniao = new Date(reuniao.data + 'T00:00:00');
    return differenceInDays(dataReuniao, hoje) === 0;
  }

  if (!reuniao && !loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reunião não encontrada</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
          </div>
        ) : reuniao && (
          <div className="space-y-6">
            {/* Header */}
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <DialogTitle className="text-2xl">{reuniao.titulo}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`${getStatusColor(reuniao.status)} text-white`}
                    >
                      {getStatusLabel(reuniao.status)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: reuniao.tipo_reuniao_cor }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {reuniao.tipo_reuniao_nome}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {onEdit && isReuniaoPendente() && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(reuniao)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                  
                  {onReagendar && isReuniaoPendente() && (
                    <Button variant="outline" size="sm" onClick={() => onReagendar(reuniao)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reagendar
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Alertas */}
            {isReuniaoHoje() && reuniao.status !== 'cancelada' && (
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  Esta reunião está marcada para hoje!
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informações Principais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações da Reunião
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {formatDateTime(reuniao.data, reuniao.hora_inicio)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          até {reuniao.hora_fim} ({reuniao.duracao_padrao_minutos} minutos)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {reuniao.espaco_nome ? (
                        <>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{reuniao.espaco_nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {reuniao.espaco_cidade}
                            </p>
                          </div>
                        </>
                      ) : reuniao.link_reuniao ? (
                        <>
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Reunião Online</p>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={reuniao.link_reuniao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Entrar na reunião
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(reuniao.link_reuniao!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Local não definido</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Status de Confirmação */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Status de Confirmação</h4>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        {reuniao.confirmada_cliente ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Cliente</span>
                        {!reuniao.confirmada_cliente && reuniao.status !== 'cancelada' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmar('cliente')}
                            disabled={actionLoading}
                          >
                            Confirmar
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {reuniao.confirmada_vendedor ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">Vendedor</span>
                        {!reuniao.confirmada_vendedor && reuniao.status !== 'cancelada' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmar('vendedor')}
                            disabled={actionLoading}
                          >
                            Confirmar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações de Email */}
                  {isReuniaoPendente() && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Notificações</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEnviarEmail('lembrete')}
                            disabled={actionLoading}
                          >
                            <Bell className="h-4 w-4 mr-1" />
                            Enviar Lembrete
                          </Button>
                          {reuniao.lembrete_enviado && (
                            <Badge variant="secondary" className="text-xs">
                              Lembrete enviado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Participantes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cliente */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{reuniao.cliente_nome[0]}</AvatarFallback>
                      <AvatarFallback>{reuniao.cliente_nome[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{reuniao.cliente_nome}</p>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`mailto:${reuniao.cliente_email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                      {reuniao.cliente_telefone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`tel:${reuniao.cliente_telefone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Vendedor */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{reuniao.vendedor_nome[0]}</AvatarFallback>
                      <AvatarFallback>{reuniao.vendedor_nome[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{reuniao.vendedor_nome}</p>
                      <p className="text-sm text-muted-foreground">Vendedor</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`mailto:${reuniao.vendedor_email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Descrição e Observações */}
            {(reuniao.descricao || reuniao.observacoes) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reuniao.descricao && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Descrição
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">
                        {reuniao.descricao}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {reuniao.observacoes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">
                        {reuniao.observacoes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Histórico de Reagendamentos */}
            {historico.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Reagendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historico.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-3 pb-3">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">De:</span>{' '}
                            {formatDateTime(item.data_anterior, item.hora_inicio_anterior)} - {item.hora_fim_anterior}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Para:</span>{' '}
                            {formatDateTime(item.data_nova, item.hora_inicio_nova)} - {item.hora_fim_nova}
                          </p>
                          {item.motivo && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Motivo:</span> {item.motivo}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(item.reagendada_em), 'dd/MM/yy HH:mm')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer com metadados */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>Criada em: {format(new Date(reuniao.created_at), 'dd/MM/yyyy HH:mm')}</p>
              {reuniao.updated_at !== reuniao.created_at && (
                <p>Atualizada em: {format(new Date(reuniao.updated_at), 'dd/MM/yyyy HH:mm')}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}