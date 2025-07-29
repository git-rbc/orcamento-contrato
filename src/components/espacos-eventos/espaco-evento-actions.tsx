'use client';

import { useState } from 'react';
import { EspacoEvento } from '@/types/database';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
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
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Pencil, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface EspacoEventoActionsProps {
  espaco: EspacoEvento;
  onUpdate?: () => void;
}

export function EspacoEventoActions({ espaco, onUpdate }: EspacoEventoActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { toggleStatus, duplicateEspaco, deleteEspaco } = useEspacosEventos();

  const handleToggleStatus = async () => {
    setLoading(true);
    await toggleStatus(espaco.id, !espaco.ativo);
    onUpdate?.();
    setLoading(false);
  };

  const handleDuplicate = async () => {
    setLoading(true);
    await duplicateEspaco(espaco.id);
    onUpdate?.();
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const success = await deleteEspaco(espaco.id);
    if (success) {
      onUpdate?.();
    }
    setLoading(false);
    setDeleteDialogOpen(false);
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
          
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/espacos-eventos/${espaco.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleDuplicate}
            disabled={loading}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={handleToggleStatus}
            disabled={loading}
          >
            {espaco.ativo ? (
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
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600 focus:text-red-600"
            disabled={loading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir o espaço <strong>{espaco.nome}</strong>?
              </p>
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>Capacidade: {espaco.capacidade_maxima} pessoas</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Cidade: {espaco.cidade}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta ação não poderá ser desfeita.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}