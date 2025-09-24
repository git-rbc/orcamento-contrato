import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { CouponApplicationModal } from './coupon-application-modal';
import { LinhaItem } from './proposta-modal';


interface CupomDisponivel {
  id: string;
  codigo: string;
  nome: string;
  tipo_desconto: 'percentual' | 'valor_fixo';
  valor_desconto: number;
  cliente_especifico?: string;
  formatDisplay: string;
}

interface PropostaResumoProps {
  totalProposta: number; // Total bruto (antes da entrada)
  totalLiquido?: number; // Total líquido (após entrada)
  valorEntrada?: number; // Valor da entrada
  clienteId?: string;
  onDescontoChange?: (desconto: number) => void;
  itensDisponiveis?: Array<{
    categoria: string;
    itens: LinhaItem[];
  }>;
  onItemCupomChange?: (itemId: string, cupom: CupomDisponivel | null) => void;
}

export function PropostaResumo({
  totalProposta,
  totalLiquido,
  valorEntrada = 0,
  clienteId,
  onDescontoChange,
  itensDisponiveis = [],
  onItemCupomChange
}: PropostaResumoProps) {
  // States para cupom
  const [cupomSelecionado, setCupomSelecionado] = useState<CupomDisponivel | null>(null);
  const [cupomSearch, setCupomSearch] = useState('');
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState<CupomDisponivel[]>([]);
  const [cupomLoading, setCupomLoading] = useState(false);
  const [valorDesconto, setValorDesconto] = useState(0);
  
  // States para modal de aplicação de cupom
  const [cupomParaAplicar, setCupomParaAplicar] = useState<CupomDisponivel | null>(null);
  const [modalAplicacaoAberto, setModalAplicacaoAberto] = useState(false);


  // Função para buscar cupons disponíveis
  useEffect(() => {
    const fetchCupons = async () => {
      if (cupomSearch.length < 1) {
        setCuponsDisponiveis([]);
        return;
      }

      setCupomLoading(true);
      try {
        const params = new URLSearchParams({
          q: cupomSearch,
          valor_total: totalProposta.toString()
        });

        if (clienteId) {
          params.set('cliente_id', clienteId);
        }

        const response = await fetch(`/api/cupons/disponivel?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Erro ao buscar cupons');
        }

        const data = await response.json();
        setCuponsDisponiveis(data);
      } catch (error) {
        console.error('Erro ao buscar cupons:', error);
        setCuponsDisponiveis([]);
      } finally {
        setCupomLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchCupons();
    }, 300);

    return () => clearTimeout(debounce);
  }, [cupomSearch, totalProposta, clienteId]);

  // Função para aplicar cupom
  const handleCupomSelect = (cupom: CupomDisponivel | null) => {
    if (cupom && itensDisponiveis.length > 0) {
      // Se há itens disponíveis, abrir modal para escolher onde aplicar
      setCupomParaAplicar(cupom);
      setModalAplicacaoAberto(true);
    } else if (cupom) {
      // Aplicar diretamente no total se não há itens ou se é compatibilidade anterior
      aplicarCupomTotal(cupom);
    } else {
      // Remover cupom
      setCupomSelecionado(null);
      setValorDesconto(0);
      onDescontoChange?.(0);
    }
  };

  const aplicarCupomTotal = (cupom: CupomDisponivel) => {
    setCupomSelecionado(cupom);
    
    let desconto = 0;
    
    if (cupom.tipo_desconto === 'percentual') {
      // Validar percentual (máximo 100%)
      const percentualValidado = Math.min(100, Math.max(0, cupom.valor_desconto || 0));
      desconto = totalProposta * (percentualValidado / 100);
    } else {
      // Validar valor fixo (não negativo)
      const valorValidado = Math.max(0, cupom.valor_desconto || 0);
      desconto = Math.min(valorValidado, totalProposta);
    }
    
    // Garantir que o desconto não seja maior que o total
    desconto = Math.min(desconto, totalProposta);
    desconto = Math.max(0, desconto);
    
    setValorDesconto(desconto);
    onDescontoChange?.(desconto);
    
    toast.success(`Cupom "${cupom.codigo}" aplicado ao total da proposta!`);
  };

  const handleApplicationSelect = (tipo: 'total' | 'item', itemId?: string) => {
    if (!cupomParaAplicar) return;

    if (tipo === 'total') {
      aplicarCupomTotal(cupomParaAplicar);
    } else if (tipo === 'item' && itemId && onItemCupomChange) {
      onItemCupomChange(itemId, cupomParaAplicar);
      toast.success('Cupom aplicado ao item selecionado!');
    }

    setCupomParaAplicar(null);
  };

  // Função para remover cupom
  const removeCupom = () => {
    setCupomSelecionado(null);
    setValorDesconto(0);
    onDescontoChange?.(0);
    setCupomSearch('');
  };

  const totalComDesconto = totalProposta - valorDesconto;
  const totalFinalComEntrada = totalComDesconto - valorEntrada;

  return (
    <div className="border rounded overflow-hidden">
      {/* Cupom */}
      <div className="p-4 border-b space-y-2">
        <label className="font-medium text-sm">Cupom de Desconto</label>
        
        {cupomSelecionado ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="flex items-center justify-between p-2">
              <span className="flex-1">
                <strong>{cupomSelecionado.codigo}</strong> - {cupomSelecionado.nome}
                {cupomSelecionado.cliente_especifico && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Cliente: {cupomSelecionado.cliente_especifico})
                  </span>
                )}
              </span>
              <button 
                onClick={removeCupom}
                className="ml-2 text-muted-foreground hover:text-destructive"
              >
                <X size={14} />
              </button>
            </Badge>
            <div className="text-sm text-green-600 font-medium">
              Desconto aplicado: -{valorDesconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              {cupomSelecionado.tipo_desconto === 'percentual' && (
                <span className="text-muted-foreground ml-1">({cupomSelecionado.valor_desconto}%)</span>
              )}
            </div>
          </div>
        ) : (
          <ComboboxSearch
            placeholder="Digite o código do cupom..."
            searchPlaceholder="Buscar cupons..."
            emptyText="Nenhum cupom encontrado."
            value=""
            onSelect={(item) => handleCupomSelect(item as CupomDisponivel)}
            items={cuponsDisponiveis}
            loading={cupomLoading}
            inputValue={cupomSearch}
            onInputChange={setCupomSearch}
            formatDisplay={(item) => (item as CupomDisponivel).formatDisplay}
          />
        )}
      </div>


      {/* Total à vista */}
      <div className="bg-zinc-200 dark:bg-zinc-800 text-center py-6 space-y-2">
        <div className="text-xl font-bold">Total À vista</div>
        
        {/* Valor original */}
        <div className="text-lg text-muted-foreground">
          Subtotal: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
        </div>

        {/* Desconto de cupom */}
        {valorDesconto > 0 && (
          <div className="text-sm text-green-600 font-medium">
            Desconto: -{valorDesconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            {cupomSelecionado?.tipo_desconto === 'percentual' && (
              <span className="text-muted-foreground ml-1">({cupomSelecionado.valor_desconto}%)</span>
            )}
          </div>
        )}

        {/* Entrada */}
        {valorEntrada > 0 && (
          <div className="text-sm text-blue-600 font-medium">
            Entrada: -{valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
          </div>
        )}

        {/* Total final */}
        <div className="text-2xl font-extrabold">
          {Math.max(0, totalFinalComEntrada).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
        </div>
        <div className="text-sm italic">
          {valorEntrada > 0 ? '(Valor restante a pagar)' : '(Consulte valor parcelado)'}
        </div>
      </div>

      {/* Observação */}
      <div className="p-4 text-center text-xs text-muted-foreground">
        *Proposta válida exclusivamente até término da reunião de atendimento
      </div>

      {/* Modal de Aplicação de Cupom */}
      {cupomParaAplicar && (
        <CouponApplicationModal
          open={modalAplicacaoAberto}
          onOpenChange={setModalAplicacaoAberto}
          cupom={cupomParaAplicar}
          itensDisponiveis={itensDisponiveis}
          onApplicationSelect={handleApplicationSelect}
        />
      )}
    </div>
  );
} 