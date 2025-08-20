'use client';

import { useState, useEffect } from 'react';
import { Clock, Timer, RefreshCw, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ListaReservasTemporarias } from '@/components/calendario/reserva-temporaria';
import { ReservaTemporariaForm } from '@/components/calendario/reserva-temporaria-form';
import { useReservasTemporarias } from '@/hooks/useReservasTemporarias';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import type { ReservaTemporaria } from '@/types/calendario';

export default function ReservasTemporariasPage() {
  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState<ReservaTemporaria[]>([]);
  const [activeTab, setActiveTab] = useState<'ativas' | 'todas' | 'expiradas'>('ativas');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const { user, userProfile } = useAuth();
  const { fetchReservasUsuario, fetchTodasReservas, criarReservaTemporaria } = useReservasTemporarias();

  const isAdminOrSuperAdmin = userProfile?.role_nome?.toLowerCase().includes('admin') || 
                              userProfile?.role === 'admin';

  useEffect(() => {
    if (!user || !userProfile) {
      setLoading(false);
      return;
    }

    loadReservas();
  }, [user, userProfile, activeTab]);

  const loadReservas = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let data: ReservaTemporaria[] = [];

      if (isAdminOrSuperAdmin) {
        // Admin pode ver todas as reservas
        data = await fetchTodasReservas();
      } else {
        // Vendedor vê apenas suas reservas
        data = await fetchReservasUsuario();
      }

      // Filtrar conforme a aba ativa
      const filteredData = data.filter(reserva => {
        switch (activeTab) {
          case 'ativas':
            return reserva.status === 'ativa';
          case 'expiradas':
            return reserva.status === 'expirada';
          case 'todas':
            return true;
          default:
            return true;
        }
      });

      setReservas(filteredData);
    } catch (error) {
      toast.error('Erro ao carregar reservas temporárias');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReservas();
    setRefreshing(false);
    toast.success('Reservas atualizadas');
  };

  const handleConverterProposta = async (reservaId: string) => {
    toast.success('Proposta gerada com sucesso!');
    await loadReservas();
  };

  const handleLiberarReserva = async (reservaId: string) => {
    toast.success('Reserva liberada com sucesso!');
    await loadReservas();
  };

  const handleCriarReserva = async (dados: any) => {
    try {
      await criarReservaTemporaria(dados);
      setShowForm(false);
      await loadReservas();
      toast.success('Reserva temporária criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar reserva temporária:', error);
      toast.error('Erro ao criar reserva temporária');
      throw error;
    }
  };

  // Estatísticas das reservas
  const stats = {
    ativas: reservas.filter(r => r.status === 'ativa').length,
    expiradas: reservas.filter(r => r.status === 'expirada').length,
    convertidas: reservas.filter(r => r.status === 'convertida').length,
    liberadas: reservas.filter(r => r.status === 'liberada').length,
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Você precisa estar logado para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Timer className="h-8 w-8" />
            Reservas Temporárias
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdminOrSuperAdmin 
              ? 'Gerencie todas as reservas temporárias do sistema'
              : 'Gerencie suas reservas temporárias e gere propostas'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Reserva Temporária
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativas}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiradas</p>
                <p className="text-2xl font-bold text-red-600">{stats.expiradas}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <Timer className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Convertidas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.convertidas}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Liberadas</p>
                <p className="text-2xl font-bold text-purple-600">{stats.liberadas}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {isAdminOrSuperAdmin ? 'Todas as Reservas' : 'Suas Reservas'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Tabs para filtrar por status */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ativas" className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {stats.ativas}
                </Badge>
                Ativas
              </TabsTrigger>
              <TabsTrigger value="todas">
                Todas
              </TabsTrigger>
              <TabsTrigger value="expiradas" className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {stats.expiradas}
                </Badge>
                Expiradas
              </TabsTrigger>
            </TabsList>

            <Separator className="my-4" />

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Carregando reservas...</p>
                </div>
              ) : (
                <ListaReservasTemporarias
                  reservas={reservas}
                  onConverterProposta={handleConverterProposta}
                  onLiberarReserva={handleLiberarReserva}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal do Formulário */}
      {showForm && (
        <ReservaTemporariaForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleCriarReserva}
        />
      )}
    </div>
  );
}