import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST /api/servicos-template/sync-ambientes - Sincronizar parâmetros de ambiente
export async function POST(request: NextRequest) {
  try {
    // Buscar IDs dos serviços que precisam de parâmetros por ambiente
    const servicosAmbiente = ['Tx. Estacionamento', 'Tx. Ecad', 'Gerador de Energia', 'Locação'];
    
    const { data: servicos, error: servicoError } = await supabaseAdmin
      .from('servicos_template')
      .select('id, nome')
      .in('nome', servicosAmbiente);

    if (servicoError) {
      return NextResponse.json(
        createErrorResponse('Erro ao buscar serviços de ambiente'),
        { status: 500 }
      );
    }

    if (!servicos || servicos.length === 0) {
      return NextResponse.json(
        createErrorResponse('Nenhum serviço de ambiente encontrado'),
        { status: 404 }
      );
    }

    // Buscar espaços de eventos ativos
    const { data: espacos, error: espacosError } = await supabaseAdmin
      .from('espacos_eventos')
      .select('id')
      .eq('ativo', true);

    if (espacosError) {
      return NextResponse.json(
        createErrorResponse('Erro ao buscar espaços de eventos'),
        { status: 500 }
      );
    }

    let totalInseridos = 0;
    let totalRemovidos = 0;
    const resultados = [];

    // Processar cada serviço
    for (const servico of servicos) {
      // Buscar parâmetros existentes para este serviço
      const { data: parametrosExistentes, error: parametrosError } = await supabaseAdmin
        .from('servicos_parametros')
        .select('chave')
        .eq('servico_id', servico.id)
        .like('chave', 'ambiente_%');

      if (parametrosError) {
        return NextResponse.json(
          createErrorResponse(`Erro ao buscar parâmetros existentes para ${servico.nome}`),
          { status: 500 }
        );
      }

      const chavesExistentes = parametrosExistentes.map(p => p.chave);
      const parametrosParaInserir = [];

      // Para Locação, criar parâmetros ambiente+dia
      if (servico.nome === 'Locação') {
        const diasSemana = ['segunda_quinta', 'sexta', 'sabado', 'domingo', 'feriados', 'vesperas'];
        
        for (const espaco of espacos) {
          for (const dia of diasSemana) {
            const chave = `ambiente_${espaco.id}_${dia}`;
            if (!chavesExistentes.includes(chave)) {
              parametrosParaInserir.push({
                servico_id: servico.id,
                chave,
                valor: '',
                tipo_dado: 'number'
              });
            }
          }
        }
      } else {
        // Para outros serviços, criar parâmetros apenas por ambiente
        for (const espaco of espacos) {
          const chave = `ambiente_${espaco.id}`;
          if (!chavesExistentes.includes(chave)) {
            parametrosParaInserir.push({
              servico_id: servico.id,
              chave,
              valor: '',
              tipo_dado: 'number'
            });
          }
        }
      }

      // Inserir novos parâmetros se houver
      if (parametrosParaInserir.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('servicos_parametros')
          .insert(parametrosParaInserir);

        if (insertError) {
          return NextResponse.json(
            createErrorResponse(`Erro ao inserir novos parâmetros para ${servico.nome}`),
            { status: 500 }
          );
        }
      }

      // Remover parâmetros de espaços que não existem mais
      const idsAtivos = espacos.map(e => e.id);
      const parametrosParaRemover = parametrosExistentes.filter(p => {
        // Para Locação, extrair ID do formato ambiente_{id}_{dia}
        // Para outros serviços, extrair do formato ambiente_{id}
        const espacoId = servico.nome === 'Locação' 
          ? p.chave.split('_')[1] // ambiente_{id}_{dia} -> pega o id
          : p.chave.replace('ambiente_', ''); // ambiente_{id} -> pega o id
        return !idsAtivos.includes(espacoId);
      });

      if (parametrosParaRemover.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from('servicos_parametros')
          .delete()
          .eq('servico_id', servico.id)
          .in('chave', parametrosParaRemover.map(p => p.chave));

        if (deleteError) {
          return NextResponse.json(
            createErrorResponse(`Erro ao remover parâmetros obsoletos para ${servico.nome}`),
            { status: 500 }
          );
        }
      }

      totalInseridos += parametrosParaInserir.length;
      totalRemovidos += parametrosParaRemover.length;
      
      resultados.push({
        servico: servico.nome,
        inseridos: parametrosParaInserir.length,
        removidos: parametrosParaRemover.length
      });
    }

    return NextResponse.json(
      createSuccessResponse({
        servicos: resultados,
        totalInseridos,
        totalRemovidos,
        totalAmbientes: espacos.length
      }, 'Parâmetros de ambiente sincronizados com sucesso para todos os serviços')
    );
  } catch (error) {
    console.error('Erro ao sincronizar parâmetros:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}