'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Tag, 
  Edit, 
  Trash2,
  Save,
  ArrowLeft
} from 'lucide-react';
import { CategoriaProduto } from '@/types/database';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function CategoriasPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaProduto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tem_taxa_padrao: true,
    ordem: '',
    ativo: true
  });

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/produtos/categorias/manage');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      } else {
        toast.error('Erro ao carregar categorias');
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tem_taxa_padrao: true,
      ordem: '',
      ativo: true
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEdit = (categoria: CategoriaProduto) => {
    setSelectedCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      tem_taxa_padrao: categoria.tem_taxa_padrao,
      ordem: categoria.ordem.toString(),
      ativo: categoria.ativo
    });
    setIsEditOpen(true);
  };

  const handleDelete = (categoria: CategoriaProduto) => {
    setSelectedCategoria(categoria);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    setIsSaving(true);

    try {
      const url = selectedCategoria 
        ? `/api/produtos/categorias/manage/${selectedCategoria.id}`
        : '/api/produtos/categorias/manage';
      
      const method = selectedCategoria ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ordem: parseInt(formData.ordem) || 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar categoria');
      }

      toast.success(
        selectedCategoria 
          ? 'Categoria atualizada com sucesso!' 
          : 'Categoria criada com sucesso!'
      );
      
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setSelectedCategoria(null);
      resetForm();
      fetchCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategoria) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/produtos/categorias/manage/${selectedCategoria.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir categoria');
      }

      toast.success('Categoria excluída com sucesso!');
      setIsDeleteOpen(false);
      setSelectedCategoria(null);
      fetchCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir categoria');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const columns = [
    {
      key: 'nome' as keyof CategoriaProduto,
      header: 'Nome',
      sortable: true,
      render: (value: any, categoria: CategoriaProduto) => (
        <div>
          <div className="font-medium">{categoria.nome}</div>
          {categoria.descricao && (
            <div className="text-sm text-muted-foreground">{categoria.descricao}</div>
          )}
        </div>
      )
    },
    {
      key: 'ordem' as keyof CategoriaProduto,
      header: 'Ordem',
      sortable: true,
      render: (value: any, categoria: CategoriaProduto) => (
        <Badge variant="outline">{categoria.ordem}</Badge>
      )
    },
    {
      key: 'tem_taxa_padrao' as keyof CategoriaProduto,
      header: 'Taxa Padrão',
      sortable: true,
      render: (value: any, categoria: CategoriaProduto) => (
        <Badge variant={categoria.tem_taxa_padrao ? 'default' : 'secondary'}>
          {categoria.tem_taxa_padrao ? 'Com Taxa' : 'Sem Taxa'}
        </Badge>
      )
    },
    {
      key: 'ativo' as keyof CategoriaProduto,
      header: 'Status',
      sortable: true,
      render: (value: any, categoria: CategoriaProduto) => (
        <Badge 
          variant={categoria.ativo ? 'default' : 'secondary'} 
          className={categoria.ativo 
            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100' 
            : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
          }
        >
          {categoria.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'acoes',
      header: 'Ações',
      sortable: false,
      render: (value: any, categoria: CategoriaProduto) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleEdit(categoria)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleDelete(categoria)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/produtos">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar aos Produtos
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Categorias de Produtos</h1>
                <p className="text-muted-foreground">
                  Gerencie as categorias para organizar seus produtos
                </p>
              </div>
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Categorias</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categorias.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorias Ativas</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categorias.filter(c => c.ativo).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Taxa Padrão</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categorias.filter(c => c.tem_taxa_padrao).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Categorias</CardTitle>
            <CardDescription>
              {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} encontrada{categorias.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={categorias}
              columns={columns}
              loading={isLoading}
              emptyMessage="Nenhuma categoria encontrada"
            />
          </CardContent>
        </Card>

        {/* Dialog Criar/Editar */}
        <Dialog open={isCreateOpen || isEditOpen} onOpenChange={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setSelectedCategoria(null);
          resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
              <DialogDescription>
                {selectedCategoria 
                  ? 'Altere as informações da categoria' 
                  : 'Adicione uma nova categoria de produtos'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Categoria *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Bebidas"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição opcional da categoria..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordem">Ordem de Exibição</Label>
                  <Input
                    id="ordem"
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData(prev => ({ ...prev, ordem: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tem_taxa_padrao"
                      checked={formData.tem_taxa_padrao}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tem_taxa_padrao: checked === true }))}
                    />
                    <Label htmlFor="tem_taxa_padrao" className="cursor-pointer">
                      Produtos desta categoria têm taxa por padrão
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked === true }))}
                    />
                    <Label htmlFor="ativo" className="cursor-pointer">
                      Categoria ativa
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setSelectedCategoria(null);
                  resetForm();
                }}>
                  Cancelar
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
                      {selectedCategoria ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Excluir */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a categoria "{selectedCategoria?.nome}"? 
                Esta ação não pode ser desfeita e pode afetar produtos existentes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
} 