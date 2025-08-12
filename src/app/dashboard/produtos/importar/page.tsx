'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Eye,
  Save,
  ArrowLeft,
  X,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProdutoImportacao {
  id?: string;
  nome: string;
  valor: number;
  status: 'Ativo' | 'Inativo';
  categoria: string;
  reajuste: boolean;
  tem_taxa: boolean;
  erro?: string;
  valido?: boolean;
}

export default function ImportarProdutosPage() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoImportacao[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [etapa, setEtapa] = useState<'upload' | 'preview' | 'importando'>('upload');
  const [produtosValidos, setProdutosValidos] = useState(0);
  const [produtosInvalidos, setProdutosInvalidos] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV');
        return;
      }
      
      setArquivo(file);
      setErros([]);
    }
  };

  const handleUpload = async () => {
    if (!arquivo) {
      toast.error('Por favor, selecione um arquivo');
      return;
    }

    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('file', arquivo);

      const response = await fetch('/api/produtos/importar/preview', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar arquivo');
      }

      const data = await response.json();
      
      setProdutos(data.produtos);
      setErros(data.erros || []);
      setProdutosValidos(data.validos);
      setProdutosInvalidos(data.invalidos);
      setEtapa('preview');
      
      if (data.erros?.length > 0) {
        toast.warning(`Arquivo processado com ${data.erros.length} avisos`);
      } else {
        toast.success('Arquivo processado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setCarregando(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    if (produtosValidos === 0) {
      toast.error('Não há produtos válidos para importar');
      return;
    }

    setCarregando(true);
    setEtapa('importando');
    
    try {
      const produtosParaImportar = produtos.filter(p => p.valido);
      
      const response = await fetch('/api/produtos/importar/confirmar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ produtos: produtosParaImportar })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao importar produtos');
      }

      const data = await response.json();
      
      toast.success(`${data.importados} produtos importados com sucesso!`);
      
      setTimeout(() => {
        router.push('/dashboard/produtos');
      }, 2000);
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao importar produtos');
      setEtapa('preview');
    } finally {
      setCarregando(false);
    }
  };

  const baixarTemplate = async () => {
    try {
      const response = await fetch('/api/produtos/importar/template');
      
      if (!response.ok) {
        throw new Error('Erro ao baixar template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_produtos.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      toast.error('Erro ao baixar template');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (value: any, produto: ProdutoImportacao) => (
        <div className={produto.valido === false ? 'text-red-600' : ''}>
          {produto.nome || '-'}
        </div>
      )
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (value: any, produto: ProdutoImportacao) => (
        <div className={produto.valido === false ? 'text-red-600' : ''}>
          {produto.valor ? formatCurrency(produto.valor) : '-'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, produto: ProdutoImportacao) => (
        <Badge variant={produto.status === 'Ativo' ? 'default' : 'secondary'}>
          {produto.status}
        </Badge>
      )
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (value: any, produto: ProdutoImportacao) => {
        if (produto.categoria && produto.categoria.trim() !== '') {
          return produto.categoria;
        }
        return (
          <span className="text-muted-foreground italic">
            Cerimônia ao Ar livre
          </span>
        );
      }
    },
    {
      key: 'reajuste',
      header: 'Reajuste',
      render: (value: any, produto: ProdutoImportacao) => (
        <Badge variant={produto.reajuste ? 'default' : 'outline'}>
          {produto.reajuste ? 'Sim' : 'Não'}
        </Badge>
      )
    },
    {
      key: 'tem_taxa',
      header: 'Taxa',
      render: (value: any, produto: ProdutoImportacao) => (
        <Badge variant={produto.tem_taxa ? 'default' : 'outline'}>
          {produto.tem_taxa ? 'Sim' : 'Não'}
        </Badge>
      )
    },
    {
      key: 'status_validacao',
      header: 'Validação',
      render: (value: any, produto: ProdutoImportacao) => (
        <div className="flex items-center gap-2">
          {produto.valido === false ? (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{produto.erro}</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Válido</span>
            </>
          )}
        </div>
      )
    }
  ];

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importar Produtos</h1>
            <p className="text-muted-foreground">
              Importe produtos em massa através de planilha Excel ou CSV
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Etapa de Upload */}
        {etapa === 'upload' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Upload de Arquivo</CardTitle>
                <CardDescription>
                  Faça upload de um arquivo Excel (.xlsx, .xls) ou CSV com os produtos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <CardContent className="pt-6">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">A planilha deve conter as seguintes colunas:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                          <li><strong>Nome</strong> - Nome do produto (obrigatório)</li>
                          <li><strong>Valores</strong> - Valor unitário (ex: 1234.56, vazio = 0)</li>
                          <li><strong>Status</strong> - Ativo ou Inativo</li>
                          <li><strong>Categoria</strong> - Nome da categoria (vazio = "Cerimônia ao Ar livre")</li>
                          <li><strong>Reajuste</strong> - Sim ou Não (vazio = Não)</li>
                          <li><strong>Taxa de Serviço</strong> - Sim ou Não (vazio = Não)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file">Arquivo de Importação</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="mt-2"
                    />
                  </div>

                  {arquivo && (
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{arquivo.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({(arquivo.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button 
                      onClick={handleUpload} 
                      disabled={!arquivo || carregando}
                      className="flex-1"
                    >
                      {carregando ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Processar Arquivo
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={baixarTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Etapa de Preview */}
        {etapa === 'preview' && (
          <>
            {/* Resumo */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{produtos.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-600">Válidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{produtosValidos}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-600">Com Erros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{produtosInvalidos}</div>
                </CardContent>
              </Card>
            </div>

            {/* Erros Gerais */}
            {erros.length > 0 && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="space-y-1">
                      {erros.map((erro, index) => (
                        <p key={index} className="text-sm">{erro}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabela de Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview dos Produtos</CardTitle>
                <CardDescription>
                  Revise os produtos antes de confirmar a importação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={produtos.map((p, idx) => ({ ...p, id: idx.toString() }))}
                  columns={columns as any}
                  loading={false}
                />
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEtapa('upload');
                  setProdutos([]);
                  setArquivo(null);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Upload
              </Button>
              <Button 
                onClick={handleConfirmarImportacao}
                disabled={produtosValidos === 0 || carregando}
              >
                {carregando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Importar {produtosValidos} Produtos
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Etapa de Importação */}
        {etapa === 'importando' && (
          <Card>
            <CardContent className="py-20">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-lg font-medium">Importando produtos...</p>
                <p className="text-sm text-muted-foreground">
                  Por favor, aguarde enquanto os produtos são importados
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
} 