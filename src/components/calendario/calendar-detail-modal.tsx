'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { CalendarEventForm } from './calendar-event-form';
import type { Reserva, Cliente, EspacoEvento } from '@/types/calendario';

interface CalendarDetailModalProps {
  event: Reserva;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Reserva>) => void;
  onDelete: (id: string) => void;
  espacos: EspacoEvento[];
  clientes: Cliente[];
}

export function CalendarDetailModal({
  event,
  onClose,
  onUpdate,
  onDelete,
  espacos,
  clientes
}: CalendarDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: 'confirmado' | 'pendente' | 'cancelado') => {
    setIsUpdating(true);
    try {
      await onUpdate(event.id, { status: newStatus });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(event.id);
    setShowDeleteDialog(false);
    onClose();
  };

  const handleUpdate = async (data: Partial<Reserva>) => {
    await onUpdate(event.id, data);
    setIsEditMode(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado':
        return <CheckCircle className="h-4 w-4" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'default';
      case 'pendente':
        return 'secondary';
      case 'cancelado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isEditMode) {
    return (
      <CalendarEventForm
        open={true}
        onClose={() => setIsEditMode(false)}
        onSubmit={(data) => handleUpdate({
          titulo: data.titulo,
          espaco_evento_id: data.espaco_evento_id,
          cliente_id: data.cliente_id || undefined,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          hora_inicio: data.hora_inicio,
          hora_fim: data.hora_fim,
          status: data.status,
          descricao: data.descricao || undefined,
          observacoes: data.observacoes || undefined
        })}
        espacos={espacos}
        clientes={clientes}
        defaultValues={{
          titulo: event.titulo,
          espaco_evento_id: event.espaco_evento_id,
          cliente_id: event.cliente_id || undefined,
          data_inicio: event.data_inicio,
          data_fim: event.data_fim,
          hora_inicio: event.hora_inicio,
          hora_fim: event.hora_fim,
          status: event.status,
          descricao: event.descricao || undefined,
          observacoes: event.observacoes || undefined
        }}
        isEditMode={true}
      />
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{event.titulo}</DialogTitle>
              <Badge variant={getStatusColor(event.status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                {getStatusIcon(event.status)}
                <span className="ml-1">{event.status}</span>
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="info">Informações Adicionais</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              {/* Informações do Evento */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Início</p>
                        <p className="font-medium">
                          {format(parseISO(event.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Fim</p>
                        <p className="font-medium">
                          {format(parseISO(event.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Horário</p>
                        <p className="font-medium">
                          {event.hora_inicio} - {event.hora_fim}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Espaço</p>
                        <p className="font-medium">
                          {event.espaco?.nome || 'Não definido'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {event.descricao && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                      <p className="text-sm">{event.descricao}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informações do Cliente */}
              {event.cliente && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informações do Cliente
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{event.cliente.nome}</p>
                      </div>
                      {event.cliente.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Telefone</p>
                            <p className="font-medium">{event.cliente.telefone}</p>
                          </div>
                        </div>
                      )}
                      {event.cliente.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">E-mail</p>
                            <p className="font-medium">{event.cliente.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ações Rápidas */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">Ações Rápidas</h3>
                  <div className="flex gap-2">
                    {event.status === 'pendente' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusChange('confirmado')}
                          disabled={isUpdating}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusChange('cancelado')}
                          disabled={isUpdating}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </>
                    )}
                    {event.status === 'confirmado' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange('cancelado')}
                        disabled={isUpdating}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar Reserva
                      </Button>
                    )}
                    {event.status === 'cancelado' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStatusChange('pendente')}
                        disabled={isUpdating}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Reativar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              {/* Contrato Vinculado */}
              {event.contrato && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium flex items-center gap-2 mb-4">
                      <FileText className="h-4 w-4" />
                      Contrato Vinculado
                    </h3>
                    <p className="text-sm">
                      Número: <span className="font-medium">{event.contrato.numero}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Observações */}
              {event.observacoes && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium mb-4">Observações</h3>
                    <p className="text-sm text-muted-foreground">{event.observacoes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Metadados */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">Informações do Sistema</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <span className="ml-2 font-mono">{event.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Criado em:</span>
                      <span className="ml-2">
                        {format(parseISO(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {event.updated_at && (
                      <div>
                        <span className="text-muted-foreground">Atualizado em:</span>
                        <span className="ml-2">
                          {format(parseISO(event.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditMode(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}