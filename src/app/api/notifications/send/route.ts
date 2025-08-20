import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/services/email-service';
import { z } from 'zod';

// Schemas de validação para cada tipo de notificação
const confirmacaoInteresseSchema = z.object({
  tipo: z.literal('confirmacao'),
  dados: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    data: z.string().min(1),
    hora: z.string().min(1),
    espaco: z.string().optional(),
    observacoes: z.string().optional(),
    numeroReserva: z.string().min(1),
    tempoExpiracao: z.string().min(1),
  }),
});

const propostaGeradaSchema = z.object({
  tipo: z.literal('proposta'),
  dados: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    numeroReserva: z.string().min(1),
    linkProposta: z.string().url(),
    data: z.string().min(1),
    hora: z.string().min(1),
    espaco: z.string().optional(),
    valorProposta: z.string().optional(),
    tempoResposta: z.string().optional(),
  }),
});

const reservaExpirandoSchema = z.object({
  tipo: z.literal('expirando'),
  dados: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    numeroReserva: z.string().min(1),
    data: z.string().min(1),
    hora: z.string().min(1),
    espaco: z.string().optional(),
    tempoRestante: z.string().min(1),
    tipo: z.enum(['24h', '12h', '2h']),
  }),
});

const posicaoFilaSchema = z.object({
  tipo: z.literal('fila'),
  dados: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    data: z.string().min(1),
    hora: z.string().min(1),
    espaco: z.string().optional(),
    posicaoFila: z.number().min(0),
    totalFila: z.number().min(0),
    status: z.enum(['subiu', 'liberado']),
  }),
});

const dataDisponivelSchema = z.object({
  tipo: z.literal('disponivel'),
  dados: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    data: z.string().min(1),
    hora: z.string().min(1),
    espaco: z.string().optional(),
    motivoLiberacao: z.string().min(1),
    linkReserva: z.string().optional(),
  }),
});

const relatorioDiarioSchema = z.object({
  tipo: z.literal('relatorio'),
  dados: z.object({
    email: z.string().email(),
    data: z.string().min(1),
    totalReservas: z.number().min(0),
    reservasExpiradas: z.number().min(0),
    reservasConvertidas: z.number().min(0),
    filaEspera: z.array(z.object({
      data: z.string(),
      espaco: z.string(),
      totalFila: z.number(),
    })),
    alertas: z.array(z.string()),
  }),
});

const altaDemandaSchema = z.object({
  tipo: z.literal('alta-demanda'),
  dados: z.object({
    email: z.string().email(),
    data: z.string().min(1),
    espaco: z.string().min(1),
    totalFila: z.number().min(0),
    limiteAlerta: z.number().min(0),
    reservasUltimas24h: z.number().min(0),
  }),
});

const notificationSchema = z.union([
  confirmacaoInteresseSchema,
  propostaGeradaSchema,
  reservaExpirandoSchema,
  posicaoFilaSchema,
  dataDisponivelSchema,
  relatorioDiarioSchema,
  altaDemandaSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados de entrada
    const validatedData = notificationSchema.parse(body);
    
    let emailId: string;

    // Enviar notificação baseada no tipo
    switch (validatedData.tipo) {
      case 'confirmacao':
        emailId = await EmailService.enviarConfirmacaoInteresse(validatedData.dados);
        break;
      
      case 'proposta':
        emailId = await EmailService.enviarPropostaGerada(validatedData.dados);
        break;
      
      case 'expirando':
        emailId = await EmailService.enviarReservaExpirando(validatedData.dados);
        break;
      
      case 'fila':
        emailId = await EmailService.enviarPosicaoFilaAtualizada(validatedData.dados);
        break;
      
      case 'disponivel':
        emailId = await EmailService.enviarDataDisponivel(validatedData.dados);
        break;
      
      case 'relatorio':
        emailId = await EmailService.enviarRelatorioDiario(validatedData.dados);
        break;
      
      case 'alta-demanda':
        emailId = await EmailService.enviarAlertaAltaDemanda(validatedData.dados);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Tipo de notificação não suportado' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      emailId,
      tipo: validatedData.tipo,
      message: 'Notificação enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);

    // Erro de validação
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Erro geral
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para obter status da queue de emails
export async function GET() {
  try {
    const status = EmailService.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      queueStatus: status
    });

  } catch (error) {
    console.error('Erro ao obter status da queue:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao obter status da queue',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}