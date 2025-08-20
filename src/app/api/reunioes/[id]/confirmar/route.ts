import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se a reunião existe
    const { data: reuniao, error: reuniaoError } = await supabase
      .from('reunioes')
      .select('*')
      .eq('id', id)
      .single();

    if (reuniaoError) {
      return NextResponse.json(
        { error: 'Reunião não encontrada' },
        { status: 404 }
      );
    }

    // Determinar que tipo de confirmação está sendo feita
    const { tipo_confirmacao } = body; // 'cliente' ou 'vendedor'
    
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (tipo_confirmacao === 'cliente') {
      updates.confirmada_cliente = true;
    } else if (tipo_confirmacao === 'vendedor') {
      updates.confirmada_vendedor = true;
    } else {
      // Confirmação geral - marca ambos como confirmados
      updates.confirmada_cliente = true;
      updates.confirmada_vendedor = true;
    }

    // Se ambas as confirmações estão feitas, atualizar status para confirmada
    const confirmadaCliente = updates.confirmada_cliente ?? reuniao.confirmada_cliente;
    const confirmadaVendedor = updates.confirmada_vendedor ?? reuniao.confirmada_vendedor;

    if (confirmadaCliente && confirmadaVendedor) {
      updates.status = 'confirmada';
    }

    const { data, error } = await supabase
      .from('reunioes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao confirmar reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao confirmar reunião' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      data,
      message: 'Reunião confirmada com sucesso'
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}