import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notificationService } from '@/lib/notification-service';
import { z } from 'zod';

const preferenciasSchema = z.object({
  email_reunioes: z.boolean().optional(),
  email_lembretes: z.boolean().optional(),
  email_alteracoes: z.boolean().optional(),
  notif_conflitos: z.boolean().optional(),
  notif_app: z.boolean().optional(),
  horario_relatorio: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional()
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

    const preferencias = await notificationService.buscarPreferencias(user.id);

    if (!preferencias) {
      return NextResponse.json(
        { error: 'Erro ao buscar preferências' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preferencias
    });

  } catch (error) {
    console.error('Erro ao buscar preferências:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const validatedData = preferenciasSchema.parse(body);

    const success = await notificationService.atualizarPreferencias(
      user.id, 
      validatedData
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Falha ao atualizar preferências' },
        { status: 500 }
      );
    }

    // Buscar preferências atualizadas para retornar
    const preferenciasAtualizadas = await notificationService.buscarPreferencias(user.id);

    return NextResponse.json({
      success: true,
      data: preferenciasAtualizadas,
      message: 'Preferências atualizadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);

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