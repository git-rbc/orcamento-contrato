'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Eye, Calendar, User, DollarSign, Send, Mail, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Contrato {
  id: string;
  numero_contrato: string;
  cliente_id: string;
  vendedor_id: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  numero_participantes: number;
  valor_total: string;
  status: string;
  data_criacao: string;
  data_envio: string | null;
  data_assinatura: string | null;
  data_visualizacao: string | null;
  token_publico: string | null;
  arquivo_assinado: string | null;
  observacoes: string;
}

const statusColors = {
  rascunho: 'bg-gray-100 text-gray-800',
  enviado: 'bg-blue-100 text-blue-800',
  visualizado: 'bg-yellow-100 text-yellow-800',
  em_assinatura: 'bg-orange-100 text-orange-800',
  assinado: 'bg-green-100 text-green-800',
  finalizado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800'
};

const statusLabels = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  em_assinatura: 'Em Assinatura',
  assinado: 'Assinado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado'
};

export function ContratosMain() {
  const router = useRouter();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviandoContrato, setEnviandoContrato] = useState<string | null>(null);

  const handleGerarContrato = () => {
    router.push('/dashboard/contratos/novo');
  };

  const handleVisualizarPdfAssinado = (arquivoAssinado: string) => {
    // Construir URL do Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const pdfUrl = `${supabaseUrl}/storage/v1/object/public/contratos-assinados/${arquivoAssinado}`;
    
    // Abrir PDF em nova aba
    window.open(pdfUrl, '_blank');
  };

  const handleEnviarContrato = async (contratoId: string) => {
    setEnviandoContrato(contratoId);
    
    try {
      const response = await fetch(`/api/contratos/${contratoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acao: 'enviar' }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Erro ao enviar contrato: ${data.error}`);
        return;
      }

      // Atualizar a lista de contratos
      setContratos(prev => prev.map(c => 
        c.id === contratoId 
          ? { ...c, status: 'enviado', data_envio: new Date().toISOString() }
          : c
      ));

      alert('Contrato enviado com sucesso! O cliente receberá um email para assinatura digital.');
      
    } catch (error) {
      console.error('Erro ao enviar contrato:', error);
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setEnviandoContrato(null);
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    const fetchContratos = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('contratos')
          .select('*')
          .order('data_criacao', { ascending: false });

        if (error) {
          console.error('Erro ao buscar contratos:', error);
        } else {
          setContratos(data || []);
        }
      } catch (error) {
        console.error('Erro ao conectar com o banco:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContratos();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
            <p className="text-muted-foreground">
              Gerencie contratos, propostas aceitas e documentos contratuais
            </p>
          </div>
          <Button onClick={handleGerarContrato}>
            <Plus className="mr-2 h-4 w-4" />
            Gerar Contrato
          </Button>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie contratos, propostas aceitas e documentos contratuais
          </p>
        </div>
        <Button onClick={handleGerarContrato}>
          <Plus className="mr-2 h-4 w-4" />
          Gerar Contrato
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Contratos</p>
              <p className="text-2xl font-bold">{contratos.length}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rascunhos</p>
              <p className="text-2xl font-bold">
                {contratos.filter(c => c.status === 'rascunho').length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assinados</p>
              <p className="text-2xl font-bold">
                {contratos.filter(c => c.status === 'assinado').length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  contratos.reduce((sum, c) => sum + parseFloat(c.valor_total), 0).toString()
                )}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os contratos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro contrato
              </p>
              <Button onClick={handleGerarContrato}>
                <Plus className="mr-2 h-4 w-4" />
                Gerar Primeiro Contrato
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo de Evento</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Data do Evento</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell className="font-medium">
                      {contrato.numero_contrato}
                    </TableCell>
                    <TableCell>
                      {contrato.tipo_evento || 'Não informado'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {contrato.local_evento}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(contrato.data_evento)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {contrato.numero_participantes}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatCurrency(contrato.valor_total)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={statusColors[contrato.status as keyof typeof statusColors]}
                      >
                        {statusLabels[contrato.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(contrato.data_criacao)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/contratos/${contrato.id}`)}
                          title="Visualizar contrato"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {contrato.status === 'rascunho' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEnviarContrato(contrato.id)}
                            disabled={enviandoContrato === contrato.id}
                            title="Enviar contrato para assinatura"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {enviandoContrato === contrato.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {['enviado', 'visualizado', 'em_assinatura', 'assinado'].includes(contrato.status) && contrato.token_publico && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                              const linkPublico = `${appUrl}/contrato/${contrato.token_publico}`;
                              navigator.clipboard.writeText(linkPublico);
                              alert(`Link copiado para a área de transferência!\n${linkPublico}`);
                            }}
                            title="Copiar link público do contrato"
                            className="text-green-600 hover:text-green-800"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}

                        {contrato.status === 'assinado' && contrato.arquivo_assinado && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVisualizarPdfAssinado(contrato.arquivo_assinado!)}
                            title="Visualizar contrato assinado (PDF)"
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}