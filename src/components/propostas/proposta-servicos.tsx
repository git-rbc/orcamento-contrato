import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Produto } from '@/types/database';
import { SelecaoProdutoModal } from './selecao-produto-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LinhaItem } from './proposta-modal';
import { Badge } from '@/components/ui/badge';

interface PropostaSecaoProps {
  items: LinhaItem[];
  setItems: (items: LinhaItem[]) => void;
  titulo: string;
  espacoId?: string;
  diaSemana?: string;
  numPessoas?: number;
}

export function PropostaServicos({ items, setItems, titulo, espacoId, diaSemana, numPessoas }: PropostaSecaoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [itemsComDescontoVisivel, setItensComDescontoVisivel] = useState<Set<string>>(new Set());
  const [seguimentoFiltro, setSeguimentoFiltro] = useState<'alimentos' | 'bebidas' | 'decoracao' | 'itens_extra' | null>(null);
  const [validationMessages, setValidationMessages] = useState<Map<string, string>>(new Map());
  const valoresMinimosRef = useRef<Map<string, number>>(new Map());
  const [valoresOriginaisDecoracoes, setValoresOriginaisDecoracoes] = useState<Map<string, number>>(new Map());

  // Função para verificar se um item é de decoração
  const isDecoracaoItem = (item: LinhaItem) => {
    const descricaoLower = item.descricao.toLowerCase();
    return descricaoLower.includes('decoração') ||
           descricaoLower.includes('decoracao') ||
           item.descricao === 'Selecione a decoração clicando aqui';
  };

  // Função para verificar se decoração tem produto selecionado (pode ser editada)
  const isDecoracaoEditavel = (item: LinhaItem) => {
    return isDecoracaoItem(item) &&
           item.produtoId !== null &&
           item.descricao !== 'Selecione a decoração clicando aqui';
  };

  // Função para verificar se um item é editável (Locação, Tx. Ecad, Gerador de Energia ou Decoração com produto selecionado)
  const isItemEditavel = (item: LinhaItem) => {
    // Verificar primeiro se é decoração editável
    if (isDecoracaoEditavel(item)) {
      return true;
    }

    // Verificar itens editáveis padrão
    const descricaoLower = item.descricao.toLowerCase();
    return descricaoLower.includes('locação') ||
           descricaoLower.includes('locacao') ||
           descricaoLower.includes('tx. ecad') ||
           descricaoLower.includes('ecad') ||
           descricaoLower.includes('gerador de energia') ||
           descricaoLower.includes('gerador') && descricaoLower.includes('energia');
  };

  // Buscar valores mínimos cadastrados nos serviços template
  const buscarValorMinimoCadastrado = useCallback(async (item: LinhaItem): Promise<number> => {
    if (!espacoId) return 0;

    let servicoTemplateId = item.servicoTemplateId;
    
    // Se não há servicoTemplateId, tentar buscar pelo nome/descrição do item
    if (!servicoTemplateId && item.descricao) {
      try {
        const searchResponse = await fetch('/api/servicos-template?' + new URLSearchParams({
          nome: item.descricao.trim()
        }));
        
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.data && searchResult.data.length > 0) {
            servicoTemplateId = searchResult.data[0].id;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar serviço template pelo nome:', error);
      }
    }

    // Se ainda não tem servicoTemplateId, retornar 0
    if (!servicoTemplateId) return 0;

    // Verificar se já temos o valor em cache
    const cacheKey = `${servicoTemplateId}_${espacoId}_${diaSemana}`;
    if (valoresMinimosRef.current.has(cacheKey)) {
      return valoresMinimosRef.current.get(cacheKey)!;
    }

    try {
      const requestBody: any = {
        servicoTemplateId: servicoTemplateId,
        espacoId,
        diaSemana,
        numPessoas: typeof numPessoas === 'number' ? numPessoas : undefined
      };

      const response = await fetch('/api/servicos-template/calcular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        const valorMinimo = result.data?.valorCalculado || 0;

        // Armazenar em cache
        valoresMinimosRef.current.set(cacheKey, valorMinimo);
        return valorMinimo;
      }
    } catch (error) {
      console.error('Erro ao buscar valor mínimo:', error);
    }

    return 0;
  }, [espacoId, diaSemana, numPessoas]);

  // Função para buscar valor mínimo de um item específico
  const obterValorMinimo = useCallback(async (itemId: string): Promise<number> => {
    const item = items.find(i => i.id === itemId);
    if (!item || !isItemEditavel(item)) return 0;

    // Se for decoração editável, retornar o valor original armazenado
    if (isDecoracaoEditavel(item)) {
      return valoresOriginaisDecoracoes.get(itemId) || 0;
    }

    // Caso contrário, buscar valor mínimo cadastrado (para outros itens editáveis)
    return await buscarValorMinimoCadastrado(item);
  }, [items, buscarValorMinimoCadastrado, valoresOriginaisDecoracoes]);

  // Estados para gerenciar valores de input em formato string
  const [inputValues, setInputValues] = useState<Map<string, string>>(new Map());

  // Função para formatar valor como moeda brasileira
  const formatCurrency = useCallback((value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  // Função para converter string em número
  const parseInputValue = useCallback((value: string): number => {
    if (!value || value.trim() === '') return 0;

    // Remove tudo exceto números, vírgulas e pontos
    const cleanValue = value.replace(/[^\d.,]/g, '');

    if (!cleanValue) return 0;

    // Substitui vírgula por ponto para conversão
    const numberValue = parseFloat(cleanValue.replace(',', '.'));
    return isNaN(numberValue) ? 0 : numberValue;
  }, []);

  const addItem = () => setItems([...items, {
    id: crypto.randomUUID(),
    produtoId: null,
    descricao: '',
    valorUnitario: 0,
    quantidade: 1,
    descontoPermitido: 0,
    descontoAplicado: 0,
    tipoItem: 'produto',
    calculoAutomatico: false
  }]);

  // Serviços não têm subprodutos - função removida

  const removeItem = (id: string) => {
    const item = items.find(i => i.id === id);

    // Não permitir exclusão do item de decoração - apenas resetar para o estado inicial
    if (item && (
      item.descricao === 'Selecione a decoração clicando aqui' ||
      item.descricao.toLowerCase().includes('decoração') ||
      item.descricao.toLowerCase().includes('decoracao')
    )) {
      // Remover valor original armazenado
      setValoresOriginaisDecoracoes(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Resetar o item de decoração para o estado inicial em vez de remover
      setItems(items.map(i =>
        i.id === id
          ? {
              ...i,
              produtoId: null,
              descricao: 'Selecione a decoração clicando aqui',
              valorUnitario: 0,
              descontoPermitido: 0,
              descontoAplicado: 0,
            }
          : i
      ));
      return;
    }

    setItems(items.filter(i => i.id !== id));
  };
  
  const handleProductSelect = (produto: Produto) => {
    if (!activeItemId) return;

    const targetItem = items.find(i => i.id === activeItemId);

    // Se for um item de decoração, armazenar o valor original
    if (targetItem && isDecoracaoItem(targetItem)) {
      setValoresOriginaisDecoracoes(prev => {
        const newMap = new Map(prev);
        newMap.set(activeItemId, produto.valor);
        return newMap;
      });
    }

    setItems(items.map(item => {
      if (item.id !== activeItemId) return item;
      return {
        ...item,
        produtoId: produto.id,
        descricao: produto.nome,
        valorUnitario: produto.valor,
        descontoPermitido: produto.desconto_percentual || 0,
        descontoAplicado: 0,
        tipoItem: 'produto' as const,
        calculoAutomatico: false
      };
    }));
    setActiveItemId(null);
  };

  const change = useCallback((id: string, field: keyof LinhaItem, value: string | number) => {
    // Limpar mensagem de validação anterior para este item
    setValidationMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    if (field === 'descricao') {
      const updatedItems = items.map(i =>
        i.id === id ? { ...i, descricao: String(value) } : i
      );
      setItems(updatedItems);
      return;
    }

    // Para campo numérico, sempre atualizar o valor sem validação durante a digitação
    const num = value === '' ? 0 : Number(value);
    const updatedItems = items.map(i =>
      i.id === id ? { ...i, [field]: num } : i
    );
    setItems(updatedItems);
  }, [items]);

  // Função para validar apenas quando sair do foco (onBlur)
  const validateOnBlur = useCallback(async (id: string, field: keyof LinhaItem) => {
    const item = items.find(i => i.id === id);
    if (!item || field !== 'valorUnitario' || !isItemEditavel(item)) return;

    const valorAtual = item.valorUnitario;
    const valorMinimo = await obterValorMinimo(id);

    if (valorMinimo > 0 && valorAtual < valorMinimo) {
      // Aplicar valor mínimo automaticamente
      const updatedItems = items.map(i =>
        i.id === id ? { ...i, [field]: valorMinimo } : i
      );
      setItems(updatedItems);

      // Limpar o valor do input para forçar re-render com o novo valor
      setInputValues(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Mostrar mensagem de validação
      setValidationMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(id, `Valor mínimo: R$ ${valorMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        return newMap;
      });

      // Remover mensagem após 3 segundos
      setTimeout(() => {
        setValidationMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }, 3000);
    }
  }, [items, obterValorMinimo]);

  // Função para lidar com mudanças no input
  const handleInputChange = useCallback((id: string, value: string) => {
    // Atualizar valor do input para permitir digitação livre
    setInputValues(prev => {
      const newMap = new Map(prev);
      newMap.set(id, value);
      return newMap;
    });

    // Converter para número e atualizar o item
    const numericValue = parseInputValue(value);
    change(id, 'valorUnitario', numericValue);
  }, [change, parseInputValue]);

  // Função para obter valor do input
  const getInputValue = useCallback((item: LinhaItem): string => {
    const inputValue = inputValues.get(item.id);
    if (inputValue !== undefined) {
      return inputValue;
    }
    return formatCurrency(item.valorUnitario);
  }, [inputValues, formatCurrency]);

  const openProductSearch = (itemId: string) => {
    const targetItem = items.find(i => i.id === itemId);
    
    // Verificar se é o item de decoração para aplicar filtro
    if (targetItem && (
      targetItem.descricao === 'Selecione a decoração clicando aqui' || 
      targetItem.descricao.toLowerCase().includes('decoração') ||
      targetItem.descricao.toLowerCase().includes('decoracao')
    )) {
      setSeguimentoFiltro('decoracao');
    } else {
      setSeguimentoFiltro(null);
    }
    
    setActiveItemId(itemId);
    setIsModalOpen(true);
  }


  const calcularTotal = (item: LinhaItem) => {
    const subtotal = item.valorUnitario * item.quantidade;
    const valorDesconto = subtotal * (item.descontoAplicado / 100);
    const subtotalComDesconto = subtotal - valorDesconto;
    
    // Desconto do cupom individual
    let descontoCupom = 0;
    if (item.cupomAplicado) {
      if (item.cupomAplicado.tipo_desconto === 'percentual') {
        descontoCupom = subtotalComDesconto * (item.cupomAplicado.valor_desconto / 100);
      } else {
        descontoCupom = Math.min(item.cupomAplicado.valor_desconto, subtotalComDesconto);
      }
    }
    
    return subtotalComDesconto - descontoCupom;
  };

  // Função para obter descrição do item com status "Não Contratado" quando aplicável
  const getDescricaoComStatus = (item: LinhaItem): string => {
    const isEstacionamento = item.descricao.toLowerCase().includes('estacionamento');
    if (isEstacionamento && item.valorUnitario === 0) {
      return `${item.descricao} (Não Contratado)`;
    }
    return item.descricao;
  };

  // Função para renderizar uma linha de item
  const renderItemRow = (item: LinhaItem) => {
    const isDecoracaoItem = item.descricao === 'Selecione a decoração clicando aqui' ||
                           item.descricao.toLowerCase().includes('decoração') ||
                           item.descricao.toLowerCase().includes('decoracao');

    const itemEditavel = isItemEditavel(item);

    return (
      <tr key={item.id} className="border-b last:border-0">
        <td className="pl-3 pr-3 py-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Input
                placeholder={item.calculoAutomatico ? "Serviço template (calculado automaticamente)" : "Clique para selecionar um produto..."}
                value={getDescricaoComStatus(item)}
                onClick={() => !item.calculoAutomatico && openProductSearch(item.id)}
                readOnly
                className={`${!item.calculoAutomatico ? 'cursor-pointer' : ''} flex-1`}
              />
            </div>
            {item.cupomAplicado && (
              <Badge variant="secondary" className="text-xs ml-6">
                <Tag className="h-3 w-3 mr-1" />
                {item.cupomAplicado.codigo} - {item.cupomAplicado.tipo_desconto === 'percentual'
                  ? `${item.cupomAplicado.valor_desconto}%`
                  : `R$ ${item.cupomAplicado.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                }
              </Badge>
            )}
          </div>
        </td>
        <td className="px-3 py-1 text-right">
          {itemEditavel ? (
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                <Input
                  type="text"
                  value={getInputValue(item)}
                  onChange={(e) => handleInputChange(item.id, e.target.value)}
                  onBlur={(e) => {
                    // Formatar valor ao sair do campo
                    const numericValue = parseInputValue(e.target.value);
                    if (numericValue > 0) {
                      setInputValues(prev => {
                        const newMap = new Map(prev);
                        newMap.set(item.id, formatCurrency(numericValue));
                        return newMap;
                      });
                    }
                    validateOnBlur(item.id, 'valorUnitario');
                  }}
                  className="w-32 text-sm text-right pl-8"
                  placeholder="0,00"
                />
              </div>
              {validationMessages.has(item.id) && (
                <div className="text-xs text-red-600 font-medium">
                  {validationMessages.get(item.id)}
                </div>
              )}
            </div>
          ) : (
            calcularTotal(item).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
          )}
        </td>
        <td className="text-center">
          <div className="flex items-center gap-1">
            {isDecoracaoItem && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-6 w-6"
                  >
                    <Trash2 className="h-3 w-3 text-orange-500"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Resetar decoração</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <TooltipProvider>
      <div className="border rounded overflow-hidden">
        <div className="bg-zinc-200 dark:bg-zinc-800 text-center font-semibold py-1">{titulo}</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-zinc-100 dark:bg-zinc-900/40">
                <th className="text-left px-3 py-2">Serviço/Produto</th>
                <th className="text-right px-3 py-2 w-32">Valor Total</th>
                <th className="px-1 py-2 w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => renderItemRow(item))}
            </tbody>
          </table>
        </div>
        <div className="p-2 flex justify-end border-t">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Serviço
          </Button>
        </div>
        <SelecaoProdutoModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSelect={handleProductSelect}
          seguimentoFiltro={seguimentoFiltro}
          decoracaoTipo={seguimentoFiltro === 'decoracao' ? 'pacotes' : null}
        />
      </div>
    </TooltipProvider>
  );
}