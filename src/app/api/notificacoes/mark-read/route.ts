import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notificationService } from '@/lib/notification-service';
import { z } from 'zod';

const markReadSchema = z.object({
  notificacao_ids: z.array(z.string().uuid()).optional(),
  todas: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = markReadSchema.parse(body);

    let success = false;
    let message = '';

    if (validatedData.todas) {
      // Marcar todas as notificações como lidas
      success = await notificationService.marcarTodasComoLidas(user.id);
      message = success ? 'Todas as notificações foram marcadas como lidas' : 'Falha ao marcar todas como lidas';
    } else if (validatedData.notificacao_ids && validatedData.notificacao_ids.length > 0) {
      // Marcar notificações específicas como lidas
      let successCount = 0;
      
      for (const notificacaoId of validatedData.notificacao_ids) {
        // Verificar se a notificação pertence ao usuário
        const { data: notificacao } = await supabase
          .from('notificacoes')
          .select('usuario_id')
          .eq('id', notificacaoId)
          .single();

        if (notificacao && notificacao.usuario_id === user.id) {
          const result = await notificationService.marcarComoLida(notificacaoId);
          if (result) successCount++;
        }
      }

      success = successCount > 0;
      message = `${successCount} de ${validatedData.notificacao_ids.length} notificações marcadas como lidas`;
    } else {
      return NextResponse.json(
        { error: 'É necessário especificar notificações ou marcar todas' },
        { status: 400 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);

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