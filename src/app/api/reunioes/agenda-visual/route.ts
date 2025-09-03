import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio') || new Date().toISOString().split('T')[0];
    const dataFim = searchParams.get('data_fim') || (() => {
      const data = new Date();
      data.setDate(data.getDate() + 30);
      return data.toISOString().split('T')[0];
    })();
    const vendedorId = searchParams.get('vendedor_id');
    const localAtendimento = searchParams.get('local_atendimento');
    const tipoVisao = searchParams.get('tipo_visao') || 'calendario'; // calendario, lista, timeline

    // Buscar reuniões com informações completas para agenda visual
    let query = supabase
      .from('v_reunioes_completa')
      .select(`
        id,
        titulo,
        data,
        hora_inicio,
        hora_fim,
        status,
        local_atendimento,
        cor_agenda,
        vendedor_nome,
        vendedor_email,
        cliente_nome,
        cliente_email,
        tipo_reuniao_nome,
        tipo_reuniao_cor,
        espaco_nome,
        confirmada_cliente,
        confirmada_vendedor,
        lembrete_enviado,
        pre_vendedor_id,
        pre_vendedor_nome
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('pre_vendedor_id', vendedorId);
    }

    if (localAtendimento && localAtendimento !== 'todos') {
      query = query.eq('local_atendimento', localAtendimento);
    }

    const { data: reunioesData, error: reunioesError } = await query
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (reunioesError) {
      console.error('Erro ao buscar reuniões para agenda visual:', reunioesError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados da agenda visual' },
        { status: 500 }
      );
    }

    // Se não há reuniões, retornar resposta com dados vazios
    if (!reunioesData || reunioesData.length === 0) {
      return NextResponse.json({
        data: {
          reunioes: [],
          dados_agrupados: {},
          legendas: [],
          estatisticas: {
            total_reunioes: 0,
            por_status: {},
            por_local: {},
            por_vendedor: {},
            confirmacoes: {
              ambos_confirmaram: 0,
              pendente_cliente: 0,
              pendente_vendedor: 0,
              lembretes_enviados: 0
            },
            periodo: {
              inicio: dataInicio,
              fim: dataFim,
              total_dias: Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24))
            }
          },
          configuracao: {
            tipo_visao: tipoVisao,
            periodo: { inicio: dataInicio, fim: dataFim },
            filtros_aplicados: { vendedor_id: vendedorId, local_atendimento: localAtendimento }
          }
        },
        message: "Nenhuma reunião encontrada para o período selecionado"
      });
    }

    // Buscar informações de locais para cores e legendas
    const { data: locaisData } = await supabase
      .from('locais_atendimento')
      .select('codigo, nome, cor, tipo')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    // Criar mapeamento de cores por local
    const coresPorLocal: any = {};
    locaisData?.forEach(local => {
      coresPorLocal[local.codigo] = {
        nome: local.nome,
        cor: local.cor,
        tipo: local.tipo
      };
    });

    // Processar reuniões para agenda visual
    const reunioesProcessadas = reunioesData?.map(reuniao => {
      const localInfo = coresPorLocal[reuniao.local_atendimento] || {};
      
      return {
        ...reuniao,
        // Determinar cor (prioridade: cor_agenda > cor do local > cor do tipo de reunião)
        cor_evento: reuniao.cor_agenda || localInfo.cor || reuniao.tipo_reuniao_cor || '#6b7280',
        local_nome: localInfo.nome || reuniao.local_atendimento,
        local_tipo: localInfo.tipo,
        
        // Status visual para diferentes estados
        status_visual: {
          confirmacao: {
            cliente: reuniao.confirmada_cliente,
            vendedor: reuniao.confirmada_vendedor,
            ambos_confirmaram: reuniao.confirmada_cliente && reuniao.confirmada_vendedor
          },
          lembrete_enviado: reuniao.lembrete_enviado,
          precisa_confirmacao: !reuniao.confirmada_cliente || !reuniao.confirmada_vendedor
        },

        // Informações extras para tooltip/detalhes
        detalhes: {
          pre_vendedor_id: reuniao.pre_vendedor_id,
          pre_vendedor_nome: reuniao.pre_vendedor_nome,
          espaco: reuniao.espaco_nome,
          duracao_estimada: calcularDuracao(reuniao.hora_inicio, reuniao.hora_fim)
        }
      };
    }) || [];

    // Agrupar por diferentes visões conforme solicitado
    let dadosAgrupados: any = {};

    if (tipoVisao === 'calendario') {
      // Agrupamento por data para visualização de calendário
      dadosAgrupados = reunioesProcessadas.reduce((acc: any, reuniao: any) => {
        const data = reuniao.data;
        if (!acc[data]) {
          acc[data] = [];
        }
        acc[data].push(reuniao);
        return acc;
      }, {});

    } else if (tipoVisao === 'vendedor') {
      // Agrupamento por vendedor
      dadosAgrupados = reunioesProcessadas.reduce((acc: any, reuniao: any) => {
        const vendedor = `${reuniao.pre_vendedor_id}|${reuniao.vendedor_nome}`;
        if (!acc[vendedor]) {
          acc[vendedor] = {
            vendedor_id: reuniao.pre_vendedor_id,
            vendedor_nome: reuniao.vendedor_nome,
            reunioes: []
          };
        }
        acc[vendedor].reunioes.push(reuniao);
        return acc;
      }, {});

    } else if (tipoVisao === 'local') {
      // Agrupamento por local de atendimento
      dadosAgrupados = reunioesProcessadas.reduce((acc: any, reuniao: any) => {
        const local = reuniao.local_atendimento;
        if (!acc[local]) {
          acc[local] = {
            local_codigo: local,
            local_nome: reuniao.local_nome,
            local_cor: coresPorLocal[local]?.cor,
            local_tipo: coresPorLocal[local]?.tipo,
            reunioes: []
          };
        }
        acc[local].reunioes.push(reuniao);
        return acc;
      }, {});

    } else if (tipoVisao === 'status') {
      // Agrupamento por status
      dadosAgrupados = reunioesProcessadas.reduce((acc: any, reuniao: any) => {
        const status = reuniao.status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(reuniao);
        return acc;
      }, {});
    }

    // Estatísticas para a agenda
    const estatisticas = {
      total_reunioes: reunioesProcessadas.length,
      por_status: reunioesProcessadas.reduce((acc: any, r: any) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
      por_local: reunioesProcessadas.reduce((acc: any, r: any) => {
        acc[r.local_atendimento] = (acc[r.local_atendimento] || 0) + 1;
        return acc;
      }, {}),
      por_vendedor: reunioesProcessadas.reduce((acc: any, r: any) => {
        acc[r.vendedor_nome] = (acc[r.vendedor_nome] || 0) + 1;
        return acc;
      }, {}),
      confirmacoes: {
        ambos_confirmaram: reunioesProcessadas.filter(r => r.status_visual.confirmacao.ambos_confirmaram).length,
        pendente_cliente: reunioesProcessadas.filter(r => !r.confirmada_cliente).length,
        pendente_vendedor: reunioesProcessadas.filter(r => !r.confirmada_vendedor).length,
        lembretes_enviados: reunioesProcessadas.filter(r => r.lembrete_enviado).length
      },
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
        total_dias: Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24))
      }
    };

    // Legendas para os locais
    const legendas = Object.entries(coresPorLocal).map(([codigo, info]: [string, any]) => ({
      codigo,
      nome: info.nome,
      cor: info.cor,
      tipo: info.tipo,
      total_reunioes: reunioesProcessadas.filter(r => r.local_atendimento === codigo).length
    })).sort((a, b) => b.total_reunioes - a.total_reunioes);

    const response = {
      reunioes: reunioesProcessadas,
      dados_agrupados: dadosAgrupados,
      legendas,
      estatisticas,
      configuracao: {
        tipo_visao: tipoVisao,
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        },
        filtros_aplicados: {
          vendedor_id: vendedorId,
          local_atendimento: localAtendimento
        }
      }
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função auxiliar para calcular duração
function calcularDuracao(horaInicio: string, horaFim: string): number {
  const inicio = new Date(`1970-01-01T${horaInicio}`);
  const fim = new Date(`1970-01-01T${horaFim}`);
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60)); // retorna em minutos
}