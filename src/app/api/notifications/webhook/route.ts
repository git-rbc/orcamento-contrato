import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema para webhook do Resend
const resendWebhookSchema = z.object({
  type: z.enum([
    'email.sent',
    'email.delivered',
    'email.delivery_delayed',
    'email.complained',
    'email.bounced',
    'email.opened',
    'email.clicked'
  ]),
  created_at: z.string(),
  data: z.object({
    created_at: z.string(),
    email_id: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
  }),
});

// Schema para logs internos
const webhookLogSchema = z.object({
  emailId: z.string(),
  event: z.string(),
  timestamp: z.string(),
  details: z.record(z.any()).optional(),
});

// Interface para armazenar logs de email (em produção, usar banco de dados)
interface EmailLog {
  emailId: string;
  events: Array<{
    type: string;
    timestamp: string;
    details?: any;
  }>;
  status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked';
  lastUpdated: string;
}

// Storage em memória para desenvolvimento (substituir por banco de dados)
const emailLogs = new Map<string, EmailLog>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar se é webhook do Resend
    const signature = request.headers.get('resend-signature');
    if (signature && body.type) {
      return await processarWebhookResend(body, signature);
    }
    
    // Webhook interno para logging
    return await processarWebhookInterno(body);

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar webhook',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

async function processarWebhookResend(body: any, signature: string) {
  try {
    // Verificar assinatura do webhook (implementar validação real)
    if (!verificarAssinaturaResend(body, signature)) {
      return NextResponse.json(
        { error: 'Assinatura inválida' },
        { status: 401 }
      );
    }

    const webhookData = resendWebhookSchema.parse(body);
    const emailId = webhookData.data.email_id;

    // Atualizar log do email
    let emailLog = emailLogs.get(emailId) || {
      emailId,
      events: [],
      status: 'sent',
      lastUpdated: new Date().toISOString(),
    };

    // Adicionar evento
    emailLog.events.push({
      type: webhookData.type,
      timestamp: webhookData.created_at,
      details: webhookData.data,
    });

    // Atualizar status baseado no evento
    switch (webhookData.type) {
      case 'email.delivered':
        emailLog.status = 'delivered';
        break;
      case 'email.bounced':
        emailLog.status = 'bounced';
        break;
      case 'email.complained':
        emailLog.status = 'complained';
        break;
      case 'email.opened':
        if (emailLog.status === 'delivered') {
          emailLog.status = 'opened';
        }
        break;
      case 'email.clicked':
        emailLog.status = 'clicked';
        break;
    }

    emailLog.lastUpdated = new Date().toISOString();
    emailLogs.set(emailId, emailLog);

    // Log para auditoria
    console.log(`Webhook Resend processado:`, {
      emailId,
      type: webhookData.type,
      status: emailLog.status,
      timestamp: webhookData.created_at,
    });

    // Processar ações baseadas no evento
    await processarAcoesPorEvento(webhookData.type, emailId, webhookData.data);

    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso',
      emailId,
      event: webhookData.type,
    });

  } catch (error) {
    console.error('Erro ao processar webhook do Resend:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados do webhook inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

async function processarWebhookInterno(body: any) {
  const webhookData = webhookLogSchema.parse(body);
  
  // Processar log interno
  let emailLog = emailLogs.get(webhookData.emailId) || {
    emailId: webhookData.emailId,
    events: [],
    status: 'sent',
    lastUpdated: new Date().toISOString(),
  };

  emailLog.events.push({
    type: webhookData.event,
    timestamp: webhookData.timestamp,
    details: webhookData.details,
  });

  emailLog.lastUpdated = new Date().toISOString();
  emailLogs.set(webhookData.emailId, emailLog);

  return NextResponse.json({
    success: true,
    message: 'Log interno registrado',
    emailId: webhookData.emailId,
  });
}

async function processarAcoesPorEvento(tipo: string, emailId: string, dados: any) {
  switch (tipo) {
    case 'email.bounced':
      // Marcar email como inválido, remover da lista de envio futuros
      await marcarEmailInvalido(dados.to[0], 'bounced');
      break;
      
    case 'email.complained':
      // Marcar como spam, adicionar à lista de supressão
      await marcarEmailInvalido(dados.to[0], 'complained');
      break;
      
    case 'email.opened':
      // Registrar engajamento do usuário
      await registrarEngajamento(emailId, 'opened');
      break;
      
    case 'email.clicked':
      // Registrar click, maior engajamento
      await registrarEngajamento(emailId, 'clicked');
      break;
      
    default:
      // Log geral para outros eventos
      console.log(`Evento ${tipo} processado para email ${emailId}`);
  }
}

async function marcarEmailInvalido(email: string, motivo: string) {
  // TODO: Implementar lógica para marcar email como inválido
  console.log(`Email ${email} marcado como inválido: ${motivo}`);
}

async function registrarEngajamento(emailId: string, tipo: string) {
  // TODO: Implementar registro de engajamento para métricas
  console.log(`Engajamento registrado: ${tipo} para email ${emailId}`);
}

function verificarAssinaturaResend(body: any, signature: string): boolean {
  // TODO: Implementar verificação real da assinatura do Resend
  // Por enquanto, aceitar qualquer assinatura se existir
  return !!signature && !!process.env.RESEND_WEBHOOK_SECRET;
}

// Endpoint para consultar logs de email
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const emailId = url.searchParams.get('emailId');
    const email = url.searchParams.get('email');
    
    if (emailId) {
      const log = emailLogs.get(emailId);
      if (!log) {
        return NextResponse.json(
          { error: 'Log não encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        log,
      });
    }
    
    if (email) {
      // Buscar todos os logs para um email específico
      const logsDoEmail = Array.from(emailLogs.values()).filter(log =>
        log.events.some(event => 
          event.details?.to?.includes(email)
        )
      );
      
      return NextResponse.json({
        success: true,
        logs: logsDoEmail,
        total: logsDoEmail.length,
      });
    }
    
    // Retornar estatísticas gerais
    const stats = Array.from(emailLogs.values()).reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalEmails: emailLogs.size,
        statusDistribution: stats,
      },
    });

  } catch (error) {
    console.error('Erro ao consultar logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao consultar logs',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}