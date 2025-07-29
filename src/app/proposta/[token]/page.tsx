'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, Users, DollarSign, MapPin, Clock, RefreshCw, CreditCard, FileText, Banknote, Info } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Proposta {
  id: string;
  codigo_reuniao?: string;
  cliente: {
    nome: string;
    email: string;
    telefone?: string;
  };
  espaco?: {
    nome: string;
  };
  data_realizacao?: string;
  num_pessoas?: number;
  total_proposta: number;
  valor_entrada?: number;
  status: string;
  itens_alimentacao?: any[];
  itens_bebidas?: any[];
  itens_servicos?: any[];
  itens_extras?: any[];
  rolha_vinho?: string;
  rolha_destilado?: string;
  rolha_energetico?: string;
  rolha_chopp?: string;
  created_at: string;
  // Condições de pagamento
  modelo_pagamento?: string;
  reajuste?: string;
  juros?: number;
  data_entrada?: string;
  forma_pagamento_entrada?: string;
  qtd_meses?: number;
  dia_vencimento?: number;
  forma_saldo_final?: string;
  entrada?: string;
  negociacao?: string;
  clausulas_adicionais?: string;
  observacao_financeiro?: string;
}

export default function PropostaPublicaPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarProposta();
  }, [token]);

  const carregarProposta = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proposta/publica/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setErro('Proposta não encontrada ou link inválido.');
        } else {
          setErro('Erro ao carregar proposta.');
        }
        return;
      }
      
      const result = await response.json();
      setProposta(result.data);
    } catch (error) {
      console.error('Erro ao carregar proposta:', error);
      setErro('Erro ao carregar proposta.');
    } finally {
      setLoading(false);
    }
  };

  const handleResposta = async (aprovada: boolean) => {
    if (!proposta) return;
    
    try {
      setProcessando(true);
      
      const response = await fetch(`/api/proposta/publica/${token}/resposta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aprovada }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar resposta');
      }

      const result = await response.json();
      
      // Atualizar proposta localmente
      setProposta(prev => prev ? { ...prev, status: aprovada ? 'aceita' : 'recusada' } : null);
      
      toast.success(
        aprovada 
          ? 'Proposta aprovada com sucesso! Entraremos em contato em breve.' 
          : 'Resposta enviada. Obrigado pelo retorno!'
      );
      
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar resposta');
    } finally {
      setProcessando(false);
    }
  };

  const calcularSubtotal = (items: any[]) => {
    if (!items) return 0;
    return items.reduce((acc, item) => {
      const quantidade = item.quantidade || 0;
      const valorUnitario = item.valorUnitario || 0;
      const itemTotal = valorUnitario * quantidade;
      const desconto = itemTotal * ((item.descontoAplicado || 0) / 100);
      return acc + (itemTotal - desconto);
    }, 0);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ops!</h2>
            <p className="text-muted-foreground">{erro}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!proposta) {
    return null;
  }

  const totalAlimentacao = calcularSubtotal(proposta.itens_alimentacao || []);
  const totalBebidas = calcularSubtotal(proposta.itens_bebidas || []);
  const totalServicos = calcularSubtotal(proposta.itens_servicos || []);
  const totalItensExtras = calcularSubtotal(proposta.itens_extras || []);
  
  const totalRolhas = parseRolhaValue(proposta.rolha_vinho || '') + 
                     parseRolhaValue(proposta.rolha_destilado || '') + 
                     parseRolhaValue(proposta.rolha_energetico || '') + 
                     parseRolhaValue(proposta.rolha_chopp || '');

  const subtotal = totalAlimentacao + totalBebidas + totalServicos + totalItensExtras + totalRolhas;

  const jaRespondido = proposta.status === 'aceita' || proposta.status === 'recusada';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Sólido */}
        <div className="relative mb-8">
          <Card className="overflow-hidden shadow-lg border border-gray-200">
            <div className="bg-slate-800 py-8">
              <div className="flex items-center justify-center">
                <Image 
                  src="/logos/LOGO BRANCA FUNDO TRANSP.png" 
                  alt="Eventos Indaiatuba" 
                  width={200} 
                  height={75} 
                  className="object-contain"
                />
              </div>
            </div>
            
            <div className="bg-white px-8 py-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-3">
                  Proposta de Evento
                </h1>
                {proposta.codigo_reuniao && (
                  <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg border">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-700 font-medium">#{proposta.codigo_reuniao}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-slate-700 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Cliente</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 font-medium min-w-[60px]">Nome:</span>
                      <span className="text-slate-800 font-semibold">{proposta.cliente.nome}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 font-medium min-w-[60px]">Email:</span>
                      <span className="text-slate-800">{proposta.cliente.email}</span>
                    </div>
                    {proposta.cliente.telefone && (
                      <div className="flex items-start gap-3">
                        <span className="text-gray-600 font-medium min-w-[60px]">Telefone:</span>
                        <span className="text-slate-800">{proposta.cliente.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-slate-700 p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Evento</h3>
                  </div>
                  <div className="space-y-3">
                    {proposta.data_realizacao && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span className="text-slate-800 font-semibold">
                          {new Date(proposta.data_realizacao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {proposta.espaco?.nome && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-600" />
                        <span className="text-slate-800 font-semibold">{proposta.espaco.nome}</span>
                      </div>
                    )}
                    {proposta.num_pessoas && (
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="text-slate-800 font-semibold">{proposta.num_pessoas} pessoas</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Itens da Proposta */}
        {[
          { titulo: 'Alimentação', itens: proposta.itens_alimentacao, total: totalAlimentacao },
          { titulo: 'Bebidas', itens: proposta.itens_bebidas, total: totalBebidas },
          { titulo: 'Serviços', itens: proposta.itens_servicos, total: totalServicos },
          { titulo: 'Itens Extras', itens: proposta.itens_extras, total: totalItensExtras }
        ].map(secao => (
          secao.itens && secao.itens.length > 0 && (
            <Card key={secao.titulo} className="mb-6 shadow-lg border border-gray-200">
              <CardHeader className="pb-4 bg-slate-700">
                <CardTitle className="text-xl text-white">
                  {secao.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {secao.itens.map((item: any, index: number) => {
                    if (!item.descricao || item.valorUnitario <= 0) return null;
                    
                    const valorTotal = (item.valorUnitario || 0) * (item.quantidade || 1);
                    const desconto = valorTotal * ((item.descontoAplicado || 0) / 100);
                    const valorFinal = valorTotal - desconto;
                    
                    return (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-2">{item.descricao}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="bg-white px-3 py-1 rounded border">
                                Qtd: <span className="font-semibold">{item.quantidade || 1}</span>
                              </span>
                              <span className="bg-white px-3 py-1 rounded border">
                                Unit: <span className="font-semibold">{(item.valorUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </span>
                              {item.descontoAplicado > 0 && (
                                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded border">
                                  -{item.descontoAplicado}% desc.
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-800">
                              {valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 p-4 rounded-lg bg-gray-100 border border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-800">Subtotal {secao.titulo}:</span>
                    <span className="text-xl font-bold text-slate-900">
                      {secao.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}

        {/* Condições de Pagamento */}
        <Card className="mb-6 shadow-lg border border-gray-200">
          <CardHeader className="pb-4 bg-slate-700">
            <CardTitle className="text-xl text-white flex items-center gap-3">
              <CreditCard className="h-6 w-6" />
              Condições de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Modelo de Pagamento */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-slate-800">Modelo de Pagamento</span>
                </div>
                <p className="text-slate-700 font-medium">
                  {proposta.modelo_pagamento || 'À vista'}
                </p>
              </div>

              {/* Entrada */}
              {proposta.entrada === 'Sim' ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-slate-800">Entrada</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">
                    {Number(proposta.valor_entrada || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  {proposta.data_entrada && (
                    <p className="text-sm text-gray-600 mt-1">
                      Vencimento: {new Date(proposta.data_entrada).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {proposta.forma_pagamento_entrada && (
                    <p className="text-sm text-gray-600">
                      Forma: {proposta.forma_pagamento_entrada}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-slate-800">Entrada</span>
                  </div>
                  <p className="text-slate-700">Não há entrada</p>
                </div>
              )}

              {/* Parcelamento */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-slate-800">Parcelamento</span>
                </div>
                {proposta.qtd_meses && proposta.qtd_meses > 1 ? (
                  <>
                    <p className="text-xl font-bold text-slate-800">
                      {proposta.qtd_meses}x de {((Number(proposta.total_proposta) - Number(proposta.valor_entrada || 0)) / proposta.qtd_meses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {proposta.dia_vencimento && (
                      <p className="text-sm text-gray-600 mt-1">
                        Vencimento: dia {proposta.dia_vencimento} de cada mês
                      </p>
                    )}
                    {proposta.forma_saldo_final && (
                      <p className="text-sm text-gray-600">
                        Forma: {proposta.forma_saldo_final}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-700">Pagamento à vista</p>
                )}
              </div>

              {/* Juros (se aplicável) */}
              {proposta.reajuste === 'Sim' && Number(proposta.juros || 0) > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-slate-800">Juros</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{proposta.juros}% ao mês</p>
                </div>
              )}

              {/* Negociação */}
              {proposta.negociacao && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-slate-800">Tipo de Negociação</span>
                  </div>
                  <p className="text-slate-700 font-medium">{proposta.negociacao}</p>
                </div>
              )}
            </div>

            {/* Cláusulas Adicionais */}
            {proposta.clausulas_adicionais && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-slate-800">Cláusulas Adicionais</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{proposta.clausulas_adicionais}</p>
              </div>
            )}

            {/* Observações Financeiras */}
            {proposta.observacao_financeiro && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-slate-800">Observações Financeiras</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{proposta.observacao_financeiro}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="mb-6 shadow-lg border border-gray-200">
          <div className="bg-slate-800 p-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Valor Total do Evento</h3>
              <div className="bg-white rounded-lg p-6 border">
                <p className="text-4xl font-bold text-slate-800 mb-2">
                  {proposta.total_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-gray-600 text-lg">Proposta válida por 30 dias</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Status e Ações */}
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="p-8 text-center">
            {jaRespondido ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  {proposta.status === 'aceita' ? (
                    <>
                      <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                      </div>
                      <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
                        <span className="text-xl font-bold">Proposta Aprovada</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-red-100 p-4 rounded-full">
                        <XCircle className="h-16 w-16 text-red-600" />
                      </div>
                      <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
                        <span className="text-xl font-bold">Proposta Recusada</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="max-w-2xl mx-auto">
                  <p className="text-lg text-slate-700 leading-relaxed">
                    {proposta.status === 'aceita' 
                      ? 'Obrigado por aprovar nossa proposta! Nossa equipe entrará em contato em breve para acertar todos os detalhes do seu evento e garantir que tudo seja perfeito para o grande dia.'
                      : 'Obrigado pelo retorno. Caso mude de ideia ou tenha alguma dúvida sobre nossa proposta, não hesite em entrar em contato conosco. Estamos sempre prontos para ajudar!'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">
                    O que achou da nossa proposta?
                  </h3>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Sua opinião é muito importante para nós! Por favor, nos informe se aprova ou não esta proposta de evento.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-md mx-auto">
                  <Button
                    onClick={() => handleResposta(true)}
                    disabled={processando}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 px-8 py-4 text-lg font-bold rounded-lg shadow-lg"
                  >
                    {processando ? (
                      <RefreshCw className="h-6 w-6 mr-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-6 w-6 mr-3" />
                    )}
                    Aprovar Proposta
                  </Button>
                  
                  <Button
                    onClick={() => handleResposta(false)}
                    disabled={processando}
                    variant="destructive"
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 px-8 py-4 text-lg font-bold rounded-lg shadow-lg"
                  >
                    {processando ? (
                      <RefreshCw className="h-6 w-6 mr-3 animate-spin" />
                    ) : (
                      <XCircle className="h-6 w-6 mr-3" />
                    )}
                    Recusar Proposta
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto border border-gray-200">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="text-lg font-semibold text-slate-800">Validade da Proposta</span>
            </div>
            <p className="text-gray-600 mb-4">
              Esta proposta é válida por <span className="font-bold text-slate-800">30 dias</span> a partir da data de emissão.
            </p>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">
                Gerada em {new Date(proposta.created_at).toLocaleDateString('pt-BR')} 
                <br />
                <span className="font-semibold">Eventos Indaiatuba</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}