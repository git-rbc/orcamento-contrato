'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, FileText, Trash2, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import type { ReservaTemporaria } from '@/types/calendario';

interface ReservaTemporariaProps {
  reserva: ReservaTemporaria;
  onConverterProposta?: (reservaId: string) => void;
  onLiberarReserva?: (reservaId: string) => void;
  className?: string;
}

export function ReservaTemporariaCard({ 
  reserva, 
  onConverterProposta, 
  onLiberarReserva,
  className 
}: ReservaTemporariaProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    percentage: number;
  }>({ hours: 0, minutes: 0, percentage: 0 });

  const { converterParaProposta, liberarReserva, loading } = useReservasTemporarias();
  const { notificarPropostaPronta } = useNotificacoes();

  useEffect(() => {
    if (reserva.status !== 'ativa') return;

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = parseISO(reserva.expira_em);
      const createdAt = parseISO(reserva.created_at);
      
      const totalMinutes = differenceInMinutes(expiresAt, createdAt);
      const minutesLeft = differenceInMinutes(expiresAt, now);
      
      if (minutesLeft <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, percentage: 0 });
        return;
      }

      const hours = Math.floor(minutesLeft / 60);
      const minutes = minutesLeft % 60;
      const percentage = (minutesLeft / totalMinutes) * 100;

      setTimeLeft({ hours, minutes, percentage });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [reserva.expira_em, reserva.created_at, reserva.status]);

  const handleConverterProposta = async () => {
    try {
      const resultado = await converterParaProposta(reserva.id);
      
      // Enviar notificação de proposta gerada
      if (resultado?.proposta && reserva.cliente) {
        await notificarPropostaPronta({
          nome: reserva.cliente.nome,
          email: reserva.cliente.email,
          numeroReserva: reserva.numero_reserva || `RT-${reserva.id.slice(0, 8)}`,
          linkProposta: `${window.location.origin}/proposta/${resultado.proposta.token}`,
          data: format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          hora: `${reserva.hora_inicio} - ${reserva.hora_fim}`,
          espaco: reserva.espaco?.nome,
          valorProposta: resultado.proposta.valor_total ? 
            `R$ ${resultado.proposta.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
            undefined,
          tempoResposta: '48 horas',
        });
      }
      
      onConverterProposta?.(reserva.id);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleLiberarReserva = async () => {
    try {
      await liberarReserva(reserva.id);
      onLiberarReserva?.(reserva.id);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const getStatusColor = () => {
    switch (reserva.status) {
      case 'ativa':
        if (timeLeft.hours < 6) return 'bg-red-500';
        if (timeLeft.hours < 12) return 'bg-yellow-500';
        return 'bg-green-500';
      case 'expirada':
        return 'bg-gray-500';
      case 'convertida':
        return 'bg-blue-500';
      case 'liberada':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (reserva.status) {
      case 'ativa':
        return 'Ativa';
      case 'expirada':
        return 'Expirada';
      case 'convertida':
        return 'Convertida';
      case 'liberada':
        return 'Liberada';
      default:
        return 'Desconhecido';
    }
  };

  const getProgressColor = () => {
    if (timeLeft.percentage > 50) return 'bg-green-500';
    if (timeLeft.percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Reserva Temporária
          </CardTitle>
          <Badge 
            className={cn('text-white', getStatusColor())}
            variant="secondary"
          >
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações básicas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Espaço:</span>
            <span>{reserva.espaco?.nome}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Data:</span>
            <span>
              {format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
              {reserva.data_inicio !== reserva.data_fim && 
                ` até ${format(parseISO(reserva.data_fim), 'dd/MM/yyyy', { locale: ptBR })}`
              }
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>{reserva.hora_inicio} - {reserva.hora_fim}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Criado em:</span>
            <span>
              {format(parseISO(reserva.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Timer e progress para reservas ativas */}
        {reserva.status === 'ativa' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tempo restante:</span>
                <span className={cn(
                  'text-lg font-bold',
                  timeLeft.hours < 6 ? 'text-red-600' : 
                  timeLeft.hours < 12 ? 'text-yellow-600' : 'text-green-600'
                )}>
                  {timeLeft.hours}h {timeLeft.minutes}m
                </span>
              </div>

              <div className="space-y-1">
                <Progress 
                  value={timeLeft.percentage} 
                  className="w-full h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Criado</span>
                  <span>
                    Expira em {format(parseISO(reserva.expira_em), 'dd/MM HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botões de ação */}
        {reserva.status === 'ativa' && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                onClick={handleConverterProposta}
                disabled={loading}
                className="flex-1"
                variant="default"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Proposta
              </Button>

              <Button
                onClick={handleLiberarReserva}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Liberar Reserva
              </Button>
            </div>
          </>
        )}

        {/* Status de expirada/convertida */}
        {reserva.status === 'expirada' && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              Esta reserva expirou em{' '}
              {format(parseISO(reserva.expira_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          </div>
        )}

        {reserva.status === 'convertida' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Reserva convertida em proposta com sucesso!
            </p>
          </div>
        )}

        {reserva.status === 'liberada' && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Reserva liberada. A fila de espera foi notificada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Lista de reservas temporárias
interface ListaReservasTemporariasProps {
  reservas: ReservaTemporaria[];
  onConverterProposta?: (reservaId: string) => void;
  onLiberarReserva?: (reservaId: string) => void;
  className?: string;
}

export function ListaReservasTemporarias({ 
  reservas, 
  onConverterProposta, 
  onLiberarReserva,
  className 
}: ListaReservasTemporariasProps) {
  if (reservas.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma reserva temporária encontrada</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {reservas.map((reserva) => (
        <ReservaTemporariaCard
          key={reserva.id}
          reserva={reserva}
          onConverterProposta={onConverterProposta}
          onLiberarReserva={onLiberarReserva}
        />
      ))}
    </div>
  );
}