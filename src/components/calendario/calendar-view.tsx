'use client';

import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  currentDate: Date;
  viewType: 'month' | 'week' | 'day';
  reservas: any[];
  bloqueios: any[];
  reservasTemporarias?: any[];
  onEventClick: (event: any) => void;
  onDateClick: (date: Date) => void;
  loading?: boolean;
}

export function CalendarView({
  currentDate,
  viewType,
  reservas,
  bloqueios,
  reservasTemporarias = [],
  onEventClick,
  onDateClick,
  loading = false
}: CalendarViewProps) {
  const days = useMemo(() => {
    if (viewType === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { locale: ptBR });
      const end = endOfWeek(endOfMonth(currentDate), { locale: ptBR });
      return eachDayOfInterval({ start, end });
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate, { locale: ptBR });
      const end = endOfWeek(currentDate, { locale: ptBR });
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewType]);

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayReservas = reservas.filter(reserva => {
      const inicio = parseISO(reserva.data_inicio);
      const fim = parseISO(reserva.data_fim);
      return dayStr >= reserva.data_inicio && dayStr <= reserva.data_fim;
    });

    const dayBloqueios = bloqueios.filter(bloqueio => {
      return dayStr >= bloqueio.data_inicio && dayStr <= bloqueio.data_fim;
    });

    const dayReservasTemp = reservasTemporarias.filter(reservaTemp => {
      return dayStr >= reservaTemp.data_inicio && dayStr <= reservaTemp.data_fim;
    });

    return { reservas: dayReservas, bloqueios: dayBloqueios, reservasTemporarias: dayReservasTemp };
  };

  const getStatusColor = (status: string, isTemporary = false) => {
    if (isTemporary) {
      switch (status) {
        case 'ativa':
          return 'bg-orange-500';
        case 'expirada':
          return 'bg-gray-400';
        case 'convertida':
          return 'bg-blue-500';
        case 'liberada':
          return 'bg-purple-500';
        default:
          return 'bg-orange-500';
      }
    }
    
    switch (status) {
      case 'confirmado':
        return 'bg-green-500';
      case 'pendente':
        return 'bg-yellow-500';
      case 'cancelado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'default' as const;
      case 'pendente':
        return 'secondary' as const;
      case 'cancelado':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (viewType === 'day') {
    const dayEvents = getEventsForDay(currentDate);
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Horários do dia */}
          {Array.from({ length: 24 }).map((_, hour) => {
            const hourStr = `${hour.toString().padStart(2, '0')}:00`;
            const hourEvents = dayEvents.reservas.filter(r => {
              const eventHour = parseInt(r.hora_inicio.split(':')[0]);
              return eventHour === hour;
            });

            const hourTempEvents = dayEvents.reservasTemporarias?.filter(r => {
              const eventHour = parseInt(r.hora_inicio.split(':')[0]);
              return eventHour === hour;
            }) || [];

            return (
              <div key={hour} className="flex gap-4 min-h-[60px]">
                <div className="w-20 text-sm text-muted-foreground text-right">
                  {hourStr}
                </div>
                <div className="flex-1 border-t pt-2">
                  {/* Reservas normais */}
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="mb-2 p-2 rounded-lg bg-accent hover:bg-accent/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{event.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.hora_inicio} - {event.hora_fim}
                          </p>
                          {event.espaco && (
                            <p className="text-xs text-muted-foreground">
                              {event.espaco.nome}
                            </p>
                          )}
                        </div>
                        <Badge variant={getStatusBadgeVariant(event.status)}>
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Reservas temporárias */}
                  {hourTempEvents.map((tempEvent) => (
                    <div
                      key={`temp-${tempEvent.id}`}
                      onClick={() => onEventClick({ ...tempEvent, tipo: 'temporaria' })}
                      className="mb-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 cursor-pointer transition-colors border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            Reserva Temporária
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tempEvent.hora_inicio} - {tempEvent.hora_fim}
                          </p>
                          {tempEvent.espaco && (
                            <p className="text-xs text-muted-foreground">
                              {tempEvent.espaco.nome}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          {tempEvent.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bloqueios do dia */}
        {dayEvents.bloqueios.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
              Datas Bloqueadas
            </h3>
            {dayEvents.bloqueios.map((bloqueio) => (
              <div key={bloqueio.id} className="text-sm text-muted-foreground">
                {bloqueio.motivo}
                {bloqueio.espaco && ` - ${bloqueio.espaco.nome}`}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header com dias da semana */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = viewType === 'month' ? isSameMonth(day, currentDate) : true;
          const hasEvents = dayEvents.reservas.length > 0 || dayEvents.bloqueios.length > 0 || (dayEvents.reservasTemporarias?.length || 0) > 0;

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                console.log('Data clicada:', format(day, 'yyyy-MM-dd'));
                onDateClick(day);
              }}
              className={cn(
                'min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors',
                'hover:bg-accent/50 hover:shadow-md',
                !isCurrentMonth && 'opacity-50 bg-muted/30',
                isToday(day) && 'ring-2 ring-primary',
                dayEvents.bloqueios.length > 0 && 'bg-red-50 dark:bg-red-950/20'
              )}
              title={`Clique para agendar em ${format(day, 'dd/MM/yyyy', { locale: ptBR })}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isToday(day) && 'text-primary font-bold'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {hasEvents && (
                  <div className="flex gap-1">
                    {dayEvents.reservas.length > 0 && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    {dayEvents.bloqueios.length > 0 && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                    {(dayEvents.reservasTemporarias?.length || 0) > 0 && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {/* Mostrar até 2 eventos (reservas + temporárias) */}
                {dayEvents.reservas.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={cn(
                      'text-xs p-1 rounded truncate cursor-pointer',
                      'hover:opacity-80 transition-opacity',
                      getStatusColor(event.status),
                      'text-white'
                    )}
                    title={event.titulo}
                  >
                    {event.titulo}
                  </div>
                ))}

                {/* Reservas temporárias */}
                {dayEvents.reservasTemporarias?.slice(0, Math.max(0, 2 - dayEvents.reservas.length)).map((tempEvent) => (
                  <div
                    key={`temp-${tempEvent.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick({ ...tempEvent, tipo: 'temporaria' });
                    }}
                    className={cn(
                      'text-xs p-1 rounded truncate cursor-pointer',
                      'hover:opacity-80 transition-opacity',
                      getStatusColor(tempEvent.status, true),
                      'text-white'
                    )}
                    title="Reserva Temporária"
                  >
                    Temp. - {tempEvent.espaco?.nome}
                  </div>
                ))}

                {/* Indicador de mais eventos */}
                {(dayEvents.reservas.length + (dayEvents.reservasTemporarias?.length || 0)) > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{(dayEvents.reservas.length + (dayEvents.reservasTemporarias?.length || 0)) - 2} mais
                  </div>
                )}

                {/* Indicador de bloqueio */}
                {dayEvents.bloqueios.length > 0 && (
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Bloqueado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}