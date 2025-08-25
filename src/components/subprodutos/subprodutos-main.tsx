'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SubprodutosList } from './subprodutos-list';
import { SubprodutoModal } from './subproduto-modal';

export function SubprodutosMain() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubproduto, setEditingSubproduto] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreate = () => {
    setEditingSubproduto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subproduto: any) => {
    setEditingSubproduto(subproduto);
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setIsModalOpen(false);
    setEditingSubproduto(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingSubproduto(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sub-produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os sub-produtos e suas associações com produtos principais
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Sub-produto
        </Button>
      </div>

      <SubprodutosList 
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
      />

      <SubprodutoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        subproduto={editingSubproduto}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    </div>
  );
}