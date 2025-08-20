import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/services/email-service';
import { z } from 'zod';

// Schema para validar envio em lote
const batchNotificationSchema = z.object({
  emails: z.array(z.object({
    tipo: z.enum(['confirmacao', 'proposta', 'expirando', 'fila', 'disponivel']),
    data: z.record(z.any()), // Aceita qualquer objeto como dados
  })).min(1).max(50), // Limite de 50 emails por lote para evitar sobrecarga
});

// Schema específico para processamento automático de expiração
const processarExpiracoesSchema = z.object({
  reservas: z.array(z.object({
    id: z.string(),
    nome: z.string(),
    email: z.string().email(),
    numeroReserva: z.string(),
    data: z.string(),
    hora: z.string(),
    espaco: z.string().optional(),
    tempoRestante: z.string(),
    tipo: z.enum(['24h', '12h', '2h']),
  })).min(1).max(100),
});

// Schema para processar atualizações de fila
const processarFilaSchema = z.object({
  atualizacoes: z.array(z.object({
    nome: z.string(),
    email: z.string().email(),
    data: z.string(),
    hora: z.string(),
    espaco: z.string().optional(),
    posicaoFila: z.number(),
    totalFila: z.number(),
    status: z.enum(['subiu', 'liberado']),
  })).min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    let result;

    switch (action) {
      case 'expiracoes':
        result = await processarExpiracoes(body);
        break;
      
      case 'fila':
        result = await processarAtualizacoesFila(body);
        break;
      
      default:
        result = await processarLoteGenerico(body);
        break;
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Erro ao processar lote de notificações:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

async function processarLoteGenerico(body: any) {
  const validatedData = batchNotificationSchema.parse(body);
  
  const emailIds = await EmailService.enviarEmLote(validatedData.emails);
  
  return {
    emailIds,
    totalEnviados: emailIds.length,
    message: `${emailIds.length} emails adicionados à fila de envio`
  };
}

async function processarExpiracoes(body: any) {
  const validatedData = processarExpiracoesSchema.parse(body);
  
  const emails = validatedData.reservas.map(reserva => ({
    tipo: 'expirando' as const,
    data: reserva,
  }));

  const emailIds = await EmailService.enviarEmLote(emails);
  
  // Log para auditoria
  console.log(`Processadas ${emailIds.length} notificações de expiração:`, {
    tipos: validatedData.reservas.reduce((acc, r) => {
      acc[r.tipo] = (acc[r.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    timestamp: new Date().toISOString(),
  });

  return {
    emailIds,
    totalEnviados: emailIds.length,
    tiposProcessados: validatedData.reservas.reduce((acc, r) => {
      acc[r.tipo] = (acc[r.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    message: `${emailIds.length} notificações de expiração processadas`
  };
}

async function processarAtualizacoesFila(body: any) {
  const validatedData = processarFilaSchema.parse(body);
  
  const emails = validatedData.atualizacoes.map(atualizacao => ({
    tipo: 'fila' as const,
    data: atualizacao,
  }));

  const emailIds = await EmailService.enviarEmLote(emails);
  
  // Estatísticas das atualizações
  const stats = validatedData.atualizacoes.reduce((acc, atualização) => {
    acc[atualização.status] = (acc[atualização.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Log para auditoria
  console.log(`Processadas ${emailIds.length} atualizações de fila:`, {
    stats,
    timestamp: new Date().toISOString(),
  });

  return {
    emailIds,
    totalEnviados: emailIds.length,
    estatisticas: stats,
    message: `${emailIds.length} atualizações de fila processadas`
  };
}

// Endpoint específico para processamento automatizado (cron jobs)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const job = url.searchParams.get('job');
    const authToken = request.headers.get('authorization');

    // Verificar autorização para jobs automáticos
    if (authToken !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    let result;

    switch (job) {
      case 'verificar-expiracoes':
        result = await verificarReservasExpirando();
        break;
      
      case 'processar-fila':
        result = await processarFilaEspera();
        break;
      
      case 'relatorio-diario':
        result = await gerarRelatorioDiario();
        break;
      
      default:
        return NextResponse.json(
          { error: 'Job não encontrado' },
          { status: 404 }
        );
    }

    return NextResponse.json({
      success: true,
      job,
      ...result
    });

  } catch (error) {
    console.error(`Erro no job automatizado:`, error);
    
    return NextResponse.json(
      { 
        error: 'Erro no processamento automatizado',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Funções para jobs automatizados (implementar conforme necessário)
async function verificarReservasExpirando() {
  // TODO: Implementar lógica para buscar reservas que estão expirando
  // Esta função seria chamada por um cron job a cada hora
  
  return {
    message: 'Verificação de expirações executada',
    timestamp: new Date().toISOString()
  };
}

async function processarFilaEspera() {
  // TODO: Implementar lógica para processar fila de espera
  // Esta função seria chamada quando uma reserva é cancelada
  
  return {
    message: 'Processamento de fila executado',
    timestamp: new Date().toISOString()
  };
}

async function gerarRelatorioDiario() {
  // TODO: Implementar geração de relatório diário
  // Esta função seria chamada uma vez por dia
  
  return {
    message: 'Relatório diário gerado',
    timestamp: new Date().toISOString()
  };
}