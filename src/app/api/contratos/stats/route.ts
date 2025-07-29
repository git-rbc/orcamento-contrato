import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar total de contratos
    const { count, error } = await supabase
      .from('contratos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erro ao buscar estatísticas de contratos:', error);
      return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        total: count || 0 
      } 
    });

  } catch (error) {
    console.error('Erro na API de estatísticas de contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}