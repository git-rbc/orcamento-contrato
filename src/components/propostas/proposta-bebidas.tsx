import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Produto } from '@/types/database';
import { SelecaoProdutoModal } from './selecao-produto-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LinhaItem } from './proposta-modal';

interface PropostaSecaoProps {
  items: LinhaItem[];
  setItems: (items: LinhaItem[]) => void;
  titulo: string;
}

export function PropostaBebidas({ items, setItems, titulo }: PropostaSecaoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [showDescontoColumn, setShowDescontoColumn] = useState(false);

  const handleAdd = () => setItems([...items, { id: crypto.randomUUID(), produtoId: null, descricao: '', valorUnitario: 0, quantidade: 1, descontoPermitido: 0, descontoAplicado: 0, tipoItem: 'produto', calculoAutomatico: false }]);
  const handleRemove = (id: string) => setItems(items.filter(i => i.id !== id));
  
  const handleProductSelect = (produto: Produto) => {
    if (!activeItemId) return;
    setItems(items.map(item => {
      if (item.id !== activeItemId) return item;
      return {
        ...item,
        produtoId: produto.id,
        servicoTemplateId: 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', // Serviço genérico para produtos
        descricao: produto.nome,
        valorUnitario: produto.valor,
        descontoPermitido: produto.desconto_percentual || 0,
        descontoAplicado: 0,
      };
    }));
    setActiveItemId(null);
  };

  const handleChange = (id: string, field: keyof LinhaItem, value: string | number) => {
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
    setActiveItemId(itemId);
    setIsModalOpen(true);
  }

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
              {showDescontoColumn && <th className="text-right px-3 py-2 w-32">Desconto (%)</th>}
              <th className="text-right px-3 py-2 w-24">Qtde</th>
              <th className="text-right px-3 py-2 w-32">Valor Total</th>
              <th className="px-1 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-3 py-1">
                  <div className="space-y-1">
                    <Input 
                      placeholder="Clique para selecionar um produto..." 
                      value={item.descricao} 
                      onClick={() => openProductSearch(item.id)}
                      readOnly
                      className="cursor-pointer"
                    />
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
                <td className="px-3 py-1 text-right">
                  <div className="flex items-center gap-1">
                    <Input type="number" value={item.valorUnitario === 0 ? '' : item.valorUnitario} onChange={e=>handleChange(item.id,'valorUnitario', Number(e.target.value))} readOnly={!!item.produtoId} />
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
                </td>
                {showDescontoColumn && (
                  <td className="px-3 py-1 text-right">
                    {item.descontoPermitido > 0 ? (
                      <Select
                        value={String(item.descontoAplicado)}
                        onValueChange={value => handleChange(item.id, 'descontoAplicado', value)}
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
                <td className="px-3 py-1 text-right"><Input type="number" value={item.quantidade === 0 ? '' : item.quantidade} onChange={e=>handleChange(item.id,'quantidade', Number(e.target.value))} /></td>
                <td className="px-3 py-1 text-right">{total(item).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td className="text-center">{items.length>1 && <Button variant="ghost" size="icon" onClick={()=>handleRemove(item.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 flex justify-end border-t">
        <Button variant="outline" size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1"/>Adicionar Item</Button>
      </div>
      <SelecaoProdutoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelect={handleProductSelect}
        seguimentoFiltro="bebidas"
      />
      </div>
    </TooltipProvider>
  );
} 