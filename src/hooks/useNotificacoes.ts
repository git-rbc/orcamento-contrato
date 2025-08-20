import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  EmailService, 
  ConfirmacaoInteresseData,
  PropostaGeradaData,
  ReservaExpirandoData,
  PosicaoFilaData,
  DataDisponivelData,
  RelatorioDiarioData,
  AltaDemandaData 
} from '@/services/email-service';

interface NotificacaoStatus {
  loading: boolean;
  success: boolean;
  error: string | null;
  emailId?: string;
}

interface QueueStatus {
  pending: number;
  processing: boolean;
  rateLimiter: {
    emailsThisMinute: number;
    emailsThisHour: number;
    lastMinuteReset: number;
    lastHourReset: number;
  };
}

export function useNotificacoes() {
  const [status, setStatus] = useState<NotificacaoStatus>({
    loading: false,
    success: false,
    error: null,
  });

  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  // Função genérica para enviar notificação
  const enviarNotificacao = useCallback(async <T>(
    serviceFn: (data: T) => Promise<string>,
    data: T,
    successMessage: string,
    errorMessage: string
  ): Promise<string | null> => {
    setStatus({ loading: true, success: false, error: null });

    try {
      const emailId = await serviceFn(data);
      
      setStatus({ 
        loading: false, 
        success: true, 
        error: null, 
        emailId 
      });

      toast.success(successMessage);
      return emailId;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setStatus({ 
        loading: false, 
        success: false, 
        error: errorMsg 
      });

      toast.error(`${errorMessage}: ${errorMsg}`);
      return null;
    }
  }, []);

  // 1. Confirmação de interesse
  const enviarConfirmacaoInteresse = useCallback(async (data: ConfirmacaoInteresseData) => {
    return enviarNotificacao(
      EmailService.enviarConfirmacaoInteresse,
      data,
      'Email de confirmação enviado com sucesso',
      'Erro ao enviar confirmação de interesse'
    );
  }, [enviarNotificacao]);

  // 2. Proposta gerada
  const enviarPropostaGerada = useCallback(async (data: PropostaGeradaData) => {
    return enviarNotificacao(
      EmailService.enviarPropostaGerada,
      data,
      'Email da proposta enviado com sucesso',
      'Erro ao enviar email da proposta'
    );
  }, [enviarNotificacao]);

  // 3. Reserva expirando
  const enviarReservaExpirando = useCallback(async (data: ReservaExpirandoData) => {
    const tipoMessages = {
      '24h': 'Lembrete de 24h enviado',
      '12h': 'Lembrete de 12h enviado', 
      '2h': 'Alerta urgente de 2h enviado'
    };

    return enviarNotificacao(
      EmailService.enviarReservaExpirando,
      data,
      tipoMessages[data.tipo],
      'Erro ao enviar lembrete de expiração'
    );
  }, [enviarNotificacao]);

  // 4. Posição na fila
  const enviarPosicaoFilaAtualizada = useCallback(async (data: PosicaoFilaData) => {
    const statusMessages = {
      subiu: 'Email de atualização da fila enviado',
      liberado: 'Email de liberação da data enviado'
    };

    return enviarNotificacao(
      EmailService.enviarPosicaoFilaAtualizada,
      data,
      statusMessages[data.status],
      'Erro ao enviar atualização da fila'
    );
  }, [enviarNotificacao]);

  // 5. Data disponível
  const enviarDataDisponivel = useCallback(async (data: DataDisponivelData) => {
    return enviarNotificacao(
      EmailService.enviarDataDisponivel,
      data,
      'Email de data disponível enviado',
      'Erro ao enviar notificação de data disponível'
    );
  }, [enviarNotificacao]);

  // 6. Relatório diário (Admin)
  const enviarRelatorioDiario = useCallback(async (data: RelatorioDiarioData) => {
    return enviarNotificacao(
      EmailService.enviarRelatorioDiario,
      data,
      'Relatório diário agendado para envio',
      'Erro ao agendar relatório diário'
    );
  }, [enviarNotificacao]);

  // 7. Alta demanda (Admin)
  const enviarAlertaAltaDemanda = useCallback(async (data: AltaDemandaData) => {
    return enviarNotificacao(
      EmailService.enviarAlertaAltaDemanda,
      data,
      'Alerta de alta demanda enviado',
      'Erro ao enviar alerta de alta demanda'
    );
  }, [enviarNotificacao]);

  // Envio em lote
  const enviarEmLote = useCallback(async (emails: Array<{
    tipo: 'confirmacao' | 'proposta' | 'expirando' | 'fila' | 'disponivel';
    data: any;
  }>) => {
    setStatus({ loading: true, success: false, error: null });

    try {
      const emailIds = await EmailService.enviarEmLote(emails);
      
      setStatus({ 
        loading: false, 
        success: true, 
        error: null 
      });

      toast.success(`${emails.length} emails adicionados à fila de envio`);
      return emailIds;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setStatus({ 
        loading: false, 
        success: false, 
        error: errorMsg 
      });

      toast.error(`Erro ao enviar emails em lote: ${errorMsg}`);
      return [];
    }
  }, []);

  // Obter status da fila
  const obterStatusFila = useCallback(() => {
    try {
      const status = EmailService.getQueueStatus();
      setQueueStatus(status);
      return status;
    } catch (error) {
      console.error('Erro ao obter status da fila:', error);
      return null;
    }
  }, []);

  // Limpar status
  const limparStatus = useCallback(() => {
    setStatus({
      loading: false,
      success: false,
      error: null,
    });
  }, []);

  // Helpers para diferentes cenários de uso
  const notificarNovaReserva = useCallback(async (dadosReserva: {
    nome: string;
    email: string;
    data: string;
    hora: string;
    espaco?: string;
    observacoes?: string;
    numeroReserva: string;
    tempoExpiracao: string;
  }) => {
    return enviarConfirmacaoInteresse(dadosReserva);
  }, [enviarConfirmacaoInteresse]);

  const notificarPropostaPronta = useCallback(async (dadosProposta: {
    nome: string;
    email: string;
    numeroReserva: string;
    linkProposta: string;
    data: string;
    hora: string;
    espaco?: string;
    valorProposta?: string;
    tempoResposta?: string;
  }) => {
    return enviarPropostaGerada(dadosProposta);
  }, [enviarPropostaGerada]);

  const notificarExpiracoes = useCallback(async (reservas: Array<{
    nome: string;
    email: string;
    numeroReserva: string;
    data: string;
    hora: string;
    espaco?: string;
    tempoRestante: string;
    tipo: '24h' | '12h' | '2h';
  }>) => {
    const emails = reservas.map(reserva => ({
      tipo: 'expirando' as const,
      data: reserva,
    }));

    return enviarEmLote(emails);
  }, [enviarEmLote]);

  const notificarFilaAtualizada = useCallback(async (
    filaData: Array<{
      nome: string;
      email: string;
      data: string;
      hora: string;
      espaco?: string;
      posicaoFila: number;
      totalFila: number;
      status: 'subiu' | 'liberado';
    }>
  ) => {
    const emails = filaData.map(item => ({
      tipo: 'fila' as const,
      data: item,
    }));

    return enviarEmLote(emails);
  }, [enviarEmLote]);

  const notificarDatasLiberadas = useCallback(async (
    datasLiberadas: Array<{
      nome: string;
      email: string;
      data: string;
      hora: string;
      espaco?: string;
      motivoLiberacao: string;
      linkReserva?: string;
    }>
  ) => {
    const emails = datasLiberadas.map(item => ({
      tipo: 'disponivel' as const,
      data: item,
    }));

    return enviarEmLote(emails);
  }, [enviarEmLote]);

  // Retry de email falhado
  const reenviarEmail = useCallback(async (
    tipoEmail: 'confirmacao' | 'proposta' | 'expirando' | 'fila' | 'disponivel',
    dadosEmail: any
  ) => {
    switch (tipoEmail) {
      case 'confirmacao':
        return enviarConfirmacaoInteresse(dadosEmail);
      case 'proposta':
        return enviarPropostaGerada(dadosEmail);
      case 'expirando':
        return enviarReservaExpirando(dadosEmail);
      case 'fila':
        return enviarPosicaoFilaAtualizada(dadosEmail);
      case 'disponivel':
        return enviarDataDisponivel(dadosEmail);
      default:
        throw new Error(`Tipo de email não suportado: ${tipoEmail}`);
    }
  }, [
    enviarConfirmacaoInteresse,
    enviarPropostaGerada,
    enviarReservaExpirando,
    enviarPosicaoFilaAtualizada,
    enviarDataDisponivel,
  ]);

  return {
    // Estado
    status,
    queueStatus,

    // Funções individuais
    enviarConfirmacaoInteresse,
    enviarPropostaGerada,
    enviarReservaExpirando,
    enviarPosicaoFilaAtualizada,
    enviarDataDisponivel,
    enviarRelatorioDiario,
    enviarAlertaAltaDemanda,

    // Funções em lote
    enviarEmLote,

    // Helpers específicos
    notificarNovaReserva,
    notificarPropostaPronta,
    notificarExpiracoes,
    notificarFilaAtualizada,
    notificarDatasLiberadas,

    // Utilitários
    obterStatusFila,
    limparStatus,
    reenviarEmail,
  };
}

// Hook específico para administradores
export function useNotificacoesAdmin() {
  const notificacoes = useNotificacoes();

  const gerarRelatorioDiario = useCallback(async (dados: {
    email?: string;
    data: string;
    totalReservas: number;
    reservasExpiradas: number;
    reservasConvertidas: number;
    filaEspera: Array<{
      data: string;
      espaco: string;
      totalFila: number;
    }>;
    alertas: string[];
  }) => {
    const dadosRelatorio: RelatorioDiarioData = {
      email: dados.email || 'admin@gestaocontratos.com',
      ...dados,
    };

    return notificacoes.enviarRelatorioDiario(dadosRelatorio);
  }, [notificacoes]);

  const alertarAltaDemanda = useCallback(async (dados: {
    email?: string;
    data: string;
    espaco: string;
    totalFila: number;
    limiteAlerta?: number;
    reservasUltimas24h: number;
  }) => {
    const dadosAlerta: AltaDemandaData = {
      email: dados.email || 'admin@gestaocontratos.com',
      limiteAlerta: dados.limiteAlerta || 10,
      ...dados,
    };

    return notificacoes.enviarAlertaAltaDemanda(dadosAlerta);
  }, [notificacoes]);

  const monitorarFilas = useCallback(async (filas: Array<{
    data: string;
    espaco: string;
    totalFila: number;
    reservasUltimas24h: number;
  }>) => {
    const alertas: Promise<string | null>[] = [];

    for (const fila of filas) {
      // Alertar se fila muito grande ou muitas reservas recentes
      if (fila.totalFila >= 10 || fila.reservasUltimas24h >= 20) {
        alertas.push(alertarAltaDemanda({
          data: fila.data,
          espaco: fila.espaco,
          totalFila: fila.totalFila,
          reservasUltimas24h: fila.reservasUltimas24h,
        }));
      }
    }

    return Promise.all(alertas);
  }, [alertarAltaDemanda]);

  return {
    ...notificacoes,
    gerarRelatorioDiario,
    alertarAltaDemanda,
    monitorarFilas,
  };
}