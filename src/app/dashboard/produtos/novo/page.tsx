'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Save, Package } from 'lucide-react';
import Link from 'next/link';
import { CategoriaProduto, EspacoEvento } from '@/types/database';

const discountOptions = [0, 10, 20, 30, 40, 50, 100];

export default function NovoProdutoPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  
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
    vinculado_convidados: boolean;
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
    vinculado_convidados: false,
    espaco_ids: []
  });

  useEffect(() => {
    fetchCategorias();
    fetchEspacos();
  }, []);

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
      toast.error('Erro ao carregar espaços de eventos');
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
      const response = await fetch('/api/produtos', {
        method: 'POST',
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
        throw new Error(error.error || 'Erro ao criar produto');
      }

      toast.success('Produto criado com sucesso!');
      router.push('/dashboard/produtos');
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar produto');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    router.replace('/login');
    return null;
  }

  return (
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
                <h1 className="text-3xl font-bold tracking-tight">Novo Produto</h1>
                <p className="text-muted-foreground">
                  Adicione um novo produto ao catálogo
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

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="vinculado_convidados"
                        checked={formData.vinculado_convidados}
                        onCheckedChange={(checked) => handleChange('vinculado_convidados', checked)}
                      />
                      <Label htmlFor="vinculado_convidados" className="cursor-pointer text-sm font-medium">
                        QUANTIDADE VINCULADA AO Nº DE CONVIDADOS
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Quando marcado, a quantidade será automaticamente igual ao número de convidados na proposta
                    </p>
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
                    Nenhum espaço de evento encontrado.
                  </p>
                )}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Produto
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
  );
} 