'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CategoriaProduto, Produto, EspacoEvento } from '@/types/database';

const discountOptions = [0, 10, 20, 30, 40, 50, 100];

export default function EditarProdutoPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [produto, setProduto] = useState<Produto | null>(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState<{
    nome: string;
    categoria_id: string;
    seguimento: string;
    status: string;
    valor: string;
    tem_taxa: boolean;
    descricao: string;
    observacoes: string;
    reajuste: boolean;
    desconto_percentual: number;
    espaco_ids: string[];
  }>({
    nome: '',
    categoria_id: '',
    seguimento: '',
    status: 'Ativo',
    valor: '',
    tem_taxa: true,
    descricao: '',
    observacoes: '',
    reajuste: false,
    desconto_percentual: 0,
    espaco_ids: []
  });

  useEffect(() => {
    if (productId) {
      fetchProduto();
      fetchCategorias();
      fetchEspacos();
    }
  }, [productId]);

  const fetchProduto = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/produtos/${productId}`);
      
      if (!response.ok) {
        throw new Error('Produto não encontrado');
      }

      const data = await response.json();
      const produtoData = data.data;
      
      setProduto(produtoData);
      
      // Preencher formulário com dados do produto
      setFormData({
        nome: produtoData.nome || '',
        categoria_id: produtoData.categoria_id || '',
        seguimento: produtoData.seguimento || '',
        status: produtoData.status || 'Ativo',
        valor: produtoData.valor ? produtoData.valor.toString().replace('.', ',') : '',
        tem_taxa: produtoData.tem_taxa ?? true,
        descricao: produtoData.descricao || '',
        observacoes: produtoData.observacoes || '',
        reajuste: produtoData.reajuste ?? false,
        desconto_percentual: produtoData.desconto_percentual || 0,
        espaco_ids: produtoData.espacos?.map((e: any) => e.espaco.id) || []
      });
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast.error('Erro ao carregar produto');
      router.push('/dashboard/produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/produtos/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  };

  const fetchEspacos = async () => {
    try {
      const response = await fetch('/api/espacos-eventos/list');
      if (response.ok) {
        const data = await response.json();
        setEspacos(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar espaços:', error);
      toast.error('Erro ao carregar espaços');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nome || !formData.categoria_id || !formData.seguimento || !formData.valor) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/produtos/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor.replace(',', '.')),
          desconto_percentual: formData.desconto_percentual || 0,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar produto');
      }

      toast.success('Produto atualizado com sucesso!');
      router.push('/dashboard/produtos');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar produto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEspacoChange = (espacoId: string) => {
    setFormData(prev => {
      const newEspacoIds = prev.espaco_ids.includes(espacoId)
        ? prev.espaco_ids.filter(id => id !== espacoId)
        : [...prev.espaco_ids, espacoId];
      return { ...prev, espaco_ids: newEspacoIds };
    });
  };

  // Formatar valor monetário
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d,]/g, '');
    handleChange('valor', value);
  };

  const valorNumerico = parseFloat(formData.valor.replace(',', '.')) || 0;
  const valorComDesconto = valorNumerico * (1 - formData.desconto_percentual / 100);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Carregando produto...</span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    router.replace('/login');
    return null;
  }

  if (!produto) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Produto não encontrado</h2>
            <Button asChild>
              <Link href="/dashboard/produtos">
                Voltar aos Produtos
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/produtos">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Editar Produto</h1>
                <p className="text-muted-foreground">
                  Altere as informações do produto "{produto.nome}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Dados principais do produto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Produto *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      placeholder="Ex: Casamento na Praia"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select 
                      value={formData.categoria_id} 
                      onValueChange={(value) => handleChange('categoria_id', value)}
                      required
                    >
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seguimento">Seguimento *</Label>
                    <Select 
                      value={formData.seguimento} 
                      onValueChange={(value) => handleChange('seguimento', value)}
                      required
                    >
                      <SelectTrigger id="seguimento">
                        <SelectValue placeholder="Selecione um seguimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alimentos">Alimentos</SelectItem>
                        <SelectItem value="bebidas">Bebidas</SelectItem>
                        <SelectItem value="decoracao">Decoração</SelectItem>
                        <SelectItem value="itens_extra">Itens Extra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleChange('status', value)}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      value={formData.valor}
                      onChange={handleValorChange}
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => handleChange('descricao', e.target.value)}
                    placeholder="Descreva o produto..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Opções adicionais do produto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tem_taxa"
                      checked={formData.tem_taxa}
                      onCheckedChange={(checked) => handleChange('tem_taxa', checked)}
                    />
                    <Label htmlFor="tem_taxa" className="cursor-pointer text-sm font-medium">
                      TAXA DE SERVIÇO
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reajuste"
                      checked={formData.reajuste}
                      onCheckedChange={(checked) => handleChange('reajuste', checked)}
                    />
                    <Label htmlFor="reajuste" className="cursor-pointer text-sm font-medium">
                      TAXA DE REAJUSTE
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="desconto_percentual">Desconto (%)</Label>
                    <Select
                      value={formData.desconto_percentual.toString()}
                      onValueChange={(value) => handleChange('desconto_percentual', parseInt(value))}
                    >
                      <SelectTrigger id="desconto_percentual">
                        <SelectValue placeholder="Selecione um desconto" />
                      </SelectTrigger>
                      <SelectContent>
                        {discountOptions.map(option => (
                          <SelectItem key={option} value={option.toString()}>
                            {option}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    {formData.desconto_percentual > 0 && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Valor com desconto:
                          <span className="font-bold text-primary ml-2">
                            R$ {valorComDesconto.toFixed(2).replace('.', ',')}
                          </span>
                        </p>
                        {formData.desconto_percentual === 100 && (
                          <p className="text-sm font-bold text-destructive">
                            Máximo desconto possível!
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleChange('observacoes', e.target.value)}
                    placeholder="Observações internas..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ambientes/Espaços */}
            <Card>
              <CardHeader>
                <CardTitle>Ambientes/Espaços</CardTitle>
                <CardDescription>
                  Selecione os espaços onde este produto pode ser oferecido.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {espacos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {espacos.map(espaco => (
                      <div key={espaco.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`espaco-${espaco.id}`}
                          checked={formData.espaco_ids.includes(espaco.id)}
                          onCheckedChange={() => handleEspacoChange(espaco.id)}
                        />
                        <Label
                          htmlFor={`espaco-${espaco.id}`}
                          className="cursor-pointer text-sm font-medium"
                        >
                          {espaco.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Carregando espaços...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Informações do Sistema */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Sistema</CardTitle>
                <CardDescription>
                  Dados de auditoria (somente leitura)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Criação</Label>
                    <Input
                      value={new Date(produto.created_at).toLocaleString('pt-BR')}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Última Atualização</Label>
                    <Input
                      value={new Date(produto.updated_at).toLocaleString('pt-BR')}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ID do Produto</Label>
                  <Input
                    value={produto.id}
                    disabled
                    className="bg-muted font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/produtos">
                  Cancelar
                </Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Atualizar Produto
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 