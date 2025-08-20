import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notificationService } from '@/lib/notification-service';
import { z } from 'zod';

// Schema para validação de criação de notificação
const createNotificacaoSchema = z.object({
  usuario_id: z.string().uuid(),
  tipo: z.string().min(1).max(50),
  titulo: z.string().min(1).max(255),
  mensagem: z.string().min(1),
  dados: z.record(z.any()).optional(),
  expires_at: z.string().datetime().optional()
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const apenasNaoLidas = searchParams.get('nao_lidas') === 'true';

    let notificacoes;
    
    if (apenasNaoLidas) {
      // Buscar apenas não lidas para contagem
      const count = await notificationService.contarNaoLidas(user.id);
      return NextResponse.json({
        success: true,
        count,
        data: []
      });
    } else {
      // Buscar notificações paginadas
      notificacoes = await notificationService.buscarNotificacoes(
        user.id, 
        limit, 
        offset
      );
    }

    return NextResponse.json({
      success: true,
      data: notificacoes,
      pagination: {
        limit,
        offset,
        total: notificacoes.length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

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
    
    // Validar dados de entrada
    const validatedData = createNotificacaoSchema.parse(body);
    
    // Verificar se usuário pode criar notificação para este destinatário
    // Por enquanto, apenas admins podem criar notificações para outros usuários
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';
    
    if (!isAdmin && validatedData.usuario_id !== user.id) {
      return NextResponse.json(
        { error: 'Não autorizado a criar notificações para outros usuários' },
        { status: 403 }
      );
    }

    // Verificar se o usuário deve receber este tipo de notificação
    const deveReceber = await notificationService.deveReceberNotificacao(
      validatedData.usuario_id,
      validatedData.tipo
    );

    if (!deveReceber) {
      return NextResponse.json({
        success: true,
        message: 'Notificação não enviada devido às preferências do usuário',
        notificacao_id: null
      });
    }

    // Criar notificação
    const notificacaoId = await notificationService.criarNotificacao(validatedData);

    if (!notificacaoId) {
      return NextResponse.json(
        { error: 'Falha ao criar notificação' },
        { status: 500 }
      );
    }

    // Registrar log
    await notificationService.registrarLog({
      usuario_id: validatedData.usuario_id,
      tipo_envio: 'in_app',
      tipo_notificacao: validatedData.tipo,
      status: 'enviado',
      dados: { created_by: user.id }
    });

    return NextResponse.json({
      success: true,
      notificacao_id: notificacaoId,
      message: 'Notificação criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);

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