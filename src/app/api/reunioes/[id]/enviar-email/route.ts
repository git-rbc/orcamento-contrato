import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { enviarEmailReuniaoHTML, ReuniaoEmailData } from '@/services/email-reunioes-html';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    const { tipo_email, opcoes } = body;
    
    if (!tipo_email || !['agendada', 'lembrete', 'cancelada', 'reagendada'].includes(tipo_email)) {
      return NextResponse.json(
        { error: 'Tipo de email inválido' },
        { status: 400 }
      );
    }

    // Buscar dados completos da reunião
    const { data: reuniao, error: reuniaoError } = await supabase
      .from('v_reunioes_completa')
      .select('*')
      .eq('id', id)
      .single();

    if (reuniaoError || !reuniao) {
      return NextResponse.json(
        { error: 'Reunião não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se os dados necessários estão presentes
    if (!reuniao.cliente_email) {
      return NextResponse.json(
        { error: 'Email do cliente não encontrado' },
        { status: 400 }
      );
    }

    // Para reagendamento, buscar dados do histórico
    let dadosHistorico = null;
    if (tipo_email === 'reagendada') {
      const { data: historico } = await supabase
        .from('reunioes_historico')
        .select('*')
        .eq('reuniao_id', id)
        .order('reagendada_em', { ascending: false })
        .limit(1);

      dadosHistorico = historico?.[0];
    }

    // Preparar dados do email
    const dadosEmail: ReuniaoEmailData = {
      id: reuniao.id,
      clienteNome: reuniao.cliente_nome,
      clienteEmail: reuniao.cliente_email,
      vendedorNome: reuniao.vendedor_nome,
      vendedorEmail: reuniao.vendedor_email || 'vendas@empresa.com',
      data: reuniao.data,
      horaInicio: reuniao.hora_inicio,
      horaFim: reuniao.hora_fim,
      tipoReuniao: reuniao.tipo_reuniao_nome || 'Reunião Comercial',
      espacoNome: reuniao.espaco_nome,
      linkReuniao: reuniao.link_reuniao,
      observacoes: reuniao.observacoes,
      // Para reagendamento
      dataAnterior: dadosHistorico?.data_anterior,
      horaInicioAnterior: dadosHistorico?.hora_inicio_anterior,
      horaFimAnterior: dadosHistorico?.hora_fim_anterior,
      motivo: dadosHistorico?.motivo || opcoes?.motivo
    };

    // Enviar email
    const sucesso = await enviarEmailReuniaoHTML(tipo_email, dadosEmail, opcoes);

    if (!sucesso) {
      return NextResponse.json(
        { error: 'Falha no envio do email' },
        { status: 500 }
      );
    }

    // Atualizar flag de lembrete enviado se for o caso
    if (tipo_email === 'lembrete') {
      await supabase
        .from('reunioes')
        .update({ lembrete_enviado: true })
        .eq('id', id);
    }

    return NextResponse.json({
      success: true,
      message: `Email de ${tipo_email} enviado com sucesso`
    });

  } catch (error) {
    console.error('Erro ao enviar email de reunião:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}