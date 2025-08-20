import { LinhaItem } from '@/components/propostas/proposta-modal';

interface RolhaValues {
  vinho: string;
  destilado: string;
  energetico: string;
  chopp: string;
}

interface ResumoPropostaProps {
  proposta: {
    itens_alimentacao: LinhaItem[];
    itens_bebidas: LinhaItem[];
    itens_servicos: LinhaItem[];
    itens_extras: LinhaItem[];
    rolha_vinho: string;
    rolha_destilado: string;
    rolha_energetico: string;
    rolha_chopp: string;
    total_proposta: number;
    valor_desconto?: number;
    valor_entrada?: number;
  };
  contratoValidoPara?: string;
}

export function ResumoPropostaContrato({ proposta, contratoValidoPara = 'Sábado' }: ResumoPropostaProps) {
  
  // Função para formatar valores de rolha
  const formatarValorRolha = (valor: string): string => {
    if (valor === 'ISENTA') return 'Isenta';
    return valor;
  };

  // Função para calcular subtotal de uma categoria (incluindo subprodutos)
  const calcularSubtotalCategoria = (itens: LinhaItem[]): number => {
    return itens.reduce((acc, item) => {
      if (item.valorUnitario > 0 && item.quantidade > 0) {
        // Calcular valor do item principal
        const itemTotal = item.valorUnitario * item.quantidade;
        const desconto = itemTotal * (item.descontoAplicado || 0) / 100;
        let descontoCupom = 0;
        
        if (item.cupomAplicado) {
          if (item.cupomAplicado.tipo_desconto === 'percentual') {
            descontoCupom = (itemTotal - desconto) * (item.cupomAplicado.valor_desconto / 100);
          } else {
            descontoCupom = Math.min(item.cupomAplicado.valor_desconto, itemTotal - desconto);
          }
        }
        
        const totalPrincipal = itemTotal - desconto - descontoCupom;
        
        // Calcular total dos subprodutos recursivamente
        const totalSubprodutos = (item.subprodutos || []).reduce((subAcc, subproduto) => {
          return subAcc + calcularSubtotalCategoria([subproduto]);
        }, 0);
        
        return acc + totalPrincipal + totalSubprodutos;
      }
      return acc;
    }, 0);
  };

  // Função para renderizar itens de uma categoria (incluindo subprodutos)
  const renderizarItensCategoria = (itens: LinhaItem[], categoria: string) => {
    const itensValidos = itens.filter(item => item.valorUnitario > 0 && item.quantidade > 0);
    
    if (itensValidos.length === 0) return null;

    const subtotal = calcularSubtotalCategoria(itensValidos);

    // Função para renderizar um item individual (principal ou subproduto)
    const renderizarItem = (item: LinhaItem, isSubproduto: boolean = false, itemIndex: number | string) => {
      const itemTotal = item.valorUnitario * item.quantidade;
      const desconto = itemTotal * (item.descontoAplicado || 0) / 100;
      let descontoCupom = 0;
      
      if (item.cupomAplicado) {
        if (item.cupomAplicado.tipo_desconto === 'percentual') {
          descontoCupom = (itemTotal - desconto) * (item.cupomAplicado.valor_desconto / 100);
        } else {
          descontoCupom = Math.min(item.cupomAplicado.valor_desconto, itemTotal - desconto);
        }
      }
      
      const valorItemSozinho = itemTotal - desconto - descontoCupom;
      
      // Para item principal, mostrar valor total incluindo subprodutos
      // Para subproduto, mostrar apenas valor do subproduto
      const valorTotalComSubprodutos = isSubproduto ? valorItemSozinho : calcularSubtotalCategoria([item]);

      return (
        <div key={`${itemIndex}-${isSubproduto ? 'sub' : 'main'}`} className={`px-3 py-2 border-b border-gray-200 flex justify-between items-center text-sm ${isSubproduto ? 'bg-gray-50' : ''}`}>
          <div className="flex-1" style={{ paddingLeft: isSubproduto ? '2rem' : '0' }}>
            <div className="flex items-center">
              {isSubproduto && (
                <div className="w-4 h-0.5 bg-gray-400 mr-2"></div>
              )}
              <div className="font-medium">{item.descricao}</div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Qtd: {item.quantidade} x {item.valorUnitario.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            </div>
            {item.descontoAplicado > 0 && (
              <div className="text-xs text-gray-600">
                Desconto: {item.descontoAplicado}%
              </div>
            )}
            {item.cupomAplicado && (
              <div className="text-xs text-green-600">
                Cupom: {item.cupomAplicado.codigo} 
                {item.cupomAplicado.tipo_desconto === 'percentual' 
                  ? ` (${item.cupomAplicado.valor_desconto}%)`
                  : ` (${item.cupomAplicado.valor_desconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})`
                }
              </div>
            )}
          </div>
          <div className="flex gap-8">
            <span className="w-20 text-right">
              {item.valorUnitario.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            </span>
            <span className="w-20 text-right font-medium">
              {valorTotalComSubprodutos.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="mb-4">
        <div className="bg-amber-100 px-3 py-2 border-b">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">{categoria}</h3>
            <div className="flex gap-8">
              <span className="font-medium text-sm">Valor Unitário</span>
              <span className="font-medium text-sm">Valor Total</span>
            </div>
          </div>
        </div>
        
        {itensValidos.map((item, index) => (
          <div key={index}>
            {renderizarItem(item, false, index)}
            {/* Renderizar subprodutos se existirem */}
            {item.subprodutos && item.subprodutos.length > 0 && 
              item.subprodutos
                .filter(sub => sub.valorUnitario > 0 && sub.quantidade > 0)
                .map((subproduto, subIndex) => 
                  renderizarItem(subproduto, true, `${index}-${subIndex}`)
                )
            }
          </div>
        ))}
        
        <div className="px-3 py-3 bg-gray-100 font-semibold flex justify-between">
          <span>Subtotal {categoria}:</span>
          <span>{subtotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
        </div>
      </div>
    );
  };

  // Calcular totais
  const totalAlimentacao = calcularSubtotalCategoria(proposta.itens_alimentacao);
  const totalBebidas = calcularSubtotalCategoria(proposta.itens_bebidas);
  const totalServicos = calcularSubtotalCategoria(proposta.itens_servicos);
  const totalItensExtras = calcularSubtotalCategoria(proposta.itens_extras);
  
  // Calcular rolhas
  const parseRolhaValue = (value: string): number => {
    if (!value || value === 'ISENTA') return 0;
    try {
      const cleanValue = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
      const numericValue = parseFloat(cleanValue);
      return isNaN(numericValue) ? 0 : Math.max(0, numericValue);
    } catch {
      return 0;
    }
  };
  
  const valorRolhas = parseRolhaValue(proposta.rolha_vinho) + 
                      parseRolhaValue(proposta.rolha_destilado) + 
                      parseRolhaValue(proposta.rolha_energetico) + 
                      parseRolhaValue(proposta.rolha_chopp);

  const subtotalGeral = totalAlimentacao + totalBebidas + totalServicos + totalItensExtras + valorRolhas;
  const desconto = proposta.valor_desconto || 0;
  const entrada = proposta.valor_entrada || 0;
  const totalFinal = subtotalGeral - desconto - entrada;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-gray-300">
      {/* Cabeçalho */}
      <div className="bg-gray-700 text-white text-center py-3">
        <h2 className="text-xl font-bold">Resumo de Valores</h2>
      </div>
      
      <div className="p-4">
        <div className="mb-4 text-sm">
          <span className="font-medium">Contrato válido para:</span> {contratoValidoPara}
        </div>

        {/* Alimentação */}
        {renderizarItensCategoria(proposta.itens_alimentacao, 'Alimentação')}

        {/* Bebidas */}
        {renderizarItensCategoria(proposta.itens_bebidas, 'Bebidas')}

        {/* Serviços */}
        {renderizarItensCategoria(proposta.itens_servicos, 'Serviços')}

        {/* Itens Extras */}
        {renderizarItensCategoria(proposta.itens_extras, 'Itens Extras')}

        {/* Rolhas */}
        {valorRolhas > 0 && (
          <div className="mb-4">
            <div className="bg-amber-100 px-3 py-2 border-b">
              <h3 className="font-semibold text-lg">Rolhas</h3>
            </div>
            <div className="bg-amber-50 px-3 py-2 border-b">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Rolha Vinho/Esp.</span>
                  <span>{formatarValorRolha(proposta.rolha_vinho)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rolha Energet.</span>
                  <span>{formatarValorRolha(proposta.rolha_energetico)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rolha Destilado</span>
                  <span>{formatarValorRolha(proposta.rolha_destilado)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rolha Chopp</span>
                  <span>{formatarValorRolha(proposta.rolha_chopp)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-amber-100 text-center py-4 mt-4">
          <div className="text-xl font-bold mb-2">Total À vista</div>
          
          {/* Breakdown dos valores */}
          <div className="text-sm space-y-1 mb-3">
            <div>Subtotal: {subtotalGeral.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            
            {desconto > 0 && (
              <div className="text-green-600">
                Desconto: -{desconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </div>
            )}
            
            {entrada > 0 && (
              <div className="text-blue-600">
                Entrada: -{entrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </div>
            )}
          </div>
          
          <div className="text-2xl font-extrabold">
            {entrada > 0 ? 'Valor restante: ' : ''}
            {Math.max(0, totalFinal).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
          </div>
          <div className="text-sm italic mt-1">
            {entrada > 0 ? '(Valor restante a pagar)' : '(Consulte valor parcelado)'}
          </div>
        </div>
      </div>
    </div>
  );
}