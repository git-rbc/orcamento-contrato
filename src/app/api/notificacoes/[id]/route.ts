import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notificationService } from '@/lib/notification-service';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: notificacaoId } = await params;
    const body = await request.json();
    const { acao } = body;

    // Verificar se a notificação pertence ao usuário
    const { data: notificacao, error: notifError } = await supabase
      .from('notificacoes')
      .select('usuario_id')
      .eq('id', notificacaoId)
      .single();

    if (notifError || !notificacao) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    if (notificacao.usuario_id !== user.id) {
      return NextResponse.json(
        { error: 'Não autorizado a modificar esta notificação' },
        { status: 403 }
      );
    }

    let success = false;
    let message = '';

    switch (acao) {
      case 'marcar_lida':
        success = await notificationService.marcarComoLida(notificacaoId);
        message = success ? 'Notificação marcada como lida' : 'Falha ao marcar como lida';
        break;

      default:
        return NextResponse.json(
          { error: 'Ação não suportada' },
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
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: notificacaoId } = await params;

    // Verificar se a notificação pertence ao usuário
    const { data: notificacao, error: notifError } = await supabase
      .from('notificacoes')
      .select('usuario_id')
      .eq('id', notificacaoId)
      .single();

    if (notifError || !notificacao) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    if (notificacao.usuario_id !== user.id) {
      return NextResponse.json(
        { error: 'Não autorizado a deletar esta notificação' },
        { status: 403 }
      );
    }

    const success = await notificationService.deletarNotificacao(notificacaoId);

    if (!success) {
      return NextResponse.json(
        { error: 'Falha ao deletar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notificação deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}