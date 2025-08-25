'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SelecaoProdutoModal } from '@/components/propostas/selecao-produto-modal';
import { Produto } from '@/types/database';

interface SubprodutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subproduto?: any;
  onSaved: () => void;
  onCancel: () => void;
}

export function SubprodutoModal({ 
  open, 
  onOpenChange, 
  subproduto, 
  onSaved, 
  onCancel 
}: SubprodutoModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    valor: '',
    descricao: '',
    status: 'Ativo'
  });
  const [selectedProducts, setSelectedProducts] = useState<Produto[]>([]);

  // Reset form when modal opens/closes or subproduto changes
  useEffect(() => {
    if (open) {
      if (subproduto) {
        setFormData({
          nome: subproduto.nome || '',
          valor: subproduto.valor?.toString() || '',
          descricao: subproduto.descricao || '',
          status: subproduto.status || 'Ativo'
        });
        
        // Carregar produtos associados
        const produtos = subproduto.produtos_associados?.map((assoc: any) => assoc.produto) || [];
        setSelectedProducts(produtos);
      } else {
        setFormData({
          nome: '',
          valor: '',
          descricao: '',
          status: 'Ativo'
        });
        setSelectedProducts([]);
      }
    }
  }, [open, subproduto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Pelo menos um produto deve ser associado');
      return;
    }

    setIsLoading(true);

    try {
      const body: any = {
        ...formData,
        valor: parseFloat(formData.valor),
        produtoIds: selectedProducts.map(p => p.id)
      };

      const url = '/api/subprodutos';
      const method = subproduto ? 'PUT' : 'POST';

      if (subproduto) {
        body.id = subproduto.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar sub-produto');
      }

      toast.success(subproduto ? 'Sub-produto atualizado com sucesso!' : 'Sub-produto criado com sucesso!');
      onSaved();
    } catch (error: any) {
      console.error('Erro ao salvar sub-produto:', error);
      toast.error(error.message || 'Erro ao salvar sub-produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (produto: Produto) => {
    if (!selectedProducts.find(p => p.id === produto.id)) {
      setSelectedProducts([...selectedProducts, produto]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {subproduto ? 'Editar Sub-produto' : 'Novo Sub-produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do sub-produto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do sub-produto (opcional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Produtos Associados *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProductModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
              
              {selectedProducts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((produto) => (
                    <Badge
                      key={produto.id}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      {produto.nome}
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(produto.id)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum produto selecionado. É obrigatório associar pelo menos um produto.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : (subproduto ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SelecaoProdutoModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        onSelect={handleProductSelect}
      />
    </>
  );
}