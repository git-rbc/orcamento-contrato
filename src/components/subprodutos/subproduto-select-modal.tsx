'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

interface Subproduto {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
  codigo: string;
  status: string;
}

interface SubprodutoSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (subproduto: Subproduto) => void;
  parentProductId: string;
}

export function SubprodutoSelectModal({ 
  open, 
  onOpenChange, 
  onSelect, 
  parentProductId 
}: SubprodutoSelectModalProps) {
  const [subprodutos, setSubprodutos] = useState<Subproduto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Ativo');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchSubprodutos = async (page = 1, search = '', status = statusFilter, limit = itemsPerPage) => {
    if (!parentProductId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search
      });

      if (status && status !== 'todos') {
        params.append('status', status);
      } else if (!status) {
        params.append('status', 'Ativo');
      }

      const response = await fetch(`/api/produtos/${parentProductId}/subprodutos?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar sub-produtos');

      const data = await response.json();
      setSubprodutos(data.data);
      setTotalItems(data.total);
      setCurrentPage(1); // API não retorna paginação para sub-produtos por produto
      setTotalPages(1);
    } catch (error) {
      console.error('Erro ao buscar sub-produtos:', error);
      toast.error('Erro ao buscar sub-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && parentProductId) {
      setCurrentPage(1);
      fetchSubprodutos(1, searchTerm, statusFilter, itemsPerPage);
    }
  }, [open, parentProductId]);

  useEffect(() => {
    if (open && parentProductId) {
      fetchSubprodutos(1, searchTerm, statusFilter, itemsPerPage);
    }
  }, [searchTerm, statusFilter]);

  const handleSearch = () => {
    fetchSubprodutos(1, searchTerm, statusFilter, itemsPerPage);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('Ativo');
    fetchSubprodutos(1, '', 'Ativo', itemsPerPage);
  };

  const handleSelectSubproduto = (subproduto: Subproduto) => {
    onSelect(subproduto);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Sub-produto</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              
              {(statusFilter !== 'Ativo' || searchTerm) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto min-h-0">
            <div className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : subprodutos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {parentProductId ? 
                    'Nenhum sub-produto encontrado para este produto.' :
                    'Produto não selecionado.'
                  }
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Código</th>
                          <th className="text-left p-2 font-medium">Sub-produto</th>
                          <th className="text-left p-2 font-medium">Valor</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-center p-2 font-medium">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subprodutos.map((subproduto) => (
                          <tr
                            key={subproduto.id}
                            className="border-b hover:bg-muted/50 transition-colors duration-200"
                          >
                            <td className="p-2 font-mono text-sm">{subproduto.codigo}</td>
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{subproduto.nome}</div>
                                {subproduto.descricao && (
                                  <div className="text-sm text-muted-foreground">
                                    {subproduto.descricao}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <span>
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(subproduto.valor)}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                subproduto.status === 'Ativo' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {subproduto.status}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <Button 
                                size="sm" 
                                onClick={() => handleSelectSubproduto(subproduto)}
                                disabled={subproduto.status !== 'Ativo'}
                              >
                                Selecionar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}