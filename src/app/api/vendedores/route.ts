import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const ativo = searchParams.get('ativo');
    const role = searchParams.get('role');
    const comDisponibilidade = searchParams.get('com_disponibilidade');

    let query = supabase
      .from('users')
      .select('id, nome, email, role, ativo, created_at');

    if (ativo !== null && ativo !== '') {
      query = query.eq('ativo', ativo === 'true');
    }

    if (role && role !== 'todos') {
      query = query.eq('role', role);
    }

    const { data: vendedores, error } = await query.order('nome');

    if (error) {
      console.error('Erro ao buscar vendedores:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar vendedores' },
        { status: 500 }
      );
    }

    // Se solicitado, filtrar apenas vendedores com disponibilidade cadastrada
    if (comDisponibilidade === 'true' && vendedores) {
      const { data: vendedoresComDisponibilidade } = await supabase
        .from('disponibilidade_vendedores')
        .select('vendedor_id')
        .eq('ativo', true);

      const idsComDisponibilidade = new Set(
        vendedoresComDisponibilidade?.map(v => v.vendedor_id) || []
      );

      const vendedoresFiltrados = vendedores.filter(v => 
        idsComDisponibilidade.has(v.id)
      );

      return NextResponse.json({ data: vendedoresFiltrados });
    }

    return NextResponse.json({ data: vendedores });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}