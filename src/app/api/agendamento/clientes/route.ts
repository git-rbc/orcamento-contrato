import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Buscar clientes ativos
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar clientes:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar clientes' },
        { status: 500 }
      );
    }

    console.log('Clientes encontrados:', clientes?.length || 0);

    return NextResponse.json({
      clientes: clientes || []
    });
  } catch (error) {
    console.error('Erro no servidor de clientes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}