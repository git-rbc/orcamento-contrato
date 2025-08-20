import { useState } from 'react';
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

  const change = (id: string, field: keyof LinhaItem, value: string | number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      if (field === 'descricao') {
        return { ...i, descricao: String(value) };
      }
      const num = value === '' ? 0 : Number(value);
      return { ...i, [field]: num };
    }));
  };

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

  // Função para renderizar uma linha de item
  const renderItemRow = (item: LinhaItem) => {
    const isDecoracaoItem = item.descricao === 'Selecione a decoração clicando aqui' || 
                           item.descricao.toLowerCase().includes('decoração') ||
                           item.descricao.toLowerCase().includes('decoracao');
    
    return (
      <tr key={item.id} className="border-b last:border-0">
        <td className="pl-3 pr-3 py-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Input 
                placeholder={item.calculoAutomatico ? "Serviço template (calculado automaticamente)" : "Clique para selecionar um produto..."} 
                value={item.descricao} 
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
          {calcularTotal(item).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
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
        />
      </div>
    </TooltipProvider>
  );
}