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
  const [showDescontoColumn, setShowDescontoColumn] = useState(false);
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
  const removeItem = (id: string) => {
    // Não permitir exclusão do item de decoração - apenas resetar para o estado inicial
    const item = items.find(i => i.id === id);
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
              descontoAplicado: 0
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
    const item = items.find(i => i.id === itemId);
    
    // Verificar se é o item de decoração para aplicar filtro
    if (item && (
      item.descricao === 'Selecione a decoração clicando aqui' || 
      item.descricao.toLowerCase().includes('decoração') ||
      item.descricao.toLowerCase().includes('decoracao')
    )) {
      setSeguimentoFiltro('decoracao');
    } else {
      setSeguimentoFiltro(null);
    }
    
    setActiveItemId(itemId);
    setIsModalOpen(true);
  };

  
  const total = (item: LinhaItem) => {
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

  // Verificar se algum item tem desconto permitido
  const hasDescontoPermitido = items.some(item => item.descontoPermitido > 0);

  const discountOptions = [10, 20, 30, 40, 50, 100];

  const getItemIcon = (tipoItem: string) => {
    // Remover todos os ícones
    return null;
  };

  // Função para verificar se um serviço é editável
  const isServiceEditable = (item: LinhaItem) => {
    if (item.tipoItem === 'produto') return true;
    
    const serviceName = item.descricao.toLowerCase();
    const editableServices = [
      'locação',
      'locacao',
      'gerador de energia',
      'gerador',
      'tx. ecad',
      'ecad',
      'decoração',
      'decoracao',
      'selecione a decoração'
    ];
    
    return editableServices.some(service => serviceName.includes(service));
  };

  // Função para verificar se deve mostrar coluna quantidade
  const shouldShowQuantityColumn = () => {
    return false; // Esconder campos de quantidade
  };

  const getItemPlaceholder = (tipoItem: string) => {
    switch (tipoItem) {
      case 'servico':
        return 'Serviço template (calculado automaticamente)';
      default:
        return 'Clique para selecionar um produto...';
    }
  };

  const handleItemClick = (item: LinhaItem) => {
    if (item.tipoItem === 'produto') {
      openProductSearch(item.id);
    }
    // Serviços não são clicáveis (calculados automaticamente)
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
              {showDescontoColumn && <th className="text-right px-3 py-2 w-32">Desconto (%)</th>}
              {shouldShowQuantityColumn() && <th className="text-right px-3 py-2 w-24">Qtde</th>}
              <th className="text-right px-3 py-2 w-32">Valor Total</th>
              <th className="px-1 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-3 py-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder={getItemPlaceholder(item.tipoItem)}
                        value={item.descricao} 
                        onClick={() => handleItemClick(item)}
                        readOnly
                        className="cursor-pointer flex-1"
                      />
                      {item.descontoPermitido > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="text-xs h-8 px-2"
                              onClick={() => setShowDescontoColumn(!showDescontoColumn)}
                            >
                              +
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{showDescontoColumn ? 'Ocultar coluna de desconto' : 'Mostrar coluna de desconto'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {item.cupomAplicado && (
                      <Badge variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {item.cupomAplicado.codigo} - {item.cupomAplicado.tipo_desconto === 'percentual' 
                          ? `${item.cupomAplicado.valor_desconto}%` 
                          : `R$ ${item.cupomAplicado.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                      </Badge>
                    )}
                  </div>
                </td>
                {showDescontoColumn && (
                  <td className="px-3 py-1 text-right">
                    {item.descontoPermitido > 0 ? (
                      <Select
                        value={String(item.descontoAplicado)}
                        onValueChange={value => change(item.id, 'descontoAplicado', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="0%" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          {discountOptions.map(d => 
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
                {shouldShowQuantityColumn() && (
                  <td className="px-3 py-1 text-right">
                    {isServiceEditable(item) ? (
                      <Input 
                        type="number" 
                        value={item.quantidade === 0 ? '' : item.quantidade}
                        onChange={e => change(item.id, 'quantidade', Number(e.target.value))}
                        readOnly={item.calculoAutomatico && item.tipoCalculo === 'valor_fixo_ambiente'}
                        className=""
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm text-center">-</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-1 text-right">{total(item).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td className="text-center">
                  {items.length > 1 && !item.calculoAutomatico && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-500"/>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-end border-t">
        <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1"/>Adicionar Serviço</Button>
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