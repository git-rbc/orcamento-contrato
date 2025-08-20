import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { FilaEspera, PontuacaoVendedor } from '@/types/calendario';

export function useFilaEspera() {
  const [filaEspera, setFilaEspera] = useState<FilaEspera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Buscar fila de espera por período
  const fetchFilaEspera = useCallback(async (dados: {
    espaco_evento_id: string;
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('v_fila_espera_completa')
        .select('*')
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .order('posicao_fila', { ascending: true });

      if (error) throw error;

      setFilaEspera(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar fila de espera';
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Calcular pontuação do vendedor
  const calcularPontuacao = useCallback(async (vendedorId?: string): Promise<PontuacaoVendedor> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = vendedorId || user?.id;

      if (!userId) throw new Error('Usuário não encontrado');

      // Pontos base (todos começam com 100)
      const pontosBase = 100;

      // Bonus por performance (taxa de conversão dos últimos 30 dias)
      const { data: conversoes, error: conversoesError } = await supabase
        .from('historico_conversoes')
        .select('id')
        .eq('usuario_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (conversoesError) throw conversoesError;

      const { data: reservasTemp, error: reservasError } = await supabase
        .from('reservas_temporarias')
        .select('id')
        .eq('usuario_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (reservasError) throw reservasError;

      const totalConversoes = conversoes?.length || 0;
      const totalReservas = reservasTemp?.length || 0;
      const taxaConversao = totalReservas > 0 ? (totalConversoes / totalReservas) * 100 : 0;
      
      let bonusPerformance = 0;
      if (taxaConversao >= 80) bonusPerformance = 50;
      else if (taxaConversao >= 60) bonusPerformance = 30;
      else if (taxaConversao >= 40) bonusPerformance = 15;

      // Bonus por experiência (tempo de cadastro)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const diasExperiencia = profile ? 
        Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      let bonusExperiencia = 0;
      if (diasExperiencia >= 365) bonusExperiencia = 25;
      else if (diasExperiencia >= 180) bonusExperiencia = 15;
      else if (diasExperiencia >= 90) bonusExperiencia = 10;
      else if (diasExperiencia >= 30) bonusExperiencia = 5;

      const total = pontosBase + bonusPerformance + bonusExperiencia;

      return {
        usuario_id: userId,
        pontos_base: pontosBase,
        bonus_performance: bonusPerformance,
        bonus_experiencia: bonusExperiencia,
        total
      };
    } catch (err) {
      console.error('Erro ao calcular pontuação:', err);
      return {
        usuario_id: vendedorId || '',
        pontos_base: 100,
        bonus_performance: 0,
        bonus_experiencia: 0,
        total: 100
      };
    }
  }, [supabase]);

  // Entrar na fila de espera
  const entrarNaFila = useCallback(async (dados: {
    espaco_evento_id: string;
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já está na fila para este período
      const { data: existing, error: existingError } = await supabase
        .from('fila_espera')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .eq('hora_inicio', dados.hora_inicio)
        .eq('hora_fim', dados.hora_fim)
        .eq('status', 'ativo')
        .single();

      if (existingError && existingError.code !== 'PGRST116') throw existingError;
      if (existing) {
        toast.error('Você já está na fila de espera para este período');
        return existing;
      }

      // Calcular pontuação
      const pontuacao = await calcularPontuacao(user.id);

      // Buscar posição na fila (baseado na pontuação)
      const { data: filaAtual, error: filaError } = await supabase
        .from('fila_espera')
        .select('pontuacao')
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .eq('hora_inicio', dados.hora_inicio)
        .eq('hora_fim', dados.hora_fim)
        .eq('status', 'ativo')
        .order('pontuacao', { ascending: false });

      if (filaError) throw filaError;

      // Calcular nova posição
      let posicao = 1;
      if (filaAtual) {
        for (const item of filaAtual) {
          if (pontuacao.total >= item.pontuacao) break;
          posicao++;
        }
      }

      // Inserir na fila
      const { data: novaEntrada, error } = await supabase
        .from('fila_espera')
        .insert({
          ...dados,
          usuario_id: user.id,
          posicao,
          pontuacao: pontuacao.total,
          status: 'ativo'
        })
        .select(`
          *,
          vendedor:profiles(nome, email),
          espaco:espacos_eventos(id, nome, cidade)
        `)
        .single();

      if (error) throw error;

      // Atualizar posições dos outros na fila
      if (filaAtual && filaAtual.length > 0) {
        await reordenarFila(dados, pontuacao.total);
      }

      // Atualizar estado local
      await fetchFilaEspera(dados);

      toast.success(`Você entrou na fila de espera na posição ${posicao}!`, {
        description: `Pontuação: ${pontuacao.total} pontos`
      });

      return novaEntrada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao entrar na fila';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase, calcularPontuacao, fetchFilaEspera]);

  // Sair da fila de espera
  const sairDaFila = useCallback(async (filaId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar dados da entrada na fila
      const { data: entrada, error: fetchError } = await supabase
        .from('fila_espera')
        .select('*')
        .eq('id', filaId)
        .eq('usuario_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!entrada) throw new Error('Entrada na fila não encontrada');

      // Remover da fila
      const { error } = await supabase
        .from('fila_espera')
        .update({ 
          status: 'removido',
          updated_at: new Date().toISOString()
        })
        .eq('id', filaId);

      if (error) throw error;

      // Reordenar as posições restantes
      await reordenarFilaRemocao({
        espaco_evento_id: entrada.espaco_evento_id,
        data_inicio: entrada.data_inicio,
        data_fim: entrada.data_fim,
        hora_inicio: entrada.hora_inicio,
        hora_fim: entrada.hora_fim
      });

      // Atualizar estado local
      setFilaEspera(prev => prev.filter(f => f.id !== filaId));

      toast.success('Você saiu da fila de espera');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sair da fila';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Consultar posição do usuário na fila
  const consultarPosicao = useCallback(async (dados: {
    espaco_evento_id: string;
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('fila_espera')
        .select('posicao, pontuacao')
        .eq('usuario_id', user.id)
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .eq('hora_inicio', dados.hora_inicio)
        .eq('hora_fim', dados.hora_fim)
        .eq('status', 'ativo')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    } catch (err) {
      console.error('Erro ao consultar posição:', err);
      return null;
    }
  }, [supabase]);

  // Buscar filas do usuário
  const fetchFilasUsuario = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('fila_espera')
        .select(`
          *,
          vendedor:profiles(nome, email),
          espaco:espacos_eventos(id, nome, cidade)
        `)
        .eq('usuario_id', user.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar filas do usuário:', err);
      return [];
    }
  }, [supabase]);

  // Buscar todas as filas (admin)
  const fetchTodasFilas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fila_espera')
        .select(`
          *,
          vendedor:profiles(nome, email),
          espaco:espacos_eventos(id, nome, cidade)
        `)
        .order('posicao', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar todas as filas:', err);
      return [];
    }
  }, [supabase]);

  // Função auxiliar para reordenar fila após inserção
  const reordenarFila = async (dados: {
    espaco_evento_id: string;
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  }, novaPontuacao: number) => {
    try {
      // Buscar toda a fila ordenada por pontuação
      const { data: fila, error } = await supabase
        .from('fila_espera')
        .select('id, pontuacao')
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .eq('hora_inicio', dados.hora_inicio)
        .eq('hora_fim', dados.hora_fim)
        .eq('status', 'ativo')
        .order('pontuacao', { ascending: false });

      if (error) throw error;

      // Atualizar posições
      const updates = fila?.map((item, index) => ({
        id: item.id,
        posicao: index + 1
      })) || [];

      for (const update of updates) {
        await supabase
          .from('fila_espera')
          .update({ posicao: update.posicao })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Erro ao reordenar fila:', err);
    }
  };

  // Função auxiliar para reordenar após remoção
  const reordenarFilaRemocao = async (dados: {
    espaco_evento_id: string;
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  }) => {
    try {
      const { data: fila, error } = await supabase
        .from('fila_espera')
        .select('id')
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .eq('hora_inicio', dados.hora_inicio)
        .eq('hora_fim', dados.hora_fim)
        .eq('status', 'ativo')
        .order('pontuacao', { ascending: false });

      if (error) throw error;

      const updates = fila?.map((item, index) => ({
        id: item.id,
        posicao: index + 1
      })) || [];

      for (const update of updates) {
        await supabase
          .from('fila_espera')
          .update({ posicao: update.posicao })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Erro ao reordenar fila após remoção:', err);
    }
  };

  return {
    filaEspera,
    loading,
    error,
    fetchFilaEspera,
    entrarNaFila,
    sairDaFila,
    consultarPosicao,
    calcularPontuacao,
    fetchFilasUsuario,
    fetchTodasFilas
  };
}