import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/espacos-eventos/all - Buscar todos os espaços de eventos ativos
export async function GET(request: NextRequest) {
  try {
    const { data: espacos, error } = await supabaseAdmin
      .from('espacos_eventos')
      .select('id, nome, cidade, ativo')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      return NextResponse.json(
        createErrorResponse('Erro ao buscar espaços de eventos'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(espacos, 'Espaços de eventos listados com sucesso')
    );
  } catch (error) {
    console.error('Erro ao buscar espaços de eventos:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}