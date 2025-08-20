import { Resend } from 'resend';

let resendInstance: Resend | null = null;

export const resend = {
  get instance() {
    if (!resendInstance) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
      }
      resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
  },
  
  emails: {
    send: (params: any) => {
      return resend.instance.emails.send(params);
    }
  }
};

// Configurações padrão para emails
export const EMAIL_CONFIG = {
  FROM: 'Gestão de Contratos <noreply@gestaocontratos.com>',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@gestaocontratos.com',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
  RATE_LIMIT: {
    MAX_EMAILS_PER_MINUTE: 10,
    MAX_EMAILS_PER_HOUR: 100,
  },
};

// Tipos para templates de email
export interface EmailTemplate {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
}

// Helper para criar template base
export interface EmailTemplateData {
  nome: string;
  email: string;
  data: string;
  hora: string;
  espaco?: string;
  observacoes?: string;
  numeroReserva?: string;
  posicaoFila?: number;
  totalFila?: number;
  linkProposta?: string;
  tempoExpiracao?: string;
}

// Status de envio de emails
export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRY = 'retry',
}

// Interface para queue de emails
export interface EmailQueueItem {
  id: string;
  template: EmailTemplate;
  attempts: number;
  status: EmailStatus;
  created_at: Date;
  scheduled_for?: Date;
  error?: string;
}