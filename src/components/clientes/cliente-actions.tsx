'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Edit, 
  Trash2, 
  MoreVertical, 
  UserCheck, 
  UserX,
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ClienteForm } from './cliente-form';
import { Cliente } from '@/types/database';

interface ClienteActionsProps {
  cliente: Cliente;
  onUpdate?: () => void; // Callback para atualizar a lista
  onSuccess?: () => void; // Callback para quando uma ação é bem-sucedida
}

export function ClienteActions({ cliente, onUpdate, onSuccess }: ClienteActionsProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Função para alternar status ativo/inativo
  const handleToggleStatus = async () => {
    setIsLoading(true);
    try {
      const acao = cliente.ativo ? 'desativar' : 'ativar';
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acao }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      toast.success(result.message);
      setIsToggleDialogOpen(false);
      onUpdate?.(); // Atualizar a lista
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para excluir cliente
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      toast.success(result.message);
      setIsDeleteDialogOpen(false);
      onUpdate?.(); // Atualizar a lista
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir cliente');
    } finally {
      setIsLoading(false);
    }
  };

  // Função chamada quando o modal de edição é fechado com sucesso
  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    onUpdate?.(); // Atualizar a lista
    onSuccess?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setIsToggleDialogOpen(true)}>
            {cliente.ativo ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Desativar
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Ativar
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Edite as informações do cliente {cliente.nome}
            </DialogDescription>
          </DialogHeader>
          
          <ClienteForm 
            cliente={cliente} 
            mode="edit" 
            onSuccess={handleEditSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Alternar Status */}
      <Dialog open={isToggleDialogOpen} onOpenChange={setIsToggleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cliente.ativo ? (
                <UserX className="h-5 w-5 text-orange-500" />
              ) : (
                <UserCheck className="h-5 w-5 text-green-500" />
              )}
              {cliente.ativo ? 'Desativar' : 'Ativar'} Cliente
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja {cliente.ativo ? 'desativar' : 'ativar'} o cliente{' '}
              <strong>{cliente.nome}</strong>?
              {cliente.ativo && (
                <span className="block mt-2 text-orange-600">
                  ⚠️ Cliente desativado não aparecerá em buscas por padrão.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsToggleDialogOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant={cliente.ativo ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : (cliente.ativo ? 'Desativar' : 'Ativar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Cliente
            </DialogTitle>
            <DialogDescription>
              <span className="block mb-2">
                Tem certeza que deseja excluir permanentemente o cliente{' '}
                <strong>{cliente.nome}</strong>?
              </span>
              <span className="block text-red-600 font-medium">
                ⚠️ Esta ação não pode ser desfeita!
              </span>
              <span className="block mt-2 text-sm text-muted-foreground">
                Nota: Clientes com contratos não podem ser excluídos. 
                Consider desativar o cliente ao invés de excluir.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 