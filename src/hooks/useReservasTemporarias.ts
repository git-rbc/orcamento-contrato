import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { addHours, parseISO, differenceInHours, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { ReservaTemporaria } from '@/types/calendario';
import { useNotificacoes } from '@/hooks/useNotificacoes';

export function useReservasTemporarias() {
  const [reservasTemporarias, setReservasTemporarias] = useState<ReservaTemporaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const { notificarNovaReserva, notificarDatasLiberadas } = useNotificacoes();

  // Buscar reservas temporárias do usuário
  const fetchReservasUsuario = useCallback(async (vendedorId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = vendedorId || user?.id;

      if (!userId) throw new Error('Usuário não encontrado');

      const { data, error } = await supabase
        .from('v_reservas_temporarias_completa')
        .select('*')
        .eq('usuario_id', userId)
        .in('status', ['ativa', 'expirada'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReservasTemporarias(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar reservas temporárias';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Criar reserva temporária
  const criarReservaTemporaria = useCallback(async (dados: {
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

      // Verificar se já existe reserva temporária para este período
      const { data: existing, error: existingError } = await supabase
        .from('reservas_temporarias')
        .select('id')
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .eq('usuario_id', user.id)
        .eq('data_inicio', dados.data_inicio)
        .eq('data_fim', dados.data_fim)
        .eq('hora_inicio', dados.hora_inicio)
        .eq('hora_fim', dados.hora_fim)
        .eq('status', 'ativa')
        .single();

      if (existingError && existingError.code !== 'PGRST116') throw existingError;
      if (existing) {
        toast.error('Você já possui uma reserva temporária para este período');
        return existing;
      }

      // Verificar disponibilidade
      const { data: conflitos } = await supabase
        .from('reservas_espacos')
        .select('id')
        .eq('espaco_evento_id', dados.espaco_evento_id)
        .gte('data_fim', dados.data_inicio)
        .lte('data_inicio', dados.data_fim)
        .neq('status', 'cancelado');

      if (conflitos && conflitos.length > 0) {
        throw new Error('Período não disponível - já existe reserva confirmada');
      }

      // Criar reserva temporária com expiração de 48 horas
      const expiresAt = addHours(new Date(), 48);
      
      const { data: newReserva, error } = await supabase
        .from('reservas_temporarias')
        .insert({
          ...dados,
          usuario_id: user.id,
          status: 'ativa',
          expira_em: expiresAt.toISOString()
        })
        .select('*')
        .single();

      if (error) throw error;

      // Atualizar estado local
      setReservasTemporarias(prev => [newReserva, ...prev]);

      // Enviar notificação de confirmação de interesse
      if (user?.email) {
        await notificarNovaReserva({
          nome: user.user_metadata?.nome || 'Usuário',
          email: user.email,
          data: format(parseISO(newReserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          hora: `${newReserva.hora_inicio} - ${newReserva.hora_fim}`,
          espaco: '', // Será preenchido pela view se necessário
          numeroReserva: newReserva.id,
          tempoExpiracao: format(parseISO(newReserva.expira_em), 'dd/MM/yyyy \\à\\s HH:mm', { locale: ptBR }),
          observacoes: `Reserva temporária válida por 48 horas`,
        });
      }

      toast.success('Reserva temporária criada com sucesso!', {
        description: 'Você tem 48 horas para converter em proposta'
      });

      return newReserva;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar reserva temporária';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase, notificarNovaReserva]);

  // Converter reserva temporária para proposta
  const converterParaProposta = useCallback(async (reservaTemporariaId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar dados da reserva temporária
      const { data: reservaTemp, error: fetchError } = await supabase
        .from('reservas_temporarias')
        .select('*')
        .eq('id', reservaTemporariaId)
        .eq('usuario_id', user.id)
        .eq('status', 'ativa')
        .single();

      if (fetchError) throw fetchError;
      if (!reservaTemp) throw new Error('Reserva temporária não encontrada');

      // Verificar se ainda não expirou
      const now = new Date();
      const expiresAt = parseISO(reservaTemp.expira_em);
      if (now > expiresAt) {
        throw new Error('Reserva temporária expirada');
      }

      // Criar proposta de contrato
      const { data: proposta, error: propostaError } = await supabase
        .from('propostas')
        .insert({
          espaco_evento_id: reservaTemp.espaco_evento_id,
          data_inicio: reservaTemp.data_inicio,
          data_fim: reservaTemp.data_fim,
          hora_inicio: reservaTemp.hora_inicio,
          hora_fim: reservaTemp.hora_fim,
          usuario_id: user.id,
          status: 'rascunho',
          origem_reserva_temporaria: reservaTemporariaId
        })
        .select()
        .single();

      if (propostaError) throw propostaError;

      // Atualizar status da reserva temporária
      const { error: updateError } = await supabase
        .from('reservas_temporarias')
        .update({ 
          status: 'convertida',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservaTemporariaId);

      if (updateError) throw updateError;

      // Registrar no histórico de conversões
      const tempoConversao = differenceInHours(now, parseISO(reservaTemp.created_at));
      await supabase
        .from('historico_conversoes')
        .insert({
          reserva_temporaria_id: reservaTemporariaId,
          proposta_id: proposta.id,
          usuario_id: user.id,
          tempo_conversao_horas: tempoConversao
        });

      // Atualizar estado local
      setReservasTemporarias(prev => 
        prev.map(r => r.id === reservaTemporariaId 
          ? { ...r, status: 'convertida' as const }
          : r
        )
      );

      toast.success('Proposta criada com sucesso!', {
        description: 'Sua reserva foi convertida para proposta'
      });

      return { 
        proposta, 
        reserva: reservaTemp 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao converter reserva';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Liberar reserva temporária
  const liberarReserva = useCallback(async (reservaTemporariaId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('reservas_temporarias')
        .update({ 
          status: 'liberada',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservaTemporariaId)
        .eq('usuario_id', user.id);

      if (error) throw error;

      // Atualizar estado local
      setReservasTemporarias(prev => 
        prev.map(r => r.id === reservaTemporariaId 
          ? { ...r, status: 'liberada' as const }
          : r
        )
      );

      // Notificar pessoas na fila de espera
      await notificarFilaEspera(reservaTemporariaId);

      toast.success('Reserva liberada com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao liberar reserva';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase, notificarDatasLiberadas]);

  // Verificar expiração das reservas
  const verificarExpiracao = useCallback(async () => {
    try {
      const now = new Date();
      
      const { data, error } = await supabase
        .from('reservas_temporarias')
        .select('id')
        .eq('status', 'ativa')
        .lt('expira_em', now.toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        const ids = data.map(r => r.id);
        
        await supabase
          .from('reservas_temporarias')
          .update({ 
            status: 'expirada',
            updated_at: now.toISOString()
          })
          .in('id', ids);

        // Atualizar estado local
        setReservasTemporarias(prev => 
          prev.map(r => ids.includes(r.id) 
            ? { ...r, status: 'expirada' as const }
            : r
          )
        );
      }
    } catch (err) {
      console.error('Erro ao verificar expiração:', err);
    }
  }, [supabase]);

  // Listar reservas por vendedor (para admin)
  const listarReservasUsuario = useCallback(async (vendedorId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservas_temporarias')
        .select(`
          *,
          vendedor:profiles(nome, email),
          espaco:espacos_eventos(id, nome, cidade)
        `)
        .eq('vendedor_id', vendedorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao listar reservas do usuário:', err);
      throw err;
    }
  }, [supabase]);

  // Função auxiliar para notificar fila de espera
  const notificarFilaEspera = async (reservaTemporariaId: string) => {
    try {
      // Buscar dados da reserva liberada com relacionamentos
      const { data: reserva } = await supabase
        .from('reservas_temporarias')
        .select(`
          *,
          espaco:espacos_eventos(id, nome, cidade)
        `)
        .eq('id', reservaTemporariaId)
        .single();

      if (!reserva) return;

      // Buscar pessoas na fila para este período com dados do vendedor
      const { data: filaEspera } = await supabase
        .from('fila_espera')
        .select(`
          *,
          vendedor:profiles(nome, email)
        `)
        .eq('espaco_evento_id', reserva.espaco_evento_id)
        .eq('data_inicio', reserva.data_inicio)
        .eq('data_fim', reserva.data_fim)
        .eq('hora_inicio', reserva.hora_inicio)
        .eq('hora_fim', reserva.hora_fim)
        .eq('status', 'ativo')
        .order('posicao', { ascending: true });

      if (filaEspera && filaEspera.length > 0) {
        // Preparar notificações para todas as pessoas na fila
        const notificacoesFila = filaEspera.map((pessoa, index) => ({
          nome: pessoa.vendedor?.nome || 'Vendedor',
          email: pessoa.vendedor?.email || '',
          data: format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          hora: `${reserva.hora_inicio} - ${reserva.hora_fim}`,
          espaco: reserva.espaco?.nome,
          motivoLiberacao: 'Reserva temporária foi liberada pelo vendedor',
          linkReserva: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/calendario`,
        })).filter(notif => notif.email); // Filtrar apenas quem tem email

        // Notificar o primeiro da fila sobre a liberação
        if (notificacoesFila.length > 0) {
          await notificarDatasLiberadas([notificacoesFila[0]]);
        }

        // Marcar o primeiro da fila como notificado
        const primeiro = filaEspera[0];
        await supabase
          .from('fila_espera')
          .update({ 
            status: 'notificado',
            updated_at: new Date().toISOString()
          })
          .eq('id', primeiro.id);

        toast.success(`Vaga disponível! ${primeiro.vendedor?.nome} foi notificado.`);
      }
    } catch (err) {
      console.error('Erro ao notificar fila de espera:', err);
    }
  };

  // Buscar todas as reservas temporárias (admin)
  const fetchTodasReservas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reservas_temporarias')
        .select(`
          *,
          vendedor:profiles(nome, email),
          espaco:espacos_eventos(id, nome, cidade),
          cliente:clientes(id, nome, email, telefone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar todas as reservas temporárias:', err);
      return [];
    }
  }, [supabase]);

  return {
    reservasTemporarias,
    loading,
    error,
    fetchReservasUsuario,
    criarReservaTemporaria,
    converterParaProposta,
    liberarReserva,
    verificarExpiracao,
    listarReservasUsuario,
    fetchTodasReservas
  };
}