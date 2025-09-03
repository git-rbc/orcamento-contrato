import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Usar admin client para evitar problemas de autenticação durante desenvolvimento
    const supabase = createSupabaseAdminClient();
    
    // Buscar usuários com role 'vendedor'
    const { data: vendedores, error } = await supabase
      .from('users')
      .select('id, nome, email, role')
      .eq('role', 'vendedor')
      .eq('ativo', true)
      .order('nome');
      
    console.log('Query vendedores - dados:', vendedores, 'erro:', error);

    if (error) {
      console.error('Erro ao buscar vendedores:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar vendedores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vendedores: vendedores || []
    });
  } catch (error) {
    console.error('Erro no servidor de vendedores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}