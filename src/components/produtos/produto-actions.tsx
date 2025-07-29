'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Produto } from '@/types/database';

interface ProdutoActionsProps {
  produto: Produto;
  onUpdate: () => void;
}

export function ProdutoActions({ produto, onUpdate }: ProdutoActionsProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleEdit = () => {
    router.push(`/dashboard/produtos/${produto.id}/editar`);
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...produto,
          nome: `${produto.nome} (Cópia)`,
          id: undefined,
          created_at: undefined,
          updated_at: undefined
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao duplicar produto');
      }

      toast.success('Produto duplicado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao duplicar produto:', error);
      toast.error('Erro ao duplicar produto');
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    const novoStatus = produto.status === 'Ativo' ? 'Inativo' : 'Ativo';

    try {
      const response = await fetch(`/api/produtos/${produto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: novoStatus
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar status');
      }

      toast.success(`Produto ${novoStatus.toLowerCase()} com sucesso!`);
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do produto');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/produtos/${produto.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir produto');
      }

      toast.success('Produto excluído com sucesso!');
      setIsDeleteOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleToggleStatus}
            disabled={isToggling}
          >
            {produto.status === 'Ativo' ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Inativar
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Ativar
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsDeleteOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o produto "{produto.nome}"? 
              Esta ação não pode ser desfeita.
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
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 