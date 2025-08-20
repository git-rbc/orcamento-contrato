import { resend, EMAIL_CONFIG, EmailTemplate, EmailStatus, EmailQueueItem } from '@/lib/resend';
import { ConfirmacaoInteresseTemplate, getConfirmacaoInteresseText } from '@/lib/email-templates/confirmacao-interesse';
import { PropostaGeradaTemplate, getPropostaGeradaText } from '@/lib/email-templates/proposta-gerada';
import { ReservaExpirandoTemplate, getReservaExpirandoText } from '@/lib/email-templates/reserva-expirando';
import { PosicaoFilaAtualizadaTemplate, getPosicaoFilaAtualizadaText } from '@/lib/email-templates/posicao-fila-atualizada';
import { DataDisponivelTemplate, getDataDisponivelText } from '@/lib/email-templates/data-disponivel';
import { RelatorioDiarioTemplate, getRelatorioDiarioText } from '@/lib/email-templates/relatorio-diario';
import { AltaDemandaTemplate, getAltaDemandaText } from '@/lib/email-templates/alta-demanda';

// Tipos específicos para cada template
interface ConfirmacaoInteresseData {
  nome: string;
  email: string;
  data: string;
  hora: string;
  espaco?: string;
  observacoes?: string;
  numeroReserva: string;
  tempoExpiracao: string;
}

interface PropostaGeradaData {
  nome: string;
  email: string;
  numeroReserva: string;
  linkProposta: string;
  data: string;
  hora: string;
  espaco?: string;
  valorProposta?: string;
  tempoResposta?: string;
  tempoExpiracao?: string;
}

interface ReservaExpirandoData {
  nome: string;
  email: string;
  numeroReserva: string;
  data: string;
  hora: string;
  espaco?: string;
  tempoRestante: string;
  tipo: '24h' | '12h' | '2h';
  nomeCliente?: string;
  emailCliente?: string;
  linkGerenciar?: string;
}

interface PosicaoFilaData {
  nome: string;
  email: string;
  data: string;
  hora: string;
  espaco?: string;
  posicaoFila: number;
  totalFila: number;
  status: 'subiu' | 'liberado';
  nomeCliente?: string;
  emailCliente?: string;
  posicaoAnterior?: number;
  linkGerenciar?: string;
  observacoesAdicionais?: string;
}

interface DataDisponivelData {
  nome: string;
  email: string;
  data: string;
  hora: string;
  espaco?: string;
  motivoLiberacao: string;
  linkReserva?: string;
  nomeCliente?: string;
  emailCliente?: string;
  telefoneCliente?: string;
  posicaoFila?: number;
  linkCriarReserva?: string;
  tempoLimiteResposta?: string;
  observacoes?: string;
}

interface RelatorioDiarioData {
  email: string;
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
  nomeAdmin?: string;
  dataRelatorio?: string;
  estatisticas?: any;
  topDatas?: any[];
  linkDashboard?: string;
}

interface AltaDemandaData {
  email: string;
  data: string;
  espaco: string;
  totalFila: number;
  limiteAlerta: number;
  reservasUltimas24h: number;
  nomeAdmin?: string;
  datasAlerta?: any[];
  estatisticasGerais?: any;
  recomendacoes?: string[];
  linkGerenciamento?: string;
}

// Queue para emails (em memória para desenvolvimento, implementar Redis/DB em produção)
class EmailQueue {
  private queue: EmailQueueItem[] = [];
  private processing = false;
  private rateLimiter = {
    emailsThisMinute: 0,
    emailsThisHour: 0,
    lastMinuteReset: Date.now(),
    lastHourReset: Date.now(),
  };

  async addToQueue(template: EmailTemplate, scheduledFor?: Date): Promise<string> {
    const id = crypto.randomUUID();
    const item: EmailQueueItem = {
      id,
      template,
      attempts: 0,
      status: EmailStatus.PENDING,
      created_at: new Date(),
      scheduled_for: scheduledFor,
    };

    this.queue.push(item);
    
    // Processar queue se não estiver processando
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        // Resetar contadores se necessário
        this.resetRateLimiterCounters();

        // Verificar rate limit
        if (!this.canSendEmail()) {
          console.log('Rate limit atingido, aguardando...');
          await new Promise(resolve => setTimeout(resolve, 60000)); // Aguardar 1 minuto
          continue;
        }

        const item = this.queue.find(item => 
          item.status === EmailStatus.PENDING && 
          (!item.scheduled_for || item.scheduled_for <= new Date())
        );

        if (!item) break;

        try {
          await this.sendEmail(item);
          item.status = EmailStatus.SENT;
          this.removeFromQueue(item.id);
          
          // Atualizar contadores de rate limit
          this.rateLimiter.emailsThisMinute++;
          this.rateLimiter.emailsThisHour++;

        } catch (error) {
          item.attempts++;
          item.error = error instanceof Error ? error.message : 'Erro desconhecido';

          if (item.attempts >= EMAIL_CONFIG.RETRY_ATTEMPTS) {
            item.status = EmailStatus.FAILED;
            console.error(`Email falhou após ${EMAIL_CONFIG.RETRY_ATTEMPTS} tentativas:`, item.error);
          } else {
            item.status = EmailStatus.RETRY;
            // Agendar retry com delay exponencial
            const delay = EMAIL_CONFIG.RETRY_DELAY * Math.pow(2, item.attempts - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private resetRateLimiterCounters() {
    const now = Date.now();
    
    // Reset contador de minuto
    if (now - this.rateLimiter.lastMinuteReset >= 60000) {
      this.rateLimiter.emailsThisMinute = 0;
      this.rateLimiter.lastMinuteReset = now;
    }

    // Reset contador de hora
    if (now - this.rateLimiter.lastHourReset >= 3600000) {
      this.rateLimiter.emailsThisHour = 0;
      this.rateLimiter.lastHourReset = now;
    }
  }

  private canSendEmail(): boolean {
    return (
      this.rateLimiter.emailsThisMinute < EMAIL_CONFIG.RATE_LIMIT.MAX_EMAILS_PER_MINUTE &&
      this.rateLimiter.emailsThisHour < EMAIL_CONFIG.RATE_LIMIT.MAX_EMAILS_PER_HOUR
    );
  }

  private async sendEmail(item: EmailQueueItem) {
    const response = await resend.emails.send({
      from: EMAIL_CONFIG.FROM,
      ...item.template,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  }

  private removeFromQueue(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
  }

  getQueueStatus() {
    return {
      pending: this.queue.filter(item => item.status === EmailStatus.PENDING).length,
      processing: this.processing,
      rateLimiter: this.rateLimiter,
    };
  }
}

// Instância global da queue
const emailQueue = new EmailQueue();

// Serviço de Email
export class EmailService {
  // 1. Confirmação de interesse na data
  static async enviarConfirmacaoInteresse(data: ConfirmacaoInteresseData): Promise<string> {
    const template: EmailTemplate = {
      to: data.email,
      subject: `Interesse confirmado - Reserva temporária ${data.numeroReserva}`,
      html: ConfirmacaoInteresseTemplate(data),
      text: getConfirmacaoInteresseText(data),
    };

    return emailQueue.addToQueue(template);
  }

  // 2. Proposta gerada
  static async enviarPropostaGerada(data: PropostaGeradaData): Promise<string> {
    const template: EmailTemplate = {
      to: data.email,
      subject: `Proposta pronta - Reserva ${data.numeroReserva}`,
      html: PropostaGeradaTemplate({
        ...data,
        tempoExpiracao: data.tempoExpiracao || '48 horas'
      }),
      text: getPropostaGeradaText({
        ...data,
        tempoExpiracao: data.tempoExpiracao || '48 horas'
      }),
    };

    return emailQueue.addToQueue(template);
  }

  // 3. Reserva expirando (24h/12h)
  static async enviarReservaExpirando(data: ReservaExpirandoData): Promise<string> {
    const subjects = {
      '24h': 'Reserva expira em 24 horas',
      '12h': 'Reserva expira em 12 horas', 
      '2h': 'URGENTE: Reserva expira em 2 horas'
    };

    const template: EmailTemplate = {
      to: data.email,
      subject: `${subjects[data.tipo]} - ${data.numeroReserva}`,
      html: ReservaExpirandoTemplate({
        ...data,
        nomeCliente: data.nomeCliente || data.nome,
        emailCliente: data.emailCliente || data.email,
        linkGerenciar: data.linkGerenciar || '#'
      }),
      text: getReservaExpirandoText({
        ...data,
        nomeCliente: data.nomeCliente || data.nome,
        emailCliente: data.emailCliente || data.email,
        linkGerenciar: data.linkGerenciar || '#'
      }),
    };

    return emailQueue.addToQueue(template);
  }

  // 4. Posição na fila atualizada
  static async enviarPosicaoFilaAtualizada(data: PosicaoFilaData): Promise<string> {
    const subjects = {
      subiu: `Você subiu na fila - Posição ${data.posicaoFila}`,
      liberado: 'Data liberada - Reserve agora!'
    };

    const motivo = data.status === 'subiu' ? 'subiu_na_fila' : 'foi_liberado';
    
    const template: EmailTemplate = {
      to: data.email,
      subject: subjects[data.status],
      html: PosicaoFilaAtualizadaTemplate({
        ...data,
        nomeCliente: data.nomeCliente || 'Cliente',
        emailCliente: data.emailCliente || data.email,
        posicaoAnterior: data.posicaoAnterior || data.posicaoFila + 1,
        posicaoAtual: data.posicaoFila,
        motivo,
        linkGerenciar: data.linkGerenciar || '#',
        observacoesAdicionais: data.observacoesAdicionais
      }),
      text: getPosicaoFilaAtualizadaText({
        ...data,
        nomeCliente: data.nomeCliente || 'Cliente',
        emailCliente: data.emailCliente || data.email,
        posicaoAnterior: data.posicaoAnterior || data.posicaoFila + 1,
        posicaoAtual: data.posicaoFila,
        motivo,
        linkGerenciar: data.linkGerenciar || '#',
        observacoesAdicionais: data.observacoesAdicionais
      }),
    };

    return emailQueue.addToQueue(template);
  }

  // 5. Data ficou disponível
  static async enviarDataDisponivel(data: DataDisponivelData): Promise<string> {
    const template: EmailTemplate = {
      to: data.email,
      subject: `Data disponível: ${data.data} às ${data.hora}`,
      html: DataDisponivelTemplate({
        ...data,
        nomeCliente: data.nomeCliente || 'Cliente',
        emailCliente: data.emailCliente || data.email,
        telefoneCliente: data.telefoneCliente,
        posicaoFila: data.posicaoFila || 1,
        linkCriarReserva: data.linkCriarReserva || data.linkReserva || '#',
        tempoLimiteResposta: data.tempoLimiteResposta || '2 horas',
        observacoes: data.observacoes
      }),
      text: getDataDisponivelText({
        ...data,
        nomeCliente: data.nomeCliente || 'Cliente',
        emailCliente: data.emailCliente || data.email,
        telefoneCliente: data.telefoneCliente,
        posicaoFila: data.posicaoFila || 1,
        linkCriarReserva: data.linkCriarReserva || data.linkReserva || '#',
        tempoLimiteResposta: data.tempoLimiteResposta || '2 horas',
        observacoes: data.observacoes
      }),
    };

    return emailQueue.addToQueue(template);
  }

  // 6. Relatório diário (Admin)
  static async enviarRelatorioDiario(data: RelatorioDiarioData): Promise<string> {
    const template: EmailTemplate = {
      to: data.email,
      subject: `Relatório diário - Reservas temporárias ${data.data}`,
      html: RelatorioDiarioTemplate({
        nomeAdmin: data.nomeAdmin || 'Administrador',
        dataRelatorio: data.dataRelatorio || data.data,
        estatisticas: data.estatisticas || {
          reservasTemporarias: {
            criadas: data.totalReservas,
            expiradas: data.reservasExpiradas,
            convertidas: data.reservasConvertidas,
            ativas: data.totalReservas - data.reservasExpiradas - data.reservasConvertidas
          },
          filaEspera: {
            novasEntradas: 0,
            liberacoes: 0,
            totalPessoas: data.filaEspera.length,
            datasComFila: data.filaEspera.length
          },
          propostas: {
            geradas: data.reservasConvertidas,
            aceitas: 0,
            recusadas: 0,
            pendentes: data.reservasConvertidas
          },
          contratos: {
            assinados: 0,
            valorTotal: 'R$ 0,00'
          }
        },
        alertas: data.alertas.map(alerta => ({
          tipo: 'warning' as const,
          titulo: 'Alerta',
          descricao: alerta,
          acao: undefined
        })),
        topDatas: data.topDatas || data.filaEspera.map(fila => ({
          data: fila.data,
          reservas: 1,
          filaEspera: fila.totalFila
        })),
        linkDashboard: data.linkDashboard || '#'
      }),
      text: getRelatorioDiarioText({
        nomeAdmin: data.nomeAdmin || 'Administrador',
        dataRelatorio: data.dataRelatorio || data.data,
        estatisticas: data.estatisticas || {
          reservasTemporarias: {
            criadas: data.totalReservas,
            expiradas: data.reservasExpiradas,
            convertidas: data.reservasConvertidas,
            ativas: data.totalReservas - data.reservasExpiradas - data.reservasConvertidas
          },
          filaEspera: {
            novasEntradas: 0,
            liberacoes: 0,
            totalPessoas: data.filaEspera.length,
            datasComFila: data.filaEspera.length
          },
          propostas: {
            geradas: data.reservasConvertidas,
            aceitas: 0,
            recusadas: 0,
            pendentes: data.reservasConvertidas
          },
          contratos: {
            assinados: 0,
            valorTotal: 'R$ 0,00'
          }
        },
        alertas: data.alertas.map(alerta => ({
          tipo: 'warning' as const,
          titulo: 'Alerta',
          descricao: alerta,
          acao: undefined
        })),
        topDatas: data.topDatas || data.filaEspera.map(fila => ({
          data: fila.data,
          reservas: 1,
          filaEspera: fila.totalFila
        })),
        linkDashboard: data.linkDashboard || '#'
      }),
    };

    // Agendar para envio às 8h do próximo dia
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    return emailQueue.addToQueue(template, tomorrow);
  }

  // 7. Alerta de alta demanda (Admin)
  static async enviarAlertaAltaDemanda(data: AltaDemandaData): Promise<string> {
    const template: EmailTemplate = {
      to: data.email,
      subject: `⚠️ ALERTA: Alta demanda - ${data.espaco} (${data.totalFila} na fila)`,
      html: AltaDemandaTemplate({
        nomeAdmin: data.nomeAdmin || 'Administrador',
        datasAlerta: data.datasAlerta || [{
          data: data.data,
          hora: '00:00',
          espaco: data.espaco,
          totalFila: data.totalFila,
          ultimasReservas: data.reservasUltimas24h,
          tendencia: 'crescente' as const,
          tempoMedioEspera: '48 horas'
        }],
        estatisticasGerais: data.estatisticasGerais || {
          totalPessoasFilas: data.totalFila,
          datasComFilasLongas: 1,
          crescimentoUltimas24h: 20
        },
        recomendacoes: data.recomendacoes || [
          'Avaliar criação de horários adicionais',
          'Considerar aumentar capacidade do espaço',
          'Monitorar conversão de reservas'
        ],
        linkGerenciamento: data.linkGerenciamento || '#'
      }),
      text: getAltaDemandaText({
        nomeAdmin: data.nomeAdmin || 'Administrador',
        datasAlerta: data.datasAlerta || [{
          data: data.data,
          hora: '00:00',
          espaco: data.espaco,
          totalFila: data.totalFila,
          ultimasReservas: data.reservasUltimas24h,
          tendencia: 'crescente' as const,
          tempoMedioEspera: '48 horas'
        }],
        estatisticasGerais: data.estatisticasGerais || {
          totalPessoasFilas: data.totalFila,
          datasComFilasLongas: 1,
          crescimentoUltimas24h: 20
        },
        recomendacoes: data.recomendacoes || [
          'Avaliar criação de horários adicionais',
          'Considerar aumentar capacidade do espaço',
          'Monitorar conversão de reservas'
        ],
        linkGerenciamento: data.linkGerenciamento || '#'
      }),
      cc: [EMAIL_CONFIG.ADMIN_EMAIL],
    };

    return emailQueue.addToQueue(template);
  }

  // Envio em lote
  static async enviarEmLote(emails: Array<{
    tipo: 'confirmacao' | 'proposta' | 'expirando' | 'fila' | 'disponivel';
    data: any;
  }>): Promise<string[]> {
    const promises = emails.map(email => {
      switch (email.tipo) {
        case 'confirmacao':
          return this.enviarConfirmacaoInteresse(email.data);
        case 'proposta':
          return this.enviarPropostaGerada(email.data);
        case 'expirando':
          return this.enviarReservaExpirando(email.data);
        case 'fila':
          return this.enviarPosicaoFilaAtualizada(email.data);
        case 'disponivel':
          return this.enviarDataDisponivel(email.data);
        default:
          throw new Error(`Tipo de email não suportado: ${email.tipo}`);
      }
    });

    return Promise.all(promises);
  }

  // Status da queue
  static getQueueStatus() {
    return emailQueue.getQueueStatus();
  }

  // Limpar emails falhados da queue
  static clearFailedEmails() {
    // Implementar lógica para limpar emails falhados se necessário
  }
}

// Exportar tipos para uso em outros arquivos
export type {
  ConfirmacaoInteresseData,
  PropostaGeradaData,
  ReservaExpirandoData,
  PosicaoFilaData,
  DataDisponivelData,
  RelatorioDiarioData,
  AltaDemandaData,
};