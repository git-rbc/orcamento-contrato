import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET - Buscar cupons disponíveis para aplicação
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const clienteId = searchParams.get('cliente_id');
    const valorTotal = searchParams.get('valor_total');

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do usuário com role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        role_id,
        roles!inner(
          id,
          nome,
          nivel_hierarquia
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se tem permissão para acessar cupons
    const isAdmin = (userData.roles as any).nivel_hierarquia >= 80;
    const isVendedor = (userData.roles as any).nivel_hierarquia >= 50;

    if (!isVendedor) {
      return NextResponse.json({ message: 'Sem permissão para acessar cupons' }, { status: 403 });
    }

    // Construir query baseada nas permissões
    let query = supabase
      .from('cupons_desconto')
      .select(`
        id,
        codigo,
        nome,
        tipo_desconto,
        valor_desconto,
        valor_minimo_pedido,
        data_inicio,
        data_fim,
        limite_uso,
        uso_atual,
        cliente_especifico_id,
        dias_semana,
        nivel_acesso,
        cliente_especifico:clientes!cliente_especifico_id(
          id,
          nome
        )
      `)
      .eq('ativo', true)
      .order('nome');

    // Se não for admin, filtrar apenas cupons disponíveis para vendedor
    if (!isAdmin) {
      query = query.eq('nivel_acesso', 'vendedor');
    }

    // Filtrar por termo de busca (código ou nome)
    if (q.trim()) {
      query = query.or(`codigo.ilike.%${q}%,nome.ilike.%${q}%`);
    }

    const { data: cupons, error: cuponsError } = await query.limit(10);

    if (cuponsError) {
      console.error('Erro ao buscar cupons:', cuponsError);
      return NextResponse.json({ message: 'Erro ao buscar cupons' }, { status: 500 });
    }

    // Filtrar cupons válidos
    const now = new Date();
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const diaAtual = diasSemana[now.getDay()];
    
    const cuponsFiltrados = cupons?.filter(cupom => {
      // Verificar data de validade
      if (cupom.data_inicio && new Date(cupom.data_inicio) > now) {
        return false;
      }
      if (cupom.data_fim && new Date(cupom.data_fim) < now) {
        return false;
      }

      // Verificar limite de uso
      if (cupom.limite_uso && cupom.uso_atual >= cupom.limite_uso) {
        return false;
      }

      // Verificar valor mínimo do pedido
      if (cupom.valor_minimo_pedido && valorTotal && Number(valorTotal) < cupom.valor_minimo_pedido) {
        return false;
      }

      // Verificar cliente específico
      if (cupom.cliente_especifico_id && cupom.cliente_especifico_id !== clienteId) {
        return false;
      }

      // Verificar dia da semana
      if (cupom.dias_semana && cupom.dias_semana.length > 0) {
        if (!cupom.dias_semana.includes(diaAtual)) {
          return false;
        }
      }

      return true;
    }) || [];

    // Formatar resposta
    const cuponsFormatados = cuponsFiltrados.map(cupom => ({
      id: cupom.id,
      codigo: cupom.codigo,
      nome: cupom.nome,
      tipo_desconto: cupom.tipo_desconto,
      valor_desconto: cupom.valor_desconto,
      cliente_especifico: (cupom.cliente_especifico as any)?.nome || null,
      formatDisplay: cupom.cliente_especifico 
        ? `${cupom.codigo} - ${cupom.nome} (Cliente: ${(cupom.cliente_especifico as any).nome})`
        : `${cupom.codigo} - ${cupom.nome}`
    }));

    return NextResponse.json(cuponsFormatados);

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}