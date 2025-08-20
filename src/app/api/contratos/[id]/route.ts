import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { resend } from '@/lib/resend';
import { gerarTokenPublico } from '@/lib/token-utils';
import { gerarTemplateEmailContrato, gerarAssuntoEmailContrato } from '@/lib/email-contrato-templates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        cliente:clientes(*)
      `)
      .eq('id', id)
      .eq('vendedor_id', user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar contrato:', error);
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro na API de contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
      status
    } = body;

    // Atualizar contrato
    const { data, error } = await supabase
      .from('contratos')
      .update({
        cliente_id,
        numero_contrato,
        data_evento,
        local_evento,
        tipo_evento,
        numero_participantes: numero_convidados,
        status,
        observacoes: `Template: ${template_id}\nServiços: ${servicos}\nCod Reunião: ${cod_reuniao}\nConteúdo: ${conteudo}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('vendedor_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar contrato:', error);
      return NextResponse.json({ error: 'Erro ao atualizar contrato' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Contrato atualizado com sucesso!' 
    });

  } catch (error) {
    console.error('Erro na API de contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { acao } = body;

    if (acao === 'enviar') {
      // Buscar contrato com dados do cliente
      const { data: contrato, error: errorContrato } = await supabase
        .from('contratos')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .eq('id', id)
        .eq('vendedor_id', user.id)
        .single();

      if (errorContrato || !contrato) {
        return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
      }

      // Verificar se já tem token público, senão gerar um novo
      let tokenPublico = contrato.token_publico;
      if (!tokenPublico) {
        tokenPublico = gerarTokenPublico();
      }

      // Atualizar contrato com token e status
      const { error: errorUpdate } = await supabase
        .from('contratos')
        .update({
          token_publico: tokenPublico,
          status: 'enviado',
          data_envio: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (errorUpdate) {
        console.error('Erro ao atualizar contrato:', errorUpdate);
        return NextResponse.json({ error: 'Erro ao atualizar contrato' }, { status: 500 });
      }

      // Gerar link público
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const linkContrato = `${appUrl}/contrato/${tokenPublico}`;

      // Preparar dados para o email
      const dadosEmail = {
        cliente_nome: contrato.cliente.nome,
        numero_contrato: contrato.numero_contrato,
        tipo_evento: contrato.tipo_evento || 'Evento',
        data_evento: contrato.data_evento,
        local_evento: contrato.local_evento || 'A definir',
        num_convidados: contrato.numero_participantes || 0,
        link_contrato: linkContrato
      };

      // Enviar email
      try {
        await resend.emails.send({
          from: 'contato@eventosindaia.com.br',
          to: [contrato.cliente.email],
          subject: gerarAssuntoEmailContrato(contrato.numero_contrato, contrato.tipo_evento || 'Evento'),
          html: gerarTemplateEmailContrato(dadosEmail)
        });

        console.log(`Contrato ${contrato.id} enviado para ${contrato.cliente.email} com token ${tokenPublico}`);

        return NextResponse.json({
          success: true,
          message: 'Contrato enviado com sucesso!',
          token_publico: tokenPublico,
          link_contrato: linkContrato
        });

      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na API de contratos (PATCH):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { error } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id)
      .eq('vendedor_id', user.id);

    if (error) {
      console.error('Erro ao deletar contrato:', error);
      return NextResponse.json({ error: 'Erro ao deletar contrato' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contrato deletado com sucesso!' 
    });

  } catch (error) {
    console.error('Erro na API de contratos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}