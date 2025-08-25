'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubprodutosListProps {
  onEdit: (subproduto: any) => void;
  refreshTrigger: number;
}

export function SubprodutosList({ onEdit, refreshTrigger }: SubprodutosListProps) {
  const [subprodutos, setSubprodutos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubproduto, setDeletingSubproduto] = useState<any>(null);

  const fetchSubprodutos = async (page = 1, search = '', status = '', limit = itemsPerPage) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      if (status && status !== 'todos') {
        params.append('status', status);
      }

      const response = await fetch(`/api/subprodutos?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar sub-produtos');

      const data = await response.json();
      setSubprodutos(data.data);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao buscar sub-produtos:', error);
      toast.error('Erro ao buscar sub-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubprodutos(1, searchTerm, statusFilter, itemsPerPage);
  }, [refreshTrigger, searchTerm, statusFilter, itemsPerPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSubprodutos(1, searchTerm, statusFilter, itemsPerPage);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setCurrentPage(1);
    fetchSubprodutos(1, '', '', itemsPerPage);
  };

  const handleDeleteClick = (subproduto: any) => {
    setDeletingSubproduto(subproduto);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSubproduto) return;

    try {
      const response = await fetch(`/api/subprodutos?id=${deletingSubproduto.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar sub-produto');
      }

      toast.success('Sub-produto deletado com sucesso!');
      fetchSubprodutos(currentPage, searchTerm, statusFilter, itemsPerPage);
    } catch (error: any) {
      console.error('Erro ao deletar sub-produto:', error);
      toast.error(error.message || 'Erro ao deletar sub-produto');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingSubproduto(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatProducts = (produtos: any[]) => {
    if (!produtos || produtos.length === 0) return 'Nenhum produto associado';
    return produtos.map(assoc => assoc.produto?.nome || 'Produto não encontrado');
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || (statusFilter && statusFilter !== 'todos')) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : subprodutos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum sub-produto encontrado.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Código</th>
                    <th className="text-left p-4 font-medium">Nome</th>
                    <th className="text-left p-4 font-medium">Valor</th>
                    <th className="text-left p-4 font-medium">Produtos Associados</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-center p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {subprodutos.map((subproduto) => (
                    <tr
                      key={subproduto.id}
                      className="border-b hover:bg-muted/25 transition-colors"
                    >
                      <td className="p-4 font-mono text-sm">{subproduto.codigo}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{subproduto.nome}</div>
                          {subproduto.descricao && (
                            <div className="text-sm text-muted-foreground">
                              {subproduto.descricao}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium">
                        {formatCurrency(subproduto.valor)}
                      </td>
                      <td className="p-4">
                        {subproduto.produtos_associados?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subproduto.produtos_associados.map((assoc: any, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {assoc.produto?.nome || 'N/A'}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum produto</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={subproduto.status === 'Ativo' ? 'default' : 'secondary'}
                          className={subproduto.status === 'Ativo' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {subproduto.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(subproduto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(subproduto)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} a{' '}
                    {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} itens
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const limit = Number(e.target.value);
                      setItemsPerPage(limit);
                      setCurrentPage(1);
                      fetchSubprodutos(1, searchTerm, statusFilter, limit);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10 por página</option>
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSubprodutos(currentPage - 1, searchTerm, statusFilter, itemsPerPage)}
                    disabled={currentPage <= 1}
                  >
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchSubprodutos(pageNum, searchTerm, statusFilter, itemsPerPage)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSubprodutos(currentPage + 1, searchTerm, statusFilter, itemsPerPage)}
                    disabled={currentPage >= totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o sub-produto "{deletingSubproduto?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}