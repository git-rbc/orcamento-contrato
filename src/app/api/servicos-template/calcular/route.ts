import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface CalcularServicoRequest {
  servicoTemplateId: string;
  espacoId?: string;
  numPessoas?: number;
  diaSemana?: string;
  valorProdutos?: number;
  produtosCampoTaxa?: number; // Valor dos produtos com tem_taxa=true
  produtosCampoReajuste?: number; // Valor dos produtos com reajuste=true
  dataContratacao?: string;
  dataRealizacao?: string;
}

// POST /api/servicos-template/calcular - Calcular valor de um serviço
export async function POST(request: NextRequest) {
  try {
    const body: CalcularServicoRequest = await request.json();
    
    if (!body.servicoTemplateId) {
      return NextResponse.json(
        createErrorResponse('ID do serviço template é obrigatório'),
        { status: 400 }
      );
    }

    // Buscar serviço template com parâmetros
    const { data: servico, error: servicoError } = await supabaseAdmin
      .from('servicos_template')
      .select(`
        *,
        parametros:servicos_parametros(*)
      `)
      .eq('id', body.servicoTemplateId)
      .single();

    if (servicoError || !servico) {
      return NextResponse.json(
        createErrorResponse('Serviço template não encontrado'),
        { status: 404 }
      );
    }

    let valorCalculado = 0;

    // Calcular valor baseado no tipo de cálculo
    switch (servico.tipo_calculo) {
      case 'percentual_produtos':
        valorCalculado = calcularPercentualProdutos(servico, body);
        break;
      
      case 'valor_fixo_ambiente':
        valorCalculado = await calcularValorFixoAmbiente(servico, body);
        break;
      
      case 'por_convidados':
        valorCalculado = calcularPorConvidados(servico, body);
        break;
      
      case 'valor_minimo_ambiente':
        valorCalculado = await calcularValorMinimoAmbiente(servico, body);
        break;
      
      case 'valor_minimo_ambiente_dia':
        valorCalculado = await calcularValorMinimoAmbienteDia(servico, body);
        break;
      
      case 'reajuste_temporal':
        valorCalculado = calcularReajusteTemporal(servico, body);
        break;
      
      default:
        return NextResponse.json(
          createErrorResponse('Tipo de cálculo não reconhecido'),
          { status: 400 }
        );
    }

    return NextResponse.json(
      createSuccessResponse({
        valorCalculado,
        tipoCalculo: servico.tipo_calculo,
        servicoNome: servico.nome,
        parametrosUtilizados: extractParametrosUtilizados(servico, body)
      }, 'Valor calculado com sucesso')
    );
  } catch (error) {
    console.error('Erro ao calcular serviço:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}

function calcularPercentualProdutos(servico: any, dados: CalcularServicoRequest): number {
  const percentualParam = servico.parametros?.find((p: any) => p.chave === 'percentual');
  const campoParam = servico.parametros?.find((p: any) => p.chave === 'campo_produto');
  
  if (!percentualParam || !campoParam) {
    return 0;
  }

  const percentual = parseFloat(percentualParam.valor) || 0;
  let valorBase = 0;

  // Determinar qual campo usar baseado no serviço
  if (campoParam.valor === 'tem_taxa') {
    valorBase = dados.produtosCampoTaxa || 0;
  } else if (campoParam.valor === 'reajuste') {
    valorBase = dados.produtosCampoReajuste || 0;
  }

  return valorBase * (percentual / 100);
}

async function calcularValorFixoAmbiente(servico: any, dados: CalcularServicoRequest): Promise<number> {
  if (!dados.espacoId) {
    return 0;
  }

  const chaveAmbiente = `ambiente_${dados.espacoId}`;
  const parametroAmbiente = servico.parametros?.find((p: any) => p.chave === chaveAmbiente);
  
  return parseFloat(parametroAmbiente?.valor) || 0;
}

function calcularPorConvidados(servico: any, dados: CalcularServicoRequest): number {
  const quantidadeParam = servico.parametros?.find((p: any) => p.chave === 'convidados_quantidade');
  const valorGrupoParam = servico.parametros?.find((p: any) => p.chave === 'valor_por_grupo');
  
  if (!quantidadeParam || !valorGrupoParam || !dados.numPessoas) {
    return 0;
  }

  const convidadosPorGrupo = parseFloat(quantidadeParam.valor) || 100;
  const valorPorGrupo = parseFloat(valorGrupoParam.valor) || 0;
  
  const numeroGrupos = Math.ceil(dados.numPessoas / convidadosPorGrupo);
  return numeroGrupos * valorPorGrupo;
}

async function calcularValorMinimoAmbiente(servico: any, dados: CalcularServicoRequest): Promise<number> {
  if (!dados.espacoId) {
    return 0;
  }

  const chaveAmbiente = `ambiente_${dados.espacoId}`;
  const parametroAmbiente = servico.parametros?.find((p: any) => p.chave === chaveAmbiente);
  
  return parseFloat(parametroAmbiente?.valor) || 0;
}

async function calcularValorMinimoAmbienteDia(servico: any, dados: CalcularServicoRequest): Promise<number> {
  if (!dados.espacoId || !dados.diaSemana) {
    return 0;
  }

  // Mapear dias da semana para formato do banco
  const diaMap: Record<string, string> = {
    'Segunda': 'segunda_quinta',
    'Terça': 'segunda_quinta',
    'Quarta': 'segunda_quinta',
    'Quinta': 'segunda_quinta',
    'Sexta': 'sexta',
    'Sábado': 'sabado',
    'Domingo': 'domingo'
  };

  const diaBanco = diaMap[dados.diaSemana] || 'segunda_quinta';
  const chaveAmbienteDia = `ambiente_${dados.espacoId}_${diaBanco}`;
  
  const parametroAmbienteDia = servico.parametros?.find((p: any) => p.chave === chaveAmbienteDia);
  
  return parseFloat(parametroAmbienteDia?.valor) || 0;
}

function calcularReajusteTemporal(servico: any, dados: CalcularServicoRequest): number {
  // Verificar se temos as datas necessárias
  if (!dados.dataContratacao || !dados.dataRealizacao) {
    return 0;
  }

  // Converter strings para datas
  const dataContratacao = new Date(dados.dataContratacao);
  const dataRealizacao = new Date(dados.dataRealizacao);

  // Calcular diferença em meses
  const anosDiff = dataRealizacao.getFullYear() - dataContratacao.getFullYear();
  const mesesDiff = dataRealizacao.getMonth() - dataContratacao.getMonth();
  const mesesTotal = anosDiff * 12 + mesesDiff;

  // Obter percentual baseado na faixa
  let percentual = 0;
  if (mesesTotal <= 5) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_0_5')?.valor) || 0;
  } else if (mesesTotal <= 12) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_6_12')?.valor) || 0;
  } else if (mesesTotal <= 24) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_13_24')?.valor) || 0;
  } else if (mesesTotal <= 36) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_25_36')?.valor) || 0;
  } else if (mesesTotal <= 48) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_37_48')?.valor) || 0;
  } else if (mesesTotal <= 60) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_49_60')?.valor) || 0;
  } else if (mesesTotal <= 72) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_61_72')?.valor) || 0;
  } else if (mesesTotal <= 84) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_73_84')?.valor) || 0;
  } else if (mesesTotal <= 96) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_85_96')?.valor) || 0;
  } else if (mesesTotal <= 108) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_97_108')?.valor) || 0;
  } else if (mesesTotal <= 120) {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_109_120')?.valor) || 0;
  } else {
    percentual = parseFloat(servico.parametros?.find((p: any) => p.chave === 'faixa_121_132')?.valor) || 0;
  }

  // Obter valor base dos produtos com reajuste
  const valorBase = dados.produtosCampoReajuste || 0;

  // Calcular valor do reajuste
  return valorBase * (percentual / 100);
}

function extractParametrosUtilizados(servico: any, dados: CalcularServicoRequest): Record<string, any> {
  const parametros: Record<string, any> = {};

  switch (servico.tipo_calculo) {
    case 'percentual_produtos':
      parametros.percentual = servico.parametros?.find((p: any) => p.chave === 'percentual')?.valor;
      parametros.campo_produto = servico.parametros?.find((p: any) => p.chave === 'campo_produto')?.valor;
      parametros.valor_base = servico.parametros?.find((p: any) => p.chave === 'campo_produto')?.valor === 'tem_taxa' 
        ? dados.produtosCampoTaxa 
        : dados.produtosCampoReajuste;
      break;
    
    case 'valor_fixo_ambiente':
    case 'valor_minimo_ambiente':
      parametros.espaco_id = dados.espacoId;
      break;
    
    case 'por_convidados':
      parametros.num_pessoas = dados.numPessoas;
      parametros.convidados_por_grupo = servico.parametros?.find((p: any) => p.chave === 'convidados_quantidade')?.valor;
      parametros.valor_por_grupo = servico.parametros?.find((p: any) => p.chave === 'valor_por_grupo')?.valor;
      break;
    
    case 'valor_minimo_ambiente_dia':
      parametros.espaco_id = dados.espacoId;
      parametros.dia_semana = dados.diaSemana;
      break;
    
    case 'reajuste_temporal':
      parametros.data_contratacao = dados.dataContratacao;
      parametros.data_realizacao = dados.dataRealizacao;
      parametros.valor_base = dados.produtosCampoReajuste;
      
      // Calcular meses e percentual usado
      if (dados.dataContratacao && dados.dataRealizacao) {
        const dataContratacao = new Date(dados.dataContratacao);
        const dataRealizacao = new Date(dados.dataRealizacao);
        const anosDiff = dataRealizacao.getFullYear() - dataContratacao.getFullYear();
        const mesesDiff = dataRealizacao.getMonth() - dataContratacao.getMonth();
        const mesesTotal = anosDiff * 12 + mesesDiff;
        
        parametros.meses_diferenca = mesesTotal;
        
        // Determinar faixa e percentual usado
        let faixaUsada = 'faixa_0_5';
        if (mesesTotal <= 5) faixaUsada = 'faixa_0_5';
        else if (mesesTotal <= 12) faixaUsada = 'faixa_6_12';
        else if (mesesTotal <= 24) faixaUsada = 'faixa_13_24';
        else if (mesesTotal <= 36) faixaUsada = 'faixa_25_36';
        else if (mesesTotal <= 48) faixaUsada = 'faixa_37_48';
        else if (mesesTotal <= 60) faixaUsada = 'faixa_49_60';
        else if (mesesTotal <= 72) faixaUsada = 'faixa_61_72';
        else if (mesesTotal <= 84) faixaUsada = 'faixa_73_84';
        else if (mesesTotal <= 96) faixaUsada = 'faixa_85_96';
        else if (mesesTotal <= 108) faixaUsada = 'faixa_97_108';
        else if (mesesTotal <= 120) faixaUsada = 'faixa_109_120';
        else faixaUsada = 'faixa_121_132';
        
        parametros.faixa_usada = faixaUsada;
        parametros.percentual_usado = servico.parametros?.find((p: any) => p.chave === faixaUsada)?.valor || '0';
      }
      break;
  }

  return parametros;
}