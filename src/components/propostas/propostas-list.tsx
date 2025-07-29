import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Users, DollarSign, CheckCircle, XCircle, Clock, RefreshCw, FileCheck, Send, Download, Edit, Trash2, RotateCcw, User, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Proposta {
  id: string;
  codigo_reuniao?: string;
  cliente: {
    nome: string;
    email: string;
  };
  espaco?: {
    nome: string;
  };
  vendedor?: {
    id: string;
    nome: string;
    role_id: string;
    roles?: {
      id: string;
      nome: string;
    };
  };
  data_realizacao?: string;
  num_pessoas?: number;
  total_proposta: number;
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'cancelada' | 'convertida';
  created_at: string;
}

interface PropostasListProps {
  filtroStatus?: string;
  clienteId?: string;
  onEditarProposta?: (propostaId: string) => void;
  filtros?: any;
}

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: Clock },
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: FileText },
  aceita: { label: 'Aceita', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  recusada: { label: 'Recusada', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  convertida: { label: 'Convertida', color: 'bg-purple-100 text-purple-800', icon: FileCheck }
};

export function PropostasList({ filtroStatus, clienteId, onEditarProposta, filtros = {} }: PropostasListProps) {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertendoId, setConvertendoId] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const fetchPropostas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Filtros básicos
      if (filtroStatus) params.set('status', filtroStatus);
      if (clienteId) params.set('cliente_id', clienteId);
      
      // Filtros avançados
      if (filtros.cliente) params.set('cliente_id', filtros.cliente);
      if (filtros.clienteNome) params.set('cliente_nome', filtros.clienteNome);
      if (filtros.status) params.set('status', filtros.status);
      if (filtros.codigo) params.set('codigo_reuniao', filtros.codigo);
      if (filtros.dataInicio) params.set('data_inicio', filtros.dataInicio.toISOString().split('T')[0]);
      if (filtros.dataFim) params.set('data_fim', filtros.dataFim.toISOString().split('T')[0]);
      if (filtros.valorMin) params.set('valor_min', filtros.valorMin);
      if (filtros.valorMax) params.set('valor_max', filtros.valorMax);
      if (filtros.espaco) params.set('espaco_id', filtros.espaco);
      if (filtros.vendedor) params.set('vendedor_id', filtros.vendedor);
      if (filtros.numPessoasMin) params.set('num_pessoas_min', filtros.numPessoasMin);
      if (filtros.numPessoasMax) params.set('num_pessoas_max', filtros.numPessoasMax);
      
      const response = await fetch(`/api/propostas?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar propostas');
      }
      
      const data = await response.json();
      setPropostas(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  };

  const handleConverterContrato = async (propostaId: string) => {
    try {
      setConvertendoId(propostaId);
      
      const response = await fetch(`/api/propostas/${propostaId}/converter-contrato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao converter proposta');
      }

      const result = await response.json();
      
      toast.success(`Proposta convertida em contrato ${result.numero_contrato} com sucesso!`);
      
      // Atualizar lista de propostas
      await fetchPropostas();
      
    } catch (error) {
      console.error('Erro ao converter proposta:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao converter proposta');
    } finally {
      setConvertendoId(null);
    }
  };

  const handleUpdateStatus = async (propostaId: string, novoStatus: string) => {
    try {
      setProcessandoId(propostaId);
      
      const response = await fetch(`/api/propostas/${propostaId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar status');
      }

      const result = await response.json();
      toast.success(result.message || 'Status atualizado com sucesso!');
      
      // Atualizar lista de propostas
      await fetchPropostas();
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setProcessandoId(null);
    }
  };

  const handleDownloadPDF = async (propostaId: string, codigoReuniao?: string) => {
    try {
      toast.loading('Gerando PDF...');
      
      const response = await fetch(`/api/propostas/${propostaId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `proposta-${codigoReuniao || propostaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('PDF baixado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.dismiss();
      toast.error('Erro ao baixar PDF');
    }
  };

  const handleExcluirProposta = async (propostaId: string) => {
    try {
      setProcessandoId(propostaId);
      
      const response = await fetch(`/api/propostas/${propostaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir proposta');
      }

      const result = await response.json();
      toast.success(result.message || 'Proposta excluída com sucesso!');
      
      // Atualizar lista de propostas
      await fetchPropostas();
      
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir proposta');
    } finally {
      setProcessandoId(null);
    }
  };

  const handleDuplicarProposta = async (propostaId: string) => {
    try {
      setProcessandoId(propostaId);
      
      // Buscar dados completos da proposta
      const response = await fetch(`/api/propostas/${propostaId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados da proposta');
      }
      
      const { data: propostaOriginal } = await response.json();
      
      // Preparar dados para duplicação (remover campos únicos e alterar status)
      const propostaDuplicada = {
        // Dados básicos
        clienteId: propostaOriginal.cliente?.id,
        dataContratacao: propostaOriginal.data_contratacao,
        dataRealizacao: propostaOriginal.data_realizacao,
        diaSemana: propostaOriginal.dia_semana,
        espacoId: propostaOriginal.espaco_id,
        layoutId: propostaOriginal.layout_id,
        numPessoas: propostaOriginal.num_pessoas,
        tipoEvento: propostaOriginal.tipo_evento,
        
        // Itens
        alimentacaoItens: propostaOriginal.itens_alimentacao || [],
        bebidasItens: propostaOriginal.itens_bebidas || [],
        servicosItens: propostaOriginal.itens_servicos || [],
        itensExtras: propostaOriginal.itens_extras || [],
        
        // Valores
        totalProposta: propostaOriginal.total_proposta,
        valorDesconto: propostaOriginal.valor_desconto,
        valorEntrada: propostaOriginal.valor_entrada,
        
        // Rolhas
        rolhas: {
          vinho: propostaOriginal.rolha_vinho || '',
          destilado: propostaOriginal.rolha_destilado || '',
          energetico: propostaOriginal.rolha_energetico || '',
          chopp: propostaOriginal.rolha_chopp || ''
        },
        
        // Condições de pagamento
        condicoesPagamento: {
          modeloPagamento: propostaOriginal.modelo_pagamento,
          reajuste: propostaOriginal.reajuste,
          juros: propostaOriginal.juros,
          dataEntrada: propostaOriginal.data_entrada,
          formaPagamentoEntrada: propostaOriginal.forma_pagamento_entrada,
          statusPagamentoEntrada: propostaOriginal.status_pagamento_entrada,
          qtdMeses: propostaOriginal.qtd_meses,
          diaVencimento: propostaOriginal.dia_vencimento,
          formaSaldoFinal: propostaOriginal.forma_saldo_final,
          entrada: propostaOriginal.entrada,
          negociacao: propostaOriginal.negociacao,
          clausulas: propostaOriginal.clausulas_adicionais,
          observacao: propostaOriginal.observacao_financeiro
        },
        
        // Sempre criar como rascunho
        status: 'rascunho'
      };
      
      // Criar nova proposta
      const createResponse = await fetch('/api/propostas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propostaDuplicada),
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Erro ao duplicar proposta');
      }
      
      const result = await createResponse.json();
      toast.success('Proposta duplicada com sucesso!');
      
      // Atualizar lista de propostas
      await fetchPropostas();
      
    } catch (error) {
      console.error('Erro ao duplicar proposta:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao duplicar proposta');
    } finally {
      setProcessandoId(null);
    }
  };

  const showConfirmDialog = (title: string, description: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm,
      variant
    });
  };

  useEffect(() => {
    fetchPropostas();
  }, [filtroStatus, clienteId, filtros]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando propostas...</span>
      </div>
    );
  }

  if (propostas.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada</h3>
        <p className="text-muted-foreground">
          {filtroStatus ? `Não há propostas com status "${filtroStatus}".` : 'Nenhuma proposta foi criada ainda.'}
        </p>
      </div>
    );
  }

  return (
    <div className="propostas-container">
      <div className="space-y-4">
        {propostas.map((proposta) => {
          const statusInfo = statusConfig[proposta.status];
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={proposta.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                {/* Layout em grid para alinhar com o cabeçalho */}
                <div className="grid grid-cols-12 gap-4 items-center mb-3">
                  {/* Cliente - col-span-3 */}
                  <div className="col-span-3 flex items-center gap-3">
                    <h3 className="font-semibold text-base truncate">{proposta.cliente.nome}</h3>
                    {proposta.codigo_reuniao && (
                      <span className="text-xs text-muted-foreground">#{proposta.codigo_reuniao}</span>
                    )}
                  </div>
                  
                  {/* Status - col-span-1 */}
                  <div className="col-span-1">
                    <Badge className={`${statusInfo.color} text-xs`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  
                  {/* Data - col-span-1 */}
                  <div className="col-span-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className="hidden lg:inline">{proposta.data_realizacao ? new Date(proposta.data_realizacao).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                      <span className="lg:hidden">{proposta.data_realizacao ? new Date(proposta.data_realizacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--'}</span>
                    </div>
                  </div>
                  
                  {/* Pessoas - col-span-1 */}
                  <div className="col-span-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{proposta.num_pessoas || 0}</span>
                    </div>
                  </div>
                  
                  {/* Local - col-span-2 */}
                  <div className="col-span-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span className="truncate">{proposta.espaco?.nome || 'Sem local'}</span>
                    </div>
                  </div>
                  
                  {/* Vendedor - col-span-2 */}
                  <div className="col-span-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">{proposta.vendedor?.nome || 'Sem vendedor'}</span>
                    </div>
                  </div>
                  
                  {/* Valor - col-span-1 */}
                  <div className="col-span-1 text-right">
                    <div className="font-semibold text-base">
                      {proposta.total_proposta.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(proposta.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  {/* Ações - col-span-1 */}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    {/* Menu de ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={processandoId === proposta.id}
                        >
                          {processandoId === proposta.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Ações'
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Baixar PDF */}
                        <DropdownMenuItem 
                          onClick={() => handleDownloadPDF(proposta.id, proposta.codigo_reuniao)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </DropdownMenuItem>

                        {/* Duplicar proposta */}
                        <DropdownMenuItem 
                          onClick={() => showConfirmDialog(
                            'Duplicar Proposta',
                            'Uma nova proposta será criada com os mesmos dados, mas com status de rascunho.',
                            () => handleDuplicarProposta(proposta.id)
                          )}
                          disabled={processandoId === proposta.id}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar Proposta
                        </DropdownMenuItem>

                        {/* Converter para contrato (apenas quando aceita) */}
                        {proposta.status === 'aceita' && (
                          <DropdownMenuItem 
                            onClick={() => showConfirmDialog(
                              'Converter para Contrato',
                              'Esta ação irá converter a proposta em um contrato. Esta ação não pode ser desfeita.',
                              () => handleConverterContrato(proposta.id)
                            )}
                            disabled={convertendoId === proposta.id}
                            className="text-green-600 focus:text-green-600"
                          >
                            {convertendoId === proposta.id ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileCheck className="h-4 w-4 mr-2" />
                            )}
                            Converter para Contrato
                          </DropdownMenuItem>
                        )}

                        {/* Editar proposta (exceto se convertida) */}
                        {proposta.status !== 'convertida' && onEditarProposta && (
                          <DropdownMenuItem 
                            onClick={() => onEditarProposta(proposta.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Proposta
                          </DropdownMenuItem>
                        )}

                        {/* Excluir proposta (exceto se convertida) */}
                        {proposta.status !== 'convertida' && (
                          <DropdownMenuItem 
                            onClick={() => showConfirmDialog(
                              'Excluir Proposta',
                              `Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.`,
                              () => handleExcluirProposta(proposta.id),
                              'destructive'
                            )}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Proposta
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Ações baseadas no status */}
                        {proposta.status === 'rascunho' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => showConfirmDialog(
                                'Enviar Proposta',
                                'A proposta será enviada por email para o cliente e não poderá mais ser editada.',
                                () => handleUpdateStatus(proposta.id, 'enviada')
                              )}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar para Cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => showConfirmDialog(
                                'Cancelar Proposta',
                                'Esta ação marcará a proposta como cancelada.',
                                () => handleUpdateStatus(proposta.id, 'cancelada'),
                                'destructive'
                              )}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          </>
                        )}

                        {proposta.status === 'enviada' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => showConfirmDialog(
                                'Marcar como Aceita',
                                'A proposta será marcada como aceita pelo cliente.',
                                () => handleUpdateStatus(proposta.id, 'aceita')
                              )}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como Aceita
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => showConfirmDialog(
                                'Marcar como Recusada',
                                'A proposta será marcada como recusada pelo cliente.',
                                () => handleUpdateStatus(proposta.id, 'recusada')
                              )}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Marcar como Recusada
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => showConfirmDialog(
                                'Retornar para Rascunho',
                                'A proposta voltará para o status de rascunho e poderá ser editada novamente.',
                                () => handleUpdateStatus(proposta.id, 'rascunho')
                              )}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Voltar para Rascunho
                            </DropdownMenuItem>
                          </>
                        )}

                        {proposta.status === 'recusada' && (
                          <DropdownMenuItem 
                            onClick={() => showConfirmDialog(
                              'Retornar para Rascunho',
                              'A proposta voltará para o status de rascunho para ser revisada e reenviada.',
                              () => handleUpdateStatus(proposta.id, 'rascunho')
                            )}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Revisar Proposta
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
              {/* Informações adicionais para telas menores */}
              <div className="sm:hidden mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{proposta.data_realizacao ? new Date(proposta.data_realizacao).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{proposta.num_pessoas || 0} pessoas</span>
                </div>
                
                {proposta.espaco?.nome && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{proposta.espaco.nome}</span>
                  </div>
                )}
                
                {proposta.vendedor?.nome && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{proposta.vendedor.nome}</span>
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, open: false }));
              }}
              className={confirmDialog.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}