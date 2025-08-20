'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';
import { CalendarView } from './calendar-view';
import { ListaReservasTemporarias } from './reserva-temporaria';
import { MinhasFilas, FilaEsperaCard } from './fila-espera';
import { DashboardVendedor } from './dashboard-vendedor';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useCalendario } from '@/hooks/useCalendario';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface CalendarioReservasTemporariasProps {
  className?: string;
}

export function CalendarioReservasTemporarias({ className }: CalendarioReservasTemporariasProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [activeTab, setActiveTab] = useState('calendario');

  const {
    reservas,
    bloqueios,
    espacos,
    loading: calendarioLoading,
    fetchReservas,
    fetchBloqueios
  } = useCalendario();

  const {
    reservasTemporarias,
    loading: tempLoading,
    fetchReservasUsuario,
    verificarExpiracao
  } = useReservasTemporarias();

  useEffect(() => {
    carregarDados();
    
    // Verificar expiração a cada 5 minutos
    const interval = setInterval(() => {
      verificarExpiracao();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedDate, viewMode]);

  const carregarDados = async () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    await Promise.all([
      fetchReservas(start, end),
      fetchBloqueios(start, end),
      fetchReservasUsuario()
    ]);
  };

  const handleEventClick = (event: any) => {
    if (event.tipo === 'temporaria') {
      console.log('Clicou em reserva temporária:', event);
      // Abrir modal específico para reserva temporária
    } else {
      console.log('Clicou em evento:', event);
      // Abrir modal normal de reserva/bloqueio
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode !== 'day') {
      setViewMode('day');
    }
  };

  const handleRefresh = async () => {
    await carregarDados();
  };

  const getDadosFilaEspera = () => {
    // Para demonstração, usando dados do primeiro espaço disponível
    if (espacos.length === 0) return null;
    
    return {
      espaco_evento_id: espacos[0].id,
      data_inicio: format(selectedDate, 'yyyy-MM-dd'),
      data_fim: format(selectedDate, 'yyyy-MM-dd'),
      hora_inicio: '14:00',
      hora_fim: '18:00'
    };
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sistema de Reservas</h1>
          <p className="text-muted-foreground">
            Gerencie reservas temporárias, fila de espera e dashboard
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={calendarioLoading || tempLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(calendarioLoading || tempLoading) ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="reservas">Minhas Reservas</TabsTrigger>
          <TabsTrigger value="filas">Filas de Espera</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mês
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Reservas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Temporárias</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Bloqueios</span>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <CalendarView
                currentDate={selectedDate}
                viewType={viewMode}
                reservas={reservas}
                bloqueios={bloqueios}
                reservasTemporarias={reservasTemporarias}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                loading={calendarioLoading}
              />
            </CardContent>
          </Card>

          {/* Fila de espera para o dia selecionado */}
          {getDadosFilaEspera() && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fila de Espera - {format(selectedDate, 'dd/MM/yyyy')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FilaEsperaCard dados={getDadosFilaEspera()!} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reservas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Reservas Temporárias</CardTitle>
            </CardHeader>
            <CardContent>
              <ListaReservasTemporarias
                reservas={reservasTemporarias}
                onConverterProposta={(id) => {
                  console.log('Convertendo proposta:', id);
                  carregarDados();
                }}
                onLiberarReserva={(id) => {
                  console.log('Liberando reserva:', id);
                  carregarDados();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Posições em Filas</CardTitle>
            </CardHeader>
            <CardContent>
              <MinhasFilas />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardVendedor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CalendarioReservasTemporarias;