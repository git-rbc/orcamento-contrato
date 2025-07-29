import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface RespostaRequest {
  aprovada: boolean;
}

// POST /api/proposta/publica/[token]/resposta - Processar aprovação/rejeição do cliente
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    const body: RespostaRequest = await request.json();
    const { aprovada } = body;

    if (typeof aprovada !== 'boolean') {
      return NextResponse.json({ error: 'Resposta deve ser true ou false' }, { status: 400 });
    }

    // Buscar proposta pelo token público
    const { data: proposta, error: fetchError } = await supabase
      .from('propostas')
      .select('id, status, cliente_id, clientes!inner(nome, email)')
      .eq('token_publico', token)
      .single();

    if (fetchError || !proposta) {
      console.error('Proposta não encontrada:', fetchError);
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Verificar se a proposta está no status adequado para resposta
    if (proposta.status !== 'enviada') {
      return NextResponse.json({ 
        error: 'Esta proposta não pode mais receber respostas' 
      }, { status: 400 });
    }

    // Atualizar status da proposta
    const novoStatus = aprovada ? 'aceita' : 'recusada';
    const { data: propostaAtualizada, error: updateError } = await supabase
      .from('propostas')
      .update({ 
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposta.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar proposta:', updateError);
      return NextResponse.json({ error: 'Erro ao processar resposta' }, { status: 500 });
    }

    // Log da resposta (pode ser usado para auditoria)
    console.log(`Proposta ${proposta.id} ${aprovada ? 'aprovada' : 'recusada'} pelo cliente ${(proposta as any).clientes?.nome} (${(proposta as any).clientes?.email})`);

    return NextResponse.json({ 
      success: true, 
      data: {
        status: novoStatus,
        aprovada,
        mensagem: aprovada 
          ? 'Proposta aprovada com sucesso! Entraremos em contato em breve.'
          : 'Resposta registrada. Obrigado pelo retorno!'
      }
    });

  } catch (error) {
    console.error('Erro na API de resposta pública:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}