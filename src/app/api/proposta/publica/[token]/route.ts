import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/proposta/publica/[token] - Buscar proposta pelo token público
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    // Buscar proposta pelo token público
    const { data: proposta, error } = await supabase
      .from('propostas')
      .select(`
        *,
        cliente:clientes(nome, email, telefone, cpf_cnpj),
        espaco:espacos_eventos(nome, cidade),
        layout:espacos_eventos_layouts(layout)
      `)
      .eq('token_publico', token)
      .single();

    if (error || !proposta) {
      console.error('Proposta não encontrada:', error);
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Verificar se a proposta foi enviada (só propostas enviadas podem ser visualizadas publicamente)
    if (proposta.status === 'rascunho') {
      return NextResponse.json({ error: 'Esta proposta ainda não foi enviada' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: proposta
    });

  } catch (error) {
    console.error('Erro na API pública de proposta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}