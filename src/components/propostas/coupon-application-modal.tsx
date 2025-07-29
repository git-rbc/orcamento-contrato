'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calculator, ShoppingCart, Percent } from 'lucide-react';
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

interface CouponApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cupom: CupomDisponivel;
  itensDisponiveis: Array<{
    categoria: string;
    itens: LinhaItem[];
  }>;
  onApplicationSelect: (tipo: 'total' | 'item', itemId?: string) => void;
}

export function CouponApplicationModal({
  open,
  onOpenChange,
  cupom,
  itensDisponiveis,
  onApplicationSelect
}: CouponApplicationModalProps) {
  const [tipoAplicacao, setTipoAplicacao] = useState<'total' | 'item'>('total');
  const [itemSelecionado, setItemSelecionado] = useState<string>('');

  const handleConfirm = () => {
    if (tipoAplicacao === 'total') {
      onApplicationSelect('total');
    } else if (tipoAplicacao === 'item' && itemSelecionado) {
      onApplicationSelect('item', itemSelecionado);
    }
    onOpenChange(false);
  };

  const calcularDesconto = (valor: number) => {
    if (cupom.tipo_desconto === 'percentual') {
      return valor * (cupom.valor_desconto / 100);
    }
    return Math.min(cupom.valor_desconto, valor);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getTotalProposta = () => {
    return itensDisponiveis.reduce((total, categoria) => {
      return total + categoria.itens.reduce((subtotal, item) => {
        const itemTotal = item.valorUnitario * item.quantidade;
        const desconto = itemTotal * (item.descontoAplicado / 100);
        return subtotal + (itemTotal - desconto);
      }, 0);
    }, 0);
  };

  const totalProposta = getTotalProposta();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Aplicar Cupom: {cupom.codigo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cupom */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{cupom.nome}</CardTitle>
              <CardDescription>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {cupom.tipo_desconto === 'percentual' 
                      ? `${cupom.valor_desconto}% de desconto`
                      : `${formatarMoeda(cupom.valor_desconto)} de desconto`
                    }
                  </Badge>
                  {cupom.cliente_especifico && (
                    <Badge variant="outline">Cliente específico</Badge>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Seleção do Tipo de Aplicação */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Como deseja aplicar o cupom?</Label>
            
            <RadioGroup value={tipoAplicacao} onValueChange={(value) => {
              setTipoAplicacao(value as 'total' | 'item');
              setItemSelecionado('');
            }}>
              {/* Aplicar no Total */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="total" id="total" />
                  <Label htmlFor="total" className="font-medium">Aplicar na proposta total</Label>
                </div>
                <Card className={`ml-6 ${tipoAplicacao === 'total' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span>Total da proposta: {formatarMoeda(totalProposta)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Desconto</div>
                        <div className="font-medium text-green-600">
                          -{formatarMoeda(calcularDesconto(totalProposta))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total com desconto:</span>
                        <span>{formatarMoeda(totalProposta - calcularDesconto(totalProposta))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Aplicar em Item Específico */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="item" id="item" />
                  <Label htmlFor="item" className="font-medium">Aplicar em item específico</Label>
                </div>
                
                {tipoAplicacao === 'item' && (
                  <div className="ml-6 space-y-3">
                    {itensDisponiveis.map((categoria) => (
                      <div key={categoria.categoria}>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          {categoria.categoria}
                        </h4>
                        <div className="space-y-2">
                          {categoria.itens.map((item) => {
                            const itemTotal = item.valorUnitario * item.quantidade;
                            const descontoExistente = itemTotal * (item.descontoAplicado / 100);
                            const valorComDesconto = itemTotal - descontoExistente;
                            const descontoCupom = calcularDesconto(valorComDesconto);
                            
                            return (
                              <Card 
                                key={item.id} 
                                className={`cursor-pointer transition-all ${
                                  itemSelecionado === item.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                                }`}
                                onClick={() => setItemSelecionado(item.id)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium">{item.descricao}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {item.quantidade}x {formatarMoeda(item.valorUnitario)}
                                        {item.descontoAplicado > 0 && (
                                          <span className="text-orange-600 ml-2">
                                            (-{item.descontoAplicado}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-muted-foreground">
                                        Total: {formatarMoeda(valorComDesconto)}
                                      </div>
                                      <div className="font-medium text-green-600">
                                        Desconto: -{formatarMoeda(descontoCupom)}
                                      </div>
                                      <div className="font-bold">
                                        Final: {formatarMoeda(valorComDesconto - descontoCupom)}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={tipoAplicacao === 'item' && !itemSelecionado}
            >
              Aplicar Cupom
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}