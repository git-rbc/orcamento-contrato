import { useState, useEffect } from 'react';
import { LinhaItem } from '@/components/propostas/proposta-modal';
import { Produto } from '@/types/database';

interface CalculoServicosParams {
  servicosItens: LinhaItem[];
  alimentacaoItens: LinhaItem[];
  bebidasItens: LinhaItem[];
  itensExtras: LinhaItem[];
  espacoId?: string;
  diaSemana?: string;
  numPessoas?: number;
  dataContratacao?: Date;
  dataRealizacao?: Date;
}

interface CalculoResult {
  valorCalculado: number;
  parametrosUtilizados: Record<string, any>;
  erro?: string;
}

export function useCalculoServicos({
  servicosItens,
  alimentacaoItens,
  bebidasItens,
  itensExtras,
  espacoId,
  diaSemana,
  numPessoas,
  dataContratacao,
  dataRealizacao
}: CalculoServicosParams) {
  const [calculandoServicos, setCalculandoServicos] = useState<Set<string>>(new Set());
  const [errosCalculo, setErrosCalculo] = useState<Map<string, string>>(new Map());

  // Calcular diferença em meses entre duas datas
  const calcularMesesEntreDatas = (dataInicio: Date, dataFim: Date): number => {
    const anosDiff = dataFim.getFullYear() - dataInicio.getFullYear();
    const mesesDiff = dataFim.getMonth() - dataInicio.getMonth();
    return anosDiff * 12 + mesesDiff;
  };

  // Obter percentual de reajuste baseado nos meses
  const obterPercentualReajuste = (meses: number, parametros: Record<string, any>): number => {
    if (meses <= 5) return parseFloat(parametros.faixa_0_5 || '0');
    if (meses <= 12) return parseFloat(parametros.faixa_6_12 || '0');
    if (meses <= 24) return parseFloat(parametros.faixa_13_24 || '0');
    if (meses <= 36) return parseFloat(parametros.faixa_25_36 || '0');
    if (meses <= 48) return parseFloat(parametros.faixa_37_48 || '0');
    if (meses <= 60) return parseFloat(parametros.faixa_49_60 || '0');
    if (meses <= 72) return parseFloat(parametros.faixa_61_72 || '0');
    if (meses <= 84) return parseFloat(parametros.faixa_73_84 || '0');
    if (meses <= 96) return parseFloat(parametros.faixa_85_96 || '0');
    if (meses <= 108) return parseFloat(parametros.faixa_97_108 || '0');
    if (meses <= 120) return parseFloat(parametros.faixa_109_120 || '0');
    if (meses <= 132) return parseFloat(parametros.faixa_121_132 || '0');
    return parseFloat(parametros.faixa_121_132 || '0'); // Para mais de 132 meses
  };

  // Calcular valores dos produtos por campo
  const calcularValoresProdutos = async () => {
    const todosProdutos = [...alimentacaoItens, ...bebidasItens, ...itensExtras, ...servicosItens];
    
    // Filtrar apenas produtos com ID válido
    const produtosComId = todosProdutos.filter(item => 
      item.tipoItem === 'produto' && item.produtoId && item.produtoId !== null
    );

    if (produtosComId.length === 0) {
      return {
        produtosCampoTaxa: 0,
        produtosCampoReajuste: 0
      };
    }

    try {
      // Buscar dados dos produtos para verificar tem_taxa e reajuste
      const produtoIds = produtosComId.map(item => item.produtoId);
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: produtoIds
        }),
      });

      if (!response.ok) {
        console.error('Erro ao buscar dados dos produtos para cálculo');
        // Fallback: usar todos os produtos
        const valorTotal = produtosComId.reduce((acc, item) => 
          acc + (item.valorUnitario * item.quantidade), 0);
        return {
          produtosCampoTaxa: valorTotal,
          produtosCampoReajuste: valorTotal
        };
      }

      const { data: produtos } = await response.json();
      const produtosMap = new Map<string, Produto>(produtos.map((p: Produto) => [p.id, p]));

      // Somar produtos que devem ser considerados para taxa de serviço
      const valorProdutosTaxa = produtosComId.reduce((acc, item) => {
        if (!item.produtoId) return acc;
        const produto = produtosMap.get(item.produtoId);
        if (produto && produto.tem_taxa === true) {
          return acc + (item.valorUnitario * item.quantidade);
        }
        return acc;
      }, 0);

      // Somar produtos que devem ser considerados para reajuste
      const valorProdutosReajuste = produtosComId.reduce((acc, item) => {
        if (!item.produtoId) return acc;
        const produto = produtosMap.get(item.produtoId);
        if (produto && produto.reajuste === true) {
          return acc + (item.valorUnitario * item.quantidade);
        }
        return acc;
      }, 0);

      return {
        produtosCampoTaxa: valorProdutosTaxa,
        produtosCampoReajuste: valorProdutosReajuste
      };
    } catch (error) {
      console.error('Erro ao calcular valores dos produtos:', error);
      // Fallback: usar todos os produtos
      const valorTotal = produtosComId.reduce((acc, item) => 
        acc + (item.valorUnitario * item.quantidade), 0);
      return {
        produtosCampoTaxa: valorTotal,
        produtosCampoReajuste: valorTotal
      };
    }
  };

  // Função auxiliar para retry com delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Verificar se a aplicação está carregada (aguardar até 5s se necessário)
  const waitForAppReady = async (): Promise<boolean> => {
    const maxWait = 5000; // 5 segundos
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (waited < maxWait) {
      try {
        // Fazer uma chamada simples para verificar se o servidor está respondendo
        const response = await fetch('/api/servicos-template', { method: 'HEAD' });
        if (response.ok || response.status === 405) { // 405 é Method Not Allowed, mas significa que a rota existe
          return true;
        }
      } catch (error) {
        // Continuar tentando
      }
      
      await delay(checkInterval);
      waited += checkInterval;
    }
    
    return false;
  };

  // Calcular valor de um serviço específico com retry
  const calcularServicoIndividual = async (servicoItem: LinhaItem, tentativas = 3): Promise<CalculoResult> => {
    if (!servicoItem.servicoTemplateId || !servicoItem.calculoAutomatico) {
      return { valorCalculado: servicoItem.valorUnitario, parametrosUtilizados: {} };
    }

    // Aguardar aplicação estar pronta antes da primeira tentativa
    if (!(await waitForAppReady())) {
      console.warn('Aplicação não está pronta após 5s, tentando mesmo assim...');
    }

    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        const valoresProdutos = await calcularValoresProdutos();
        
        const response = await fetch('/api/servicos-template/calcular', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            servicoTemplateId: servicoItem.servicoTemplateId,
            espacoId,
            numPessoas,
            diaSemana,
            dataContratacao: dataContratacao?.toISOString(),
            dataRealizacao: dataRealizacao?.toISOString(),
            ...valoresProdutos
          }),
        });

        if (!response.ok) {
          // Se for 404 e ainda temos tentativas, aguardar um pouco antes de tentar novamente
          if (response.status === 404 && tentativa < tentativas) {
            console.warn(`Tentativa ${tentativa} falhou com 404, aguardando antes de tentar novamente...`);
            await delay(500 * tentativa); // Delay progressivo
            continue;
          }
          throw new Error(`Erro na API: ${response.status}`);
        }

        const result = await response.json();
        return {
          valorCalculado: result.data.valorCalculado,
          parametrosUtilizados: result.data.parametrosUtilizados
        };
      } catch (error) {
        console.error(`Erro ao calcular serviço (tentativa ${tentativa}):`, error);
        
        // Se for a última tentativa, retornar erro
        if (tentativa === tentativas) {
          return {
            valorCalculado: servicoItem.valorUnitario || 0,
            parametrosUtilizados: {},
            erro: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
        
        // Aguardar antes da próxima tentativa
        await delay(500 * tentativa);
      }
    }

    // Fallback (não deveria chegar aqui)
    return {
      valorCalculado: servicoItem.valorUnitario || 0,
      parametrosUtilizados: {},
      erro: 'Falha em todas as tentativas'
    };
  };

  // Recalcular todos os serviços automáticos
  const recalcularServicos = async (setServicosItens: (items: LinhaItem[]) => void) => {
    const servicosAutomaticos = servicosItens.filter(item => 
      item.calculoAutomatico && item.servicoTemplateId
    );

    if (servicosAutomaticos.length === 0) {
      return;
    }

    // Marcar serviços como sendo calculados
    const idsCalculando = new Set(servicosAutomaticos.map(s => s.id));
    setCalculandoServicos(idsCalculando);

    const novosErros = new Map<string, string>();
    const servicosAtualizados = [...servicosItens];

    // Calcular cada serviço
    for (const servico of servicosAutomaticos) {
      try {
        const resultado = await calcularServicoIndividual(servico);
        
        // Atualizar item na lista
        const index = servicosAtualizados.findIndex(s => s.id === servico.id);
        if (index !== -1) {
          servicosAtualizados[index] = {
            ...servicosAtualizados[index],
            valorUnitario: resultado.valorCalculado,
            parametrosCalculo: resultado.parametrosUtilizados
          };
        }

        if (resultado.erro) {
          novosErros.set(servico.id, resultado.erro);
        } else {
          novosErros.delete(servico.id);
        }
      } catch (error) {
        novosErros.set(servico.id, 'Erro ao calcular serviço');
      }
    }

    // Atualizar estados
    setErrosCalculo(novosErros);
    setCalculandoServicos(new Set());
    setServicosItens(servicosAtualizados);
  };

  // Verificar se há dados suficientes para cálculo
  const verificarDadosDisponiveis = () => {
    const alerts: string[] = [];
    
    const servicosComAmbiente = servicosItens.filter(s => 
      s.calculoAutomatico && 
      (s.tipoCalculo === 'valor_fixo_ambiente' || 
       s.tipoCalculo === 'valor_minimo_ambiente' || 
       s.tipoCalculo === 'valor_minimo_ambiente_dia')
    );

    const servicosComConvidados = servicosItens.filter(s => 
      s.calculoAutomatico && s.tipoCalculo === 'por_convidados'
    );

    const servicosComDia = servicosItens.filter(s => 
      s.calculoAutomatico && s.tipoCalculo === 'valor_minimo_ambiente_dia'
    );

    if (servicosComAmbiente.length > 0 && !espacoId) {
      alerts.push('Selecione um espaço para calcular os serviços por ambiente');
    }

    if (servicosComConvidados.length > 0 && !numPessoas) {
      alerts.push('Informe o número de pessoas para calcular os serviços por convidados');
    }

    if (servicosComDia.length > 0 && !diaSemana) {
      alerts.push('Selecione o dia da semana para calcular a locação');
    }

    return alerts;
  };

  return {
    calcularServicoIndividual,
    recalcularServicos,
    verificarDadosDisponiveis,
    calculandoServicos,
    errosCalculo
  };
}