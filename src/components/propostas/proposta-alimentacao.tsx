import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Produto } from '@/types/database';
import { SelecaoProdutoModal } from './selecao-produto-modal';
import { SubprodutoSelectModal } from '@/components/subprodutos/subproduto-select-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LinhaItem } from './proposta-modal';

interface PropostaSecaoProps {
  items: LinhaItem[];
  setItems: React.Dispatch<React.SetStateAction<LinhaItem[]>>;
  titulo: string;
  numPessoas?: number; // Número de convidados para calcular quantidade automaticamente
}

export function PropostaAlimentacao({ items, setItems, titulo, numPessoas }: PropostaSecaoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubprodutoModalOpen, setIsSubprodutoModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeParentProductId, setActiveParentProductId] = useState<string | null>(null);
  const [itemsComDescontoVisivel, setItensComDescontoVisivel] = useState<Set<string>>(new Set());
  const [produtosVinculados, setProdutosVinculados] = useState<Set<string>>(new Set());

  // Função auxiliar para verificar se um produto está vinculado aos convidados
  const isProdutoVinculadoConvidados = async (produtoId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [produtoId] })
      });

      if (response.ok) {
        const result = await response.json();
        const produto = result.data?.[0];
        return produto?.vinculado_convidados === true;
      }
    } catch (error) {
      console.error('Erro ao verificar produto:', error);
    }
    return false;
  };

  // Atualizar quantidades automaticamente quando numPessoas mudar
  useEffect(() => {
    if (!numPessoas || produtosVinculados.size === 0) return;

    setItems(prevItems => prevItems.map(item => {
      let updatedItem = { ...item };

      // Verificar item principal
      if (item.produtoId && produtosVinculados.has(item.produtoId)) {
        updatedItem.quantidade = numPessoas;
      }

      // Verificar subprodutos
      if (item.subprodutos) {
        updatedItem.subprodutos = item.subprodutos.map(subproduto => ({
          ...subproduto,
          quantidade: subproduto.produtoId && produtosVinculados.has(subproduto.produtoId)
            ? numPessoas
            : subproduto.quantidade
        }));
      }

      return updatedItem;
    }));
  }, [numPessoas, produtosVinculados]);

  const handleAddItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      produtoId: null,
      descricao: '',
      valorUnitario: 0,
      quantidade: 1,
      descontoPermitido: 0,
      descontoAplicado: 0,
      tipoItem: 'produto',
      calculoAutomatico: false,
      subprodutos: []
    }]);
  };

  const handleAddSubproduto = (parentId: string) => {
    // Encontrar o item pai para obter o produtoId
    const parentItem = items.find(item => item.id === parentId);
    if (!parentItem || !parentItem.produtoId) {
      alert('Selecione um produto principal primeiro');
      return;
    }

    setActiveItemId(parentId);
    setActiveParentProductId(parentItem.produtoId);
    setIsSubprodutoModalOpen(true);
  };

  const handleRemoveItem = (id: string) => {
    // Verificar se é um item principal
    const isMainItem = items.some(item => item.id === id);

    if (isMainItem) {
      setItems(items.filter(item => item.id !== id));
    } else {
      // É um subproduto
      setItems(items.map(item => ({
        ...item,
        subprodutos: item.subprodutos?.filter(sub => sub.id !== id) || []
      })));
    }
  };

  const handleProductSelect = (produto: Produto) => {
    if (!activeItemId) return;

    // Calcular quantidade baseada na configuração do produto
    const quantidade = produto.vinculado_convidados && numPessoas ? numPessoas : 1;

    // Atualizar estado de produtos vinculados
    if (produto.vinculado_convidados) {
      setProdutosVinculados(prev => new Set(prev).add(produto.id));
    }

    setItems(items.map(item => {
      // Verificar se é o item principal
      if (item.id === activeItemId) {
        return {
          ...item,
          produtoId: produto.id,
          servicoTemplateId: 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
          descricao: produto.nome,
          valorUnitario: produto.valor,
          quantidade,
          descontoPermitido: produto.desconto_percentual || 0,
          descontoAplicado: 0,
        };
      }

      // Verificar subprodutos
      if (item.subprodutos && item.subprodutos.length > 0) {
        const subprodutosAtualizados = item.subprodutos.map(sub => {
          if (sub.id === activeItemId) {
            return {
              ...sub,
              produtoId: produto.id,
              servicoTemplateId: 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
              descricao: produto.nome,
              valorUnitario: produto.valor,
              quantidade,
              descontoPermitido: produto.desconto_percentual || 0,
              descontoAplicado: 0,
            };
          }
          return sub;
        });

        return { ...item, subprodutos: subprodutosAtualizados };
      }

      return item;
    }));

    setActiveItemId(null);
  };

  const handleSubprodutoSelect = (subproduto: any) => {
    if (!activeItemId) return;

    setItems(items.map(item => {
      if (item.id === activeItemId) {
        const novoSubproduto: LinhaItem = {
          id: crypto.randomUUID(),
          produtoId: subproduto.id,
          servicoTemplateId: 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
          descricao: subproduto.nome,
          valorUnitario: subproduto.valor,
          quantidade: 1,
          descontoPermitido: 0,
          descontoAplicado: 0,
          tipoItem: 'produto',
          calculoAutomatico: false,
          isSubproduto: true,
          parentId: activeItemId,
          subprodutos: []
        };

        return {
          ...item,
          subprodutos: [...(item.subprodutos || []), novoSubproduto]
        };
      }
      return item;
    }));

    setActiveItemId(null);
    setActiveParentProductId(null);
  };

  const handleChange = (id: string, field: keyof LinhaItem, value: string | number) => {
    setItems(items.map(item => {
      // Verificar se é o item principal
      if (item.id === id) {
        if (field === 'descricao') {
          return { ...item, [field]: String(value) };
        }
        const num = value === '' ? 0 : Number(value);
        return { ...item, [field]: num };
      }

      // Verificar subprodutos
      if (item.subprodutos && item.subprodutos.length > 0) {
        const subprodutosAtualizados = item.subprodutos.map(sub => {
          if (sub.id === id) {
            if (field === 'descricao') {
              return { ...sub, [field]: String(value) };
            }
            const num = value === '' ? 0 : Number(value);
            return { ...sub, [field]: num };
          }
          return sub;
        });

        return { ...item, subprodutos: subprodutosAtualizados };
      }

      return item;
    }));
  };

  const openProductSearch = (itemId: string) => {
    setActiveItemId(itemId);
    setIsModalOpen(true);
  }

  const calcularTotalComSubprodutos = (item: LinhaItem): number => {
    // Calcular total do item principal
    const subtotalPrincipal = item.valorUnitario * item.quantidade;
    const descontoPrincipal = subtotalPrincipal * (item.descontoAplicado / 100);
    const totalPrincipal = subtotalPrincipal - descontoPrincipal;

    // Aplicar desconto do cupom no item principal
    let descontoCupomPrincipal = 0;
    if (item.cupomAplicado && totalPrincipal > 0) {
      if (item.cupomAplicado.tipo_desconto === 'percentual') {
        descontoCupomPrincipal = totalPrincipal * (item.cupomAplicado.valor_desconto / 100);
      } else {
        descontoCupomPrincipal = Math.min(item.cupomAplicado.valor_desconto, totalPrincipal);
      }
    }

    const totalPrincipalFinal = Math.max(0, totalPrincipal - descontoCupomPrincipal);

    // Calcular total dos subprodutos recursivamente
    const totalSubprodutos = (item.subprodutos || []).reduce((acc, subproduto) => {
      return acc + calcularTotalComSubprodutos(subproduto);
    }, 0);

    return totalPrincipalFinal + totalSubprodutos;
  };

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

  // Função para renderizar uma linha de item (principal ou subproduto)
  const renderItemRow = (item: LinhaItem, isSubproduto = false) => {
    const paddingLeft = isSubproduto ? 'pl-8' : 'pl-3';
    const backgroundColor = isSubproduto ? 'bg-muted/30' : '';

    return (
      <tr key={item.id} className={`border-b last:border-0 ${backgroundColor}`}>
        <td className={`${paddingLeft} pr-3 py-1`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isSubproduto && <div className="w-4 h-0.5 bg-muted-foreground"></div>}
              <Input
                placeholder="Clique para selecionar um produto..."
                value={item.descricao}
                onClick={() => openProductSearch(item.id)}
                readOnly
                className="cursor-pointer flex-1"
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
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={item.valorUnitario === 0 ? '' : item.valorUnitario}
              onChange={e => handleChange(item.id,'valorUnitario', Number(e.target.value))}
              readOnly={!!item.produtoId}
            />
            {item.descontoPermitido > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2"
                    onClick={() => {
                      const newSet = new Set(itemsComDescontoVisivel);
                      if (newSet.has(item.id)) {
                        newSet.delete(item.id);
                      } else {
                        newSet.add(item.id);
                      }
                      setItensComDescontoVisivel(newSet);
                    }}
                  >
                    +
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{itemsComDescontoVisivel.has(item.id) ? 'Ocultar desconto deste item' : 'Mostrar desconto deste item'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </td>
        {itemsComDescontoVisivel.size > 0 && (
          <td className="pr-1 pl-3 py-1 text-right">
            {itemsComDescontoVisivel.has(item.id) && item.descontoPermitido > 0 ? (
              <Select
                value={String(item.descontoAplicado)}
                onValueChange={value => handleChange(item.id, 'descontoAplicado', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="0%" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  {[10, 20, 30, 40, 50, 100].map(d =>
                    d <= item.descontoPermitido && (
                      <SelectItem key={d} value={String(d)}>{d}%</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </td>
        )}
        {itemsComDescontoVisivel.size > 0 && (
          <td className="pl-1 pr-3 py-1 text-right">
            {itemsComDescontoVisivel.has(item.id) && item.descontoPermitido > 0 && item.descontoAplicado > 0 ? (
              <span className="text-sm font-medium text-red-600">
                -{(item.valorUnitario * item.quantidade * (item.descontoAplicado / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </td>
        )}
        <td className="px-3 py-1 text-center">
          <Input
            type="number"
            value={item.quantidade === 0 ? '' : item.quantidade}
            onChange={e => handleChange(item.id, 'quantidade', Number(e.target.value))}
            className="text-center"
            readOnly={item.produtoId ? produtosVinculados.has(item.produtoId) : false}
            title={item.produtoId && produtosVinculados.has(item.produtoId)
              ? 'Quantidade vinculada ao número de convidados'
              : undefined
            }
          />
        </td>
        <td className="px-3 py-1 text-right">
          {isSubproduto
            ? calcularTotal(item).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
            : calcularTotalComSubprodutos(item).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
          }
        </td>
        <td className="text-center">
          <div className="flex items-center gap-1">
            {!isSubproduto && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAddSubproduto(item.id)}
                    className="h-6 w-6"
                  >
                    <Plus className="h-3 w-3 text-green-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adicionar subproduto</p>
                </TooltipContent>
              </Tooltip>
            )}
            {(items.length > 1 || isSubproduto) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(item.id)}
                className="h-6 w-6"
              >
                <Trash2 className="h-3 w-3 text-red-500"/>
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Verificar se algum item tem desconto permitido
  const getAllItems = () => {
    const allItems: LinhaItem[] = [];
    items.forEach(item => {
      allItems.push(item);
      if (item.subprodutos) {
        allItems.push(...item.subprodutos);
      }
    });
    return allItems;
  };

  const hasDescontoPermitido = getAllItems().some(item => item.descontoPermitido > 0);

  return (
    <TooltipProvider>
      <div className="border rounded overflow-hidden">
        <div className="bg-zinc-200 dark:bg-zinc-800 text-center font-semibold py-1">{titulo}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-zinc-100 dark:bg-zinc-900/40">
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2 w-32">Valor Unitário</th>
              {itemsComDescontoVisivel.size > 0 && <th className="text-right px-3 py-2 w-32">Desconto (%)</th>}
              {itemsComDescontoVisivel.size > 0 && <th className="text-right px-1 py-2 w-32"></th>}
              <th className="text-right px-3 py-2 w-24">Qtde</th>
              <th className="text-right px-3 py-2 w-32">Valor Total</th>
              <th className="px-1 py-2 w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <React.Fragment key={item.id}>
                {renderItemRow(item, false)}
                {item.subprodutos && item.subprodutos.map(subproduto =>
                  renderItemRow(subproduto, true)
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-end border-t">
        <Button variant="outline" size="sm" onClick={handleAddItem}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Item
        </Button>
      </div>
      <SelecaoProdutoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelect={handleProductSelect}
        seguimentoFiltro="alimentos"
      />

      {activeParentProductId && (
        <SubprodutoSelectModal
          open={isSubprodutoModalOpen}
          onOpenChange={setIsSubprodutoModalOpen}
          onSelect={handleSubprodutoSelect}
          parentProductId={activeParentProductId}
        />
      )}
      </div>
    </TooltipProvider>
  );
}