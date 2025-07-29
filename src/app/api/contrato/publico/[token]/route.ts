import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientInfo } from '@/lib/ip-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validar formato do token
    if (!token || !/^[A-Z0-9]{8}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Buscar contrato pelo token
    const { data: contrato, error } = await supabase
      .from('contratos')
      .select(`
        *,
        cliente:clientes(*)
      `)
      .eq('token_publico', token)
      .eq('status', 'enviado')
      .single();

    if (error || !contrato) {
      return NextResponse.json(
        { error: 'Contrato não encontrado ou não disponível' },
        { status: 404 }
      );
    }

    // Registrar visualização se ainda não foi visualizado
    if (!contrato.data_visualizacao) {
      const clientInfo = getClientInfo(request);
      
      await supabase
        .from('contratos')
        .update({ 
          data_visualizacao: new Date().toISOString(),
          status: 'visualizado'
        })
        .eq('id', contrato.id);

      console.log(`Contrato ${contrato.id} visualizado por IP: ${clientInfo.ip}`);
    }

    // Retornar dados do contrato (sem informações sensíveis)
    return NextResponse.json({
      id: contrato.id,
      numero_contrato: contrato.numero_contrato,
      tipo_evento: contrato.tipo_evento,
      data_evento: contrato.data_evento,
      local_evento: contrato.local_evento,
      numero_participantes: contrato.numero_participantes,
      valor_total: contrato.valor_total,
      status: contrato.status,
      observacoes: contrato.observacoes,
      cliente: {
        nome: contrato.cliente?.nome,
        email: contrato.cliente?.email,
        telefone: contrato.cliente?.telefone,
        cpf_cnpj: contrato.cliente?.cpf_cnpj,
        tipo_pessoa: contrato.cliente?.tipo_pessoa,
        endereco: contrato.cliente?.endereco,
        numero: contrato.cliente?.numero,
        bairro: contrato.cliente?.bairro,
        cidade: contrato.cliente?.cidade,
        cep: contrato.cliente?.cep,
      },
      data_criacao: contrato.data_criacao,
      data_visualizacao: contrato.data_visualizacao
    });

  } catch (error) {
    console.error('Erro ao buscar contrato público:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { status } = await request.json();
    
    // Validar formato do token
    if (!token || !/^[A-Z0-9]{8}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Status válidos para atualização pública
    const statusValidos = ['em_assinatura'];
    if (!statusValidos.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Buscar e atualizar contrato
    const { data: contrato, error } = await supabase
      .from('contratos')
      .update({ status })
      .eq('token_publico', token)
      .select()
      .single();

    if (error || !contrato) {
      return NextResponse.json(
        { error: 'Contrato não encontrado' },
        { status: 404 }
      );
    }

    const clientInfo = getClientInfo(request);
    console.log(`Status do contrato ${contrato.id} atualizado para ${status} por IP: ${clientInfo.ip}`);

    return NextResponse.json({ 
      message: 'Status atualizado com sucesso',
      status: contrato.status
    });

  } catch (error) {
    console.error('Erro ao atualizar status do contrato:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}