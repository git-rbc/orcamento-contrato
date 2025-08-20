import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { resend, EMAIL_CONFIG } from '@/lib/resend';
import { ReuniaoAgendadaTemplate } from '@/lib/email-templates/reuniao-agendada';
import { LembreteReuniaoTemplate } from '@/lib/email-templates/lembrete-reuniao';
import { ReuniaoCanceladaTemplate } from '@/lib/email-templates/reuniao-cancelada';
import { ReuniaoReagendadaTemplate } from '@/lib/email-templates/reuniao-reagendada';

export interface ReuniaoEmailData {
  id: string;
  clienteNome: string;
  clienteEmail: string;
  vendedorNome: string;
  vendedorEmail: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipoReuniao: string;
  espacoNome?: string;
  linkReuniao?: string;
  observacoes?: string;
  // Para reagendamento
  dataAnterior?: string;
  horaInicioAnterior?: string;
  horaFimAnterior?: string;
  motivo?: string;
}

export interface EmailReuniaoConfig {
  logoUrl?: string;
  telefoneContato?: string;
  baseUrl?: string;
  empresaNome?: string;
}

class EmailReunioesService {
  private config: EmailReuniaoConfig;

  constructor(config: EmailReuniaoConfig = {}) {
    this.config = {
      logoUrl: process.env.LOGO_URL,
      telefoneContato: process.env.TELEFONE_CONTATO,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
      empresaNome: process.env.EMPRESA_NOME || 'Gestão de Contratos',
      ...config
    };
  }

  private gerarUrlConfirmacao(reuniaoId: string, tipo: 'cliente' | 'vendedor' = 'cliente'): string {
    return `${this.config.baseUrl}/reuniao/confirmar/${reuniaoId}?tipo=${tipo}`;
  }

  private gerarUrlReagendamento(reuniaoId: string): string {
    return `${this.config.baseUrl}/reuniao/reagendar/${reuniaoId}`;
  }

  async enviarReuniaoAgendada(dadosReuniao: ReuniaoEmailData): Promise<boolean> {
    try {
      const confirmationUrl = this.gerarUrlConfirmacao(dadosReuniao.id);

      const htmlContent = renderToString(
        createElement(ReuniaoAgendadaTemplate, {
          clienteNome: dadosReuniao.clienteNome,
          vendedorNome: dadosReuniao.vendedorNome,
          data: dadosReuniao.data,
          horaInicio: dadosReuniao.horaInicio,
          horaFim: dadosReuniao.horaFim,
          tipoReuniao: dadosReuniao.tipoReuniao,
          espacoNome: dadosReuniao.espacoNome,
          linkReuniao: dadosReuniao.linkReuniao,
          observacoes: dadosReuniao.observacoes,
          logoUrl: this.config.logoUrl,
          confirmationUrl
        })
      );

      const result = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: dadosReuniao.clienteEmail,
        subject: `Reunião Agendada - ${dadosReuniao.tipoReuniao}`,
        html: htmlContent,
        reply_to: dadosReuniao.vendedorEmail
      });

      console.log('Email de reunião agendada enviado:', result);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de reunião agendada:', error);
      return false;
    }
  }

  async enviarLembreteReuniao(
    dadosReuniao: ReuniaoEmailData, 
    horasAntecedencia: number = 24
  ): Promise<boolean> {
    try {
      const htmlContent = renderToString(
        createElement(LembreteReuniaoTemplate, {
          clienteNome: dadosReuniao.clienteNome,
          vendedorNome: dadosReuniao.vendedorNome,
          data: dadosReuniao.data,
          horaInicio: dadosReuniao.horaInicio,
          horaFim: dadosReuniao.horaFim,
          tipoReuniao: dadosReuniao.tipoReuniao,
          espacoNome: dadosReuniao.espacoNome,
          linkReuniao: dadosReuniao.linkReuniao,
          observacoes: dadosReuniao.observacoes,
          logoUrl: this.config.logoUrl,
          horasAntecedencia,
          telefoneContato: this.config.telefoneContato
        })
      );

      const tempoTexto = horasAntecedencia === 24 ? '24 horas' : 
                        horasAntecedencia === 1 ? '1 hora' : 
                        `${horasAntecedencia} horas`;

      const result = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: dadosReuniao.clienteEmail,
        subject: `Lembrete: Reunião em ${tempoTexto} - ${dadosReuniao.tipoReuniao}`,
        html: htmlContent,
        reply_to: dadosReuniao.vendedorEmail
      });

      console.log('Email de lembrete enviado:', result);
      return true;
    } catch (error) {
      console.error('Erro ao enviar lembrete de reunião:', error);
      return false;
    }
  }

  async enviarReuniaoCancelada(dadosReuniao: ReuniaoEmailData): Promise<boolean> {
    try {
      const linkReagendamento = this.gerarUrlReagendamento(dadosReuniao.id);

      const htmlContent = renderToString(
        createElement(ReuniaoCanceladaTemplate, {
          clienteNome: dadosReuniao.clienteNome,
          vendedorNome: dadosReuniao.vendedorNome,
          data: dadosReuniao.data,
          horaInicio: dadosReuniao.horaInicio,
          horaFim: dadosReuniao.horaFim,
          tipoReuniao: dadosReuniao.tipoReuniao,
          espacoNome: dadosReuniao.espacoNome,
          motivo: dadosReuniao.motivo,
          logoUrl: this.config.logoUrl,
          telefoneContato: this.config.telefoneContato,
          linkReagendamento
        })
      );

      const result = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: dadosReuniao.clienteEmail,
        subject: `Reunião Cancelada - ${dadosReuniao.tipoReuniao}`,
        html: htmlContent,
        reply_to: dadosReuniao.vendedorEmail
      });

      console.log('Email de cancelamento enviado:', result);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de cancelamento:', error);
      return false;
    }
  }

  async enviarReuniaoReagendada(dadosReuniao: ReuniaoEmailData): Promise<boolean> {
    try {
      if (!dadosReuniao.dataAnterior || !dadosReuniao.horaInicioAnterior || !dadosReuniao.horaFimAnterior) {
        throw new Error('Dados da reunião anterior são obrigatórios para reagendamento');
      }

      const confirmationUrl = this.gerarUrlConfirmacao(dadosReuniao.id);

      const htmlContent = renderToString(
        createElement(ReuniaoReagendadaTemplate, {
          clienteNome: dadosReuniao.clienteNome,
          vendedorNome: dadosReuniao.vendedorNome,
          dataAnterior: dadosReuniao.dataAnterior,
          horaInicioAnterior: dadosReuniao.horaInicioAnterior,
          horaFimAnterior: dadosReuniao.horaFimAnterior,
          dataNova: dadosReuniao.data,
          horaInicioNova: dadosReuniao.horaInicio,
          horaFimNova: dadosReuniao.horaFim,
          tipoReuniao: dadosReuniao.tipoReuniao,
          espacoNome: dadosReuniao.espacoNome,
          linkReuniao: dadosReuniao.linkReuniao,
          motivo: dadosReuniao.motivo,
          observacoes: dadosReuniao.observacoes,
          logoUrl: this.config.logoUrl,
          confirmationUrl
        })
      );

      const result = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: dadosReuniao.clienteEmail,
        subject: `Reunião Reagendada - ${dadosReuniao.tipoReuniao}`,
        html: htmlContent,
        reply_to: dadosReuniao.vendedorEmail
      });

      console.log('Email de reagendamento enviado:', result);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de reagendamento:', error);
      return false;
    }
  }

  // Método para enviar notificação para o vendedor
  async notificarVendedor(
    dadosReuniao: ReuniaoEmailData,
    tipoNotificacao: 'agendada' | 'cancelada' | 'reagendada'
  ): Promise<boolean> {
    try {
      let subject = '';
      let message = '';

      switch (tipoNotificacao) {
        case 'agendada':
          subject = `Nova Reunião Agendada - ${dadosReuniao.clienteNome}`;
          message = `Uma nova reunião foi agendada com o cliente ${dadosReuniao.clienteNome}`;
          break;
        case 'cancelada':
          subject = `Reunião Cancelada - ${dadosReuniao.clienteNome}`;
          message = `A reunião com o cliente ${dadosReuniao.clienteNome} foi cancelada`;
          break;
        case 'reagendada':
          subject = `Reunião Reagendada - ${dadosReuniao.clienteNome}`;
          message = `A reunião com o cliente ${dadosReuniao.clienteNome} foi reagendada`;
          break;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message} para:</p>
          <ul>
            <li><strong>Data:</strong> ${new Date(dadosReuniao.data).toLocaleDateString('pt-BR')}</li>
            <li><strong>Horário:</strong> ${dadosReuniao.horaInicio} às ${dadosReuniao.horaFim}</li>
            <li><strong>Tipo:</strong> ${dadosReuniao.tipoReuniao}</li>
            <li><strong>Cliente:</strong> ${dadosReuniao.clienteNome} (${dadosReuniao.clienteEmail})</li>
            ${dadosReuniao.espacoNome ? `<li><strong>Local:</strong> ${dadosReuniao.espacoNome}</li>` : ''}
            ${dadosReuniao.linkReuniao ? `<li><strong>Link:</strong> <a href="${dadosReuniao.linkReuniao}">Acessar reunião</a></li>` : ''}
          </ul>
          ${dadosReuniao.observacoes ? `<p><strong>Observações:</strong> ${dadosReuniao.observacoes}</p>` : ''}
        </div>
      `;

      const result = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: dadosReuniao.vendedorEmail,
        subject,
        html: htmlContent
      });

      console.log('Notificação para vendedor enviada:', result);
      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação para vendedor:', error);
      return false;
    }
  }

  // Método para programar lembrete automático
  async programarLembretes(reuniaoId: string, dataReuniao: string): Promise<void> {
    const dataReuniaoObj = new Date(dataReuniao + 'T00:00:00');
    const agora = new Date();
    
    // Lembrete 24 horas antes
    const lembrete24h = new Date(dataReuniaoObj.getTime() - 24 * 60 * 60 * 1000);
    if (lembrete24h > agora) {
      console.log(`Lembrete programado para 24h antes: ${lembrete24h}`);
      // Aqui você pode integrar com um sistema de jobs/cron
      // Por exemplo, usando cron jobs ou um serviço como Vercel Cron
    }

    // Lembrete 2 horas antes
    const lembrete2h = new Date(dataReuniaoObj.getTime() - 2 * 60 * 60 * 1000);
    if (lembrete2h > agora) {
      console.log(`Lembrete programado para 2h antes: ${lembrete2h}`);
    }
  }
}

// Instância singleton do serviço
export const emailReunioesService = new EmailReunioesService();

// Função helper para facilitar o uso
export async function enviarEmailReuniao(
  tipo: 'agendada' | 'lembrete' | 'cancelada' | 'reagendada',
  dadosReuniao: ReuniaoEmailData,
  opcoes?: { horasAntecedencia?: number; notificarVendedor?: boolean }
): Promise<boolean> {
  let sucesso = false;

  switch (tipo) {
    case 'agendada':
      sucesso = await emailReunioesService.enviarReuniaoAgendada(dadosReuniao);
      if (sucesso && opcoes?.notificarVendedor) {
        await emailReunioesService.notificarVendedor(dadosReuniao, 'agendada');
      }
      break;
    case 'lembrete':
      sucesso = await emailReunioesService.enviarLembreteReuniao(
        dadosReuniao, 
        opcoes?.horasAntecedencia || 24
      );
      break;
    case 'cancelada':
      sucesso = await emailReunioesService.enviarReuniaoCancelada(dadosReuniao);
      if (sucesso && opcoes?.notificarVendedor) {
        await emailReunioesService.notificarVendedor(dadosReuniao, 'cancelada');
      }
      break;
    case 'reagendada':
      sucesso = await emailReunioesService.enviarReuniaoReagendada(dadosReuniao);
      if (sucesso && opcoes?.notificarVendedor) {
        await emailReunioesService.notificarVendedor(dadosReuniao, 'reagendada');
      }
      break;
  }

  return sucesso;
}