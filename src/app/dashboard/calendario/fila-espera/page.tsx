'use client';

import { useState, useEffect } from 'react';
import { Users, Trophy, Search, RefreshCw, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FilaEsperaCard } from '@/components/calendario/fila-espera';
import { useFilaEspera } from '@/hooks/useFilaEspera';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FilaEspera, EspacoEvento } from '@/types/calendario';

export default function FilaEsperaPage() {
  const [loading, setLoading] = useState(true);
  const [filas, setFilas] = useState<FilaEspera[]>([]);
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filtros, setFiltros] = useState({
    espacoId: 'todos',
    status: 'ativo',
    busca: ''
  });

  const { user, userProfile } = useAuth();
  const { fetchTodasFilas, fetchFilasUsuario, entrarNaFila, sairDaFila } = useFilaEspera();
  const { fetchEspacos } = useEspacosEventos();

  const isAdminOrSuperAdmin = userProfile?.role_nome?.toLowerCase().includes('admin') || 
                              userProfile?.role === 'admin';

  useEffect(() => {
    if (!user || !userProfile) {
      setLoading(false);
      return;
    }

    loadInitialData();
  }, [user, userProfile]);

  useEffect(() => {
    if (user && userProfile) {
      loadFilas();
    }
  }, [filtros, user, userProfile]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await fetchEspacos(); // Não retorna dados, apenas atualiza o estado
    } catch (error) {
      toast.error('Erro ao carregar dados iniciais');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilas = async () => {
    if (!user) return;

    try {
      let data: FilaEspera[] = [];

      if (isAdminOrSuperAdmin) {
        data = await fetchTodasFilas();
      } else {
        data = await fetchFilasUsuario();
      }

      // Aplicar filtros
      const filteredData = data.filter(fila => {
        const matchStatus = !filtros.status || filtros.status === 'todos' || fila.status === filtros.status;
        const matchEspaco = !filtros.espacoId || filtros.espacoId === 'todos' || fila.espaco_evento_id === filtros.espacoId;
        const matchBusca = !filtros.busca || 
          fila.vendedor?.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
          fila.espaco?.nome.toLowerCase().includes(filtros.busca.toLowerCase());

        return matchStatus && matchEspaco && matchBusca;
      });

      // Ordenar por posição e pontuação
      const sortedData = filteredData.sort((a, b) => {
        if (a.posicao !== b.posicao) {
          return a.posicao - b.posicao;
        }
        return b.pontuacao - a.pontuacao;
      });

      setFilas(sortedData);
    } catch (error) {
      toast.error('Erro ao carregar fila de espera');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFilas();
    setRefreshing(false);
    toast.success('Fila de espera atualizada');
  };

  const handleEntrarFila = async (dados: any) => {
    try {
      await entrarNaFila(dados);
      toast.success('Você entrou na fila de espera!');
      await loadFilas();
    } catch (error) {
      toast.error('Erro ao entrar na fila de espera');
    }
  };

  const handleSairFila = async (filaId: string) => {
    try {
      await sairDaFila(filaId);
      toast.success('Você saiu da fila de espera');
      await loadFilas();
    } catch (error) {
      toast.error('Erro ao sair da fila de espera');
    }
  };

  // Estatísticas das filas
  const stats = {
    total: filas.length,
    ativas: filas.filter(f => f.status === 'ativo').length,
    notificadas: filas.filter(f => f.status === 'notificado').length,
    minhasPosicoes: isAdminOrSuperAdmin ? 0 : filas.filter(f => f.usuario_id === user?.id).length,
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
            <Users className="h-8 w-8" />
            Fila de Espera
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdminOrSuperAdmin 
              ? 'Gerencie todas as filas de espera do sistema'
              : 'Acompanhe suas posições na fila e entre em novas filas'
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Filas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativas}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notificadas</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.notificadas}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {!isAdminOrSuperAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minhas Posições</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.minhasPosicoes}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Nome do vendedor ou espaço..."
                value={filtros.busca}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Espaço</label>
              <Select value={filtros.espacoId} onValueChange={(value) => setFiltros(prev => ({ ...prev, espacoId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os espaços" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os espaços</SelectItem>
                  {espacos.map((espaco) => (
                    <SelectItem key={espaco.id} value={espaco.id}>
                      {espaco.nome} - {espaco.cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filtros.status} onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="notificado">Notificado</SelectItem>
                  <SelectItem value="removido">Removido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Filas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {isAdminOrSuperAdmin ? 'Todas as Filas de Espera' : 'Suas Filas de Espera'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Carregando filas...</p>
            </div>
          ) : filas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma fila de espera encontrada</p>
              <p className="text-sm mt-1">
                {filtros.busca || (filtros.espacoId && filtros.espacoId !== 'todos') || filtros.status !== 'ativo' 
                  ? 'Tente ajustar os filtros para ver mais resultados'
                  : 'Você ainda não está em nenhuma fila de espera'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filas.map((fila, index) => (
                <Card key={fila.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Posição na fila */}
                        <div className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full font-bold text-lg">
                          #{fila.posicao}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{fila.espaco?.nome}</h3>
                            <Badge variant="secondary">
                              {fila.espaco?.cidade}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              {format(new Date(fila.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                              {fila.data_inicio !== fila.data_fim && 
                                ` até ${format(new Date(fila.data_fim), 'dd/MM/yyyy', { locale: ptBR })}`
                              }
                            </p>
                            <p>{fila.hora_inicio} - {fila.hora_fim}</p>
                          </div>
                          {isAdminOrSuperAdmin && (
                            <p className="text-sm">
                              <strong>Vendedor:</strong> {fila.vendedor?.nome}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium">{fila.pontuacao} pontos</span>
                          </div>
                          <Badge 
                            variant={
                              fila.status === 'ativo' ? 'default' :
                              fila.status === 'notificado' ? 'secondary' : 'destructive'
                            }
                          >
                            {fila.status === 'ativo' ? 'Ativo' :
                             fila.status === 'notificado' ? 'Notificado' : 'Removido'}
                          </Badge>
                        </div>

                        {!isAdminOrSuperAdmin && fila.usuario_id === user?.id && fila.status === 'ativo' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSairFila(fila.id)}
                          >
                            Sair da Fila
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}