'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarView } from '@/components/calendario/calendar-view';
import { CalendarFilters } from '@/components/calendario/calendar-filters';
import { CalendarDetailModal } from '@/components/calendario/calendar-detail-modal';
import { CalendarEventForm } from '@/components/calendario/calendar-event-form';
import { useCalendario } from '@/hooks/useCalendario';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useFilaEspera } from '@/hooks/useFilaEspera';
import { toast } from 'sonner';

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');
  const [showFilters, setShowFilters] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [filters, setFilters] = useState({
    espacoId: 'todos',
    status: 'todos',
    clienteId: 'todos'
  });

  const {
    reservas,
    bloqueios,
    espacos,
    clientes,
    loading,
    fetchReservas,
    fetchBloqueios,
    createReserva,
    updateReserva,
    deleteReserva,
    createBloqueio,
    deleteBloqueio
  } = useCalendario();

  const { criarReservaTemporaria } = useReservasTemporarias();
  const { entrarNaFila } = useFilaEspera();

  useEffect(() => {
    const loadData = async () => {
      const startDate = viewType === 'month' 
        ? startOfMonth(currentDate)
        : viewType === 'week'
        ? startOfWeek(currentDate, { locale: ptBR })
        : currentDate;

      const endDate = viewType === 'month'
        ? endOfMonth(currentDate)
        : viewType === 'week'
        ? endOfWeek(currentDate, { locale: ptBR })
        : currentDate;

      await Promise.all([
        fetchReservas(startDate, endDate, filters),
        fetchBloqueios(startDate, endDate, filters.espacoId === 'todos' ? '' : filters.espacoId)
      ]);
    };

    loadData();
  }, [currentDate, viewType, filters]);

  const handlePreviousPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => addDays(prev, -7));
    } else {
      setCurrentDate(prev => addDays(prev, -1));
    }
  };

  const handleNextPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => addDays(prev, 7));
    } else {
      setCurrentDate(prev => addDays(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventForm(true);
  };

  const handleCreateEvent = async (data: any) => {
    try {
      await createReserva(data);
      toast.success('Reserva criada com sucesso!');
      setShowEventForm(false);
      await fetchReservas(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
        filters
      );
    } catch (error) {
      toast.error('Erro ao criar reserva');
    }
  };

  const handleUpdateEvent = async (id: string, data: any) => {
    try {
      await updateReserva(id, data);
      toast.success('Reserva atualizada com sucesso!');
      setSelectedEvent(null);
      await fetchReservas(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
        filters
      );
    } catch (error) {
      toast.error('Erro ao atualizar reserva');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteReserva(id);
      toast.success('Reserva excluída com sucesso!');
      setSelectedEvent(null);
      await fetchReservas(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
        filters
      );
    } catch (error) {
      toast.error('Erro ao excluir reserva');
    }
  };

  const handleCreateBloqueio = async (data: any) => {
    try {
      await createBloqueio(data);
      toast.success('Bloqueio criado com sucesso!');
      await fetchBloqueios(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
        filters.espacoId === 'todos' ? '' : filters.espacoId
      );
    } catch (error) {
      toast.error('Erro ao criar bloqueio');
    }
  };

  const handleDeleteBloqueio = async (id: string) => {
    try {
      await deleteBloqueio(id);
      toast.success('Bloqueio removido com sucesso!');
      await fetchBloqueios(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
        filters.espacoId === 'todos' ? '' : filters.espacoId
      );
    } catch (error) {
      toast.error('Erro ao remover bloqueio');
    }
  };

  const handleCreateTemporaria = async (data: any) => {
    try {
      await criarReservaTemporaria(data);
      toast.success('Reserva temporária criada com sucesso!');
      // Refresh data
      await fetchReservas(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
        filters
      );
    } catch (error) {
      toast.error('Erro ao criar reserva temporária');
    }
  };

  const handleEntrarFila = async (data: any) => {
    try {
      await entrarNaFila(data);
      toast.success('Você entrou na fila de espera!');
    } catch (error) {
      toast.error('Erro ao entrar na fila de espera');
    }
  };

  const currentPeriodLabel = useMemo(() => {
    if (viewType === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    } else if (viewType === 'week') {
      const weekStart = startOfWeek(currentDate, { locale: ptBR });
      const weekEnd = endOfWeek(currentDate, { locale: ptBR });
      return `${format(weekStart, 'dd MMM', { locale: ptBR })} - ${format(weekEnd, 'dd MMM yyyy', { locale: ptBR })}`;
    } else {
      return format(currentDate, 'EEEE, dd MMMM yyyy', { locale: ptBR });
    }
  }, [currentDate, viewType]);

  const stats = useMemo(() => {
    const confirmadas = reservas.filter(r => r.status === 'confirmado').length;
    const pendentes = reservas.filter(r => r.status === 'pendente').length;
    const bloqueadas = bloqueios.length;

    return { confirmadas, pendentes, bloqueadas };
  }, [reservas, bloqueios]);

  return (
    <div className="container mx-auto p-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Calendário de Eventos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie reservas e disponibilidade dos espaços
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => setShowEventForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reserva
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmadas}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Datas Bloqueadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.bloqueadas}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80">
            <CalendarFilters
              filters={filters}
              onFiltersChange={setFilters}
              espacos={espacos}
              clientes={clientes}
            />
          </div>
        )}

        {/* Calendar Content */}
        <div className="flex-1">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousPeriod}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPeriod}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleToday}
                  >
                    Hoje
                  </Button>
                </div>

                <h2 className="text-xl font-semibold capitalize">
                  {currentPeriodLabel}
                </h2>

                <div className="flex gap-1">
                  <Button
                    variant={viewType === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('month')}
                  >
                    Mês
                  </Button>
                  <Button
                    variant={viewType === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('week')}
                  >
                    Semana
                  </Button>
                  <Button
                    variant={viewType === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('day')}
                  >
                    Dia
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <CalendarView
                currentDate={currentDate}
                viewType={viewType}
                reservas={reservas}
                bloqueios={bloqueios}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <CalendarEventForm
          open={showEventForm}
          onClose={() => {
            setShowEventForm(false);
            setSelectedDate(null);
          }}
          onSubmit={handleCreateEvent}
          onSubmitTemporaria={handleCreateTemporaria}
          onEntrarFilaEspera={handleEntrarFila}
          espacos={espacos}
          clientes={clientes}
          defaultDate={selectedDate}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <CalendarDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          espacos={espacos}
          clientes={clientes}
        />
      )}
    </div>
  );
}