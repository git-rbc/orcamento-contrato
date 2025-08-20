'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Trophy, Clock, UserPlus, UserMinus, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useFilaEspera } from '@/hooks/useFilaEspera';
import type { FilaEspera } from '@/types/calendario';

// Função utilitária compartilhada entre componentes
const getEstimativaTempo = (posicao: number) => {
  // Estimativa baseada em histórico: média de 2 horas por posição
  const horas = posicao * 2;
  if (horas < 24) return `~${horas}h`;
  const dias = Math.ceil(horas / 24);
  return `~${dias} dia${dias > 1 ? 's' : ''}`;
};

interface FilaEsperaProps {
  dados: {
    espaco_evento_id: string;
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  };
  className?: string;
}

export function FilaEsperaCard({ dados, className }: FilaEsperaProps) {
  const [fila, setFila] = useState<FilaEspera[]>([]);
  const [posicaoUsuario, setPosicaoUsuario] = useState<any>(null);
  const [pontuacaoUsuario, setPontuacaoUsuario] = useState<any>(null);
  
  const { 
    fetchFilaEspera, 
    entrarNaFila, 
    sairDaFila, 
    consultarPosicao,
    calcularPontuacao,
    loading 
  } = useFilaEspera();

  useEffect(() => {
    carregarFila();
    carregarPosicaoUsuario();
    carregarPontuacaoUsuario();
  }, [dados]);

  const carregarFila = async () => {
    try {
      const filaData = await fetchFilaEspera(dados);
      setFila(filaData);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    }
  };

  const carregarPosicaoUsuario = async () => {
    try {
      const posicao = await consultarPosicao(dados);
      setPosicaoUsuario(posicao);
    } catch (error) {
      console.error('Erro ao consultar posição:', error);
    }
  };

  const carregarPontuacaoUsuario = async () => {
    try {
      const pontuacao = await calcularPontuacao();
      setPontuacaoUsuario(pontuacao);
    } catch (error) {
      console.error('Erro ao calcular pontuação:', error);
    }
  };

  const handleEntrarNaFila = async () => {
    try {
      await entrarNaFila(dados);
      await carregarFila();
      await carregarPosicaoUsuario();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSairDaFila = async () => {
    if (!posicaoUsuario) return;
    
    try {
      const entradaUsuario = fila.find(f => f.usuario_id === posicaoUsuario.usuario_id);
      if (entradaUsuario) {
        await sairDaFila(entradaUsuario.id);
        await carregarFila();
        setPosicaoUsuario(null);
      }
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const getPontuacaoColor = (pontos: number) => {
    if (pontos >= 150) return 'text-gold-600 bg-yellow-50';
    if (pontos >= 125) return 'text-purple-600 bg-purple-50';
    if (pontos >= 110) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPosicaoIcon = (posicao: number) => {
    if (posicao === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (posicao <= 3) return <Trophy className="h-4 w-4 text-orange-500" />;
    return <span className="text-sm font-bold">{posicao}º</span>;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Fila de Espera
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {format(parseISO(dados.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} •{' '}
          {dados.hora_inicio} - {dados.hora_fim}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pontuação do usuário */}
        {pontuacaoUsuario && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Sua Pontuação</span>
              <Badge variant="secondary" className={getPontuacaoColor(pontuacaoUsuario.total)}>
                {pontuacaoUsuario.total} pts
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Base: {pontuacaoUsuario.pontos_base} pts</div>
              {pontuacaoUsuario.bonus_performance > 0 && (
                <div>Performance: +{pontuacaoUsuario.bonus_performance} pts</div>
              )}
              {pontuacaoUsuario.bonus_experiencia > 0 && (
                <div>Experiência: +{pontuacaoUsuario.bonus_experiencia} pts</div>
              )}
            </div>
          </div>
        )}

        {/* Status do usuário */}
        {posicaoUsuario ? (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Você está na fila!
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {posicaoUsuario.posicao}º lugar
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Estimativa: {getEstimativaTempo(posicaoUsuario.posicao)}
              </span>
              <Button
                onClick={handleSairDaFila}
                disabled={loading}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <UserMinus className="h-3 w-3 mr-1" />
                Sair
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleEntrarNaFila}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Entrar na Fila
          </Button>
        )}

        <Separator />

        {/* Lista da fila */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Fila Atual ({fila.length} {fila.length === 1 ? 'pessoa' : 'pessoas'})
            </span>
          </div>

          {fila.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Fila vazia</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {fila.map((entrada, index) => (
                <div
                  key={entrada.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg border',
                    entrada.posicao === 1 && 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200',
                    entrada.posicao <= 3 && entrada.posicao > 1 && 'bg-orange-50 dark:bg-orange-950/20 border-orange-200'
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border">
                    {getPosicaoIcon(entrada.posicao)}
                  </div>

                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {entrada.vendedor?.nome?.slice(0, 2)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entrada.vendedor?.nome || 'Usuário'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entrada.pontuacao} pts</span>
                      <span>•</span>
                      <span>{getEstimativaTempo(entrada.posicao)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(entrada.created_at), 'dd/MM HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações sobre pontuação */}
        <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium mb-2">Como funciona a pontuação:</div>
            <div>• Base: 100 pontos</div>
            <div>• Performance: +0 a +50 pts (taxa de conversão)</div>
            <div>• Experiência: +0 a +25 pts (tempo na plataforma)</div>
            <div className="pt-1">
              <em>Maior pontuação = melhor posição na fila</em>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para listar filas do usuário
interface MinhasFilasProps {
  className?: string;
}

export function MinhasFilas({ className }: MinhasFilasProps) {
  const [filas, setFilas] = useState<FilaEspera[]>([]);
  const { fetchFilasUsuario, sairDaFila, loading } = useFilaEspera();

  useEffect(() => {
    carregarFilas();
  }, []);

  const carregarFilas = async () => {
    try {
      const filasData = await fetchFilasUsuario();
      setFilas(filasData);
    } catch (error) {
      console.error('Erro ao carregar filas do usuário:', error);
    }
  };

  const handleSairDaFila = async (filaId: string) => {
    try {
      await sairDaFila(filaId);
      await carregarFilas();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  if (filas.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Você não está em nenhuma fila de espera</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {filas.map((fila) => (
        <Card key={fila.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">{fila.espaco?.nome}</h4>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(fila.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} •{' '}
                  {fila.hora_inicio} - {fila.hora_fim}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50">
                {fila.posicao}º lugar
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{fila.pontuacao} pts</span>
                <span>Estimativa: {getEstimativaTempo(fila.posicao)}</span>
              </div>
              <Button
                onClick={() => handleSairDaFila(fila.id)}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                <UserMinus className="h-3 w-3 mr-1" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}