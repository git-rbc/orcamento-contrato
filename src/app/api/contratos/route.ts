import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      cliente_id,
      template_id,
      numero_contrato,
      data_contratacao,
      data_evento,
      local_evento,
      tipo_evento,
      numero_convidados,
      servicos,
      cod_reuniao,
      conteudo,
      pdf_url,
      status = 'rascunho'
    } = body;

    // Validar dados obrigatórios
    if (!cliente_id || !numero_contrato || !conteudo) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: cliente_id, numero_contrato, conteudo' 
      }, { status: 400 });
    }

    // Inserir contrato no banco
    const { data, error } = await supabase
      .from('contratos')
      .insert([
        {
          cliente_id,
          numero_contrato,
          data_evento,
          local_evento,
          tipo_evento,
          numero_participantes: numero_convidados,
          status,
          vendedor_id: session.user.id,
          observacoes: `Template: ${template_id}\nServiços: ${servicos}\nCod Reunião: ${cod_reuniao}\nConteúdo: ${conteudo}`,
          arquivo_pdf: pdf_url,
          data_criacao: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir contrato:', error);
      return NextResponse.json({ error: 'Erro ao salvar contrato' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Contrato salvo com sucesso!' 
    });

  } catch (error) {
    console.error('Erro na API de contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cliente_id = searchParams.get('cliente_id');

    let query = supabase
      .from('contratos')
      .select(`
        *,
        cliente:clientes(nome, cpf_cnpj)
      `)
      .eq('vendedor_id', session.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (cliente_id) {
      query = query.eq('cliente_id', cliente_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar contratos:', error);
      return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro na API de contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}