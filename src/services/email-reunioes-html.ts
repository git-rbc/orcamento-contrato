import { resend, EMAIL_CONFIG } from '@/lib/resend';

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

class EmailReunioesHTMLService {
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

  private formatarData(dataStr: string): string {
    const dataObj = new Date(dataStr + 'T00:00:00');
    return dataObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatarHora(horaStr: string): string {
    return horaStr.substring(0, 5);
  }

  private gerarUrlConfirmacao(reuniaoId: string, tipo: 'cliente' | 'vendedor' = 'cliente'): string {
    return `${this.config.baseUrl}/reuniao/confirmar/${reuniaoId}?tipo=${tipo}`;
  }

  private gerarUrlReagendamento(reuniaoId: string): string {
    return `${this.config.baseUrl}/reuniao/reagendar/${reuniaoId}`;
  }

  private gerarTemplateReuniaoAgendada(dados: ReuniaoEmailData): string {
    const confirmationUrl = this.gerarUrlConfirmacao(dados.id);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reunião Agendada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background-color: #3B82F6; padding: 30px 20px; text-align: center;">
              ${this.config.logoUrl ? `<img src="${this.config.logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 20px;" />` : ''}
              <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: bold;">
                Reunião Agendada
              </h1>
              <p style="color: #E5F3FF; margin: 10px 0 0 0; font-size: 16px;">
                Sua reunião foi confirmada com sucesso
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-bottom: 25px;">
                Olá <strong>${dados.clienteNome}</strong>,
              </p>

              <p style="font-size: 16px; margin-bottom: 30px;">
                Confirmamos o agendamento da sua reunião. Abaixo estão os detalhes:
              </p>

              <!-- Meeting Details Card -->
              <div style="background-color: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <h2 style="color: #1E40AF; margin: 0 0 20px 0; font-size: 20px; font-weight: bold; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">
                  Detalhes da Reunião
                </h2>

                <div style="margin-bottom: 15px;">
                  <span style="color: #6B7280; font-weight: bold; display: inline-block; min-width: 120px;">Tipo:</span>
                  <span style="color: #1F2937; font-size: 16px;">${dados.tipoReuniao}</span>
                </div>

                <div style="margin-bottom: 15px;">
                  <span style="color: #6B7280; font-weight: bold; display: inline-block; min-width: 120px;">Data:</span>
                  <span style="color: #1F2937; font-size: 16px;">${this.formatarData(dados.data)}</span>
                </div>

                <div style="margin-bottom: 15px;">
                  <span style="color: #6B7280; font-weight: bold; display: inline-block; min-width: 120px;">Horário:</span>
                  <span style="color: #1F2937; font-size: 16px;">${this.formatarHora(dados.horaInicio)} às ${this.formatarHora(dados.horaFim)}</span>
                </div>

                <div style="margin-bottom: 15px;">
                  <span style="color: #6B7280; font-weight: bold; display: inline-block; min-width: 120px;">Vendedor:</span>
                  <span style="color: #1F2937; font-size: 16px;">${dados.vendedorNome}</span>
                </div>

                ${dados.espacoNome ? `
                  <div style="margin-bottom: 15px;">
                    <span style="color: #6B7280; font-weight: bold; display: inline-block; min-width: 120px;">Local:</span>
                    <span style="color: #1F2937; font-size: 16px;">${dados.espacoNome}</span>
                  </div>
                ` : ''}

                ${dados.linkReuniao ? `
                  <div style="margin-bottom: 15px;">
                    <span style="color: #6B7280; font-weight: bold; display: inline-block; min-width: 120px;">Link:</span>
                    <a href="${dados.linkReuniao}" style="color: #3B82F6; text-decoration: none; font-size: 16px;">Acessar reunião online</a>
                  </div>
                ` : ''}
              </div>

              ${dados.observacoes ? `
                <div style="background-color: #FEF7CD; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                  <h3 style="color: #92400E; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Observações:</h3>
                  <p style="color: #92400E; margin: 0; font-size: 14px;">${dados.observacoes}</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${confirmationUrl}" style="background-color: #10B981; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Confirmar Presença
                </a>
              </div>

              <div style="background-color: #F1F5F9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Importante:</h3>
                <ul style="color: #64748B; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li>Chegue 5 minutos antes do horário agendado</li>
                  <li>Traga documento de identidade</li>
                  <li>Em caso de impedimento, reagende com antecedência</li>
                  <li>Para cancelar ou reagendar, entre em contato conosco</li>
                </ul>
              </div>

              <p style="font-size: 16px; margin-top: 30px;">
                Estamos ansiosos para atendê-lo!
              </p>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                Atenciosamente,<br />
                Equipe de Vendas
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #6B7280; font-size: 12px; margin: 0;">
                Este é um e-mail automático, não responda a esta mensagem.<br />
                Em caso de dúvidas, entre em contato através dos nossos canais oficiais.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private gerarTemplateLembrete(dados: ReuniaoEmailData, horasAntecedencia: number): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Lembrete - Reunião</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background-color: #F59E0B; padding: 30px 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: bold;">
                Lembrete de Reunião
              </h1>
              <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">
                Sua reunião acontece em ${horasAntecedencia === 24 ? '24 horas' : horasAntecedencia === 1 ? '1 hora' : `${horasAntecedencia} horas`}
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-bottom: 25px;">
                Olá <strong>${dados.clienteNome}</strong>,
              </p>

              <p style="font-size: 16px; margin-bottom: 30px;">
                Este é um lembrete da sua reunião agendada:
              </p>

              <!-- Meeting Details -->
              <div style="background-color: #FEF7CD; border: 2px solid #F59E0B; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <h2 style="color: #92400E; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">
                  Detalhes da Reunião
                </h2>

                <div style="margin-bottom: 15px;">
                  <span style="color: #78350F; font-weight: bold; display: inline-block; min-width: 120px;">Tipo:</span>
                  <span style="color: #1F2937; font-size: 16px;">${dados.tipoReuniao}</span>
                </div>

                <div style="margin-bottom: 15px;">
                  <span style="color: #78350F; font-weight: bold; display: inline-block; min-width: 120px;">Data:</span>
                  <span style="color: #1F2937; font-size: 16px;">${this.formatarData(dados.data)}</span>
                </div>

                <div style="margin-bottom: 15px;">
                  <span style="color: #78350F; font-weight: bold; display: inline-block; min-width: 120px;">Horário:</span>
                  <span style="color: #1F2937; font-size: 16px;">${this.formatarHora(dados.horaInicio)} às ${this.formatarHora(dados.horaFim)}</span>
                </div>

                ${dados.espacoNome ? `
                  <div style="margin-bottom: 15px;">
                    <span style="color: #78350F; font-weight: bold; display: inline-block; min-width: 120px;">Local:</span>
                    <span style="color: #1F2937; font-size: 16px;">${dados.espacoNome}</span>
                  </div>
                ` : ''}

                ${dados.linkReuniao ? `
                  <div style="margin-bottom: 15px;">
                    <span style="color: #78350F; font-weight: bold; display: inline-block; min-width: 120px;">Link:</span>
                    <a href="${dados.linkReuniao}" style="color: #F59E0B; text-decoration: none; font-size: 16px;">Acessar reunião online</a>
                  </div>
                ` : ''}
              </div>

              <p style="font-size: 16px; margin-top: 30px;">
                Não se esqueça da sua reunião!
              </p>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                Atenciosamente,<br />
                Equipe de Vendas
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async enviarReuniaoAgendada(dadosReuniao: ReuniaoEmailData): Promise<boolean> {
    try {
      const htmlContent = this.gerarTemplateReuniaoAgendada(dadosReuniao);

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

  async enviarLembreteReuniao(dadosReuniao: ReuniaoEmailData, horasAntecedencia: number = 24): Promise<boolean> {
    try {
      const htmlContent = this.gerarTemplateLembrete(dadosReuniao, horasAntecedencia);

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

  async notificarVendedor(dadosReuniao: ReuniaoEmailData, tipoNotificacao: 'agendada' | 'cancelada' | 'reagendada'): Promise<boolean> {
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
            <li><strong>Data:</strong> ${this.formatarData(dadosReuniao.data)}</li>
            <li><strong>Horário:</strong> ${this.formatarHora(dadosReuniao.horaInicio)} às ${this.formatarHora(dadosReuniao.horaFim)}</li>
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
}

// Instância singleton do serviço
export const emailReunioesHTMLService = new EmailReunioesHTMLService();

// Função helper para facilitar o uso
export async function enviarEmailReuniaoHTML(
  tipo: 'agendada' | 'lembrete' | 'cancelada' | 'reagendada',
  dadosReuniao: ReuniaoEmailData,
  opcoes?: { horasAntecedencia?: number; notificarVendedor?: boolean }
): Promise<boolean> {
  let sucesso = false;

  switch (tipo) {
    case 'agendada':
      sucesso = await emailReunioesHTMLService.enviarReuniaoAgendada(dadosReuniao);
      if (sucesso && opcoes?.notificarVendedor) {
        await emailReunioesHTMLService.notificarVendedor(dadosReuniao, 'agendada');
      }
      break;
    case 'lembrete':
      sucesso = await emailReunioesHTMLService.enviarLembreteReuniao(
        dadosReuniao, 
        opcoes?.horasAntecedencia || 24
      );
      break;
    case 'cancelada':
      // Implementar template de cancelamento se necessário
      if (sucesso && opcoes?.notificarVendedor) {
        await emailReunioesHTMLService.notificarVendedor(dadosReuniao, 'cancelada');
      }
      break;
    case 'reagendada':
      // Implementar template de reagendamento se necessário
      if (sucesso && opcoes?.notificarVendedor) {
        await emailReunioesHTMLService.notificarVendedor(dadosReuniao, 'reagendada');
      }
      break;
  }

  return sucesso;
}