'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Produto, PaginatedResponse } from '@/types/database';
import { toast } from 'sonner';

interface SelecaoProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (produto: Produto) => void;
  seguimentoFiltro?: 'alimentos' | 'bebidas' | 'decoracao' | 'itens_extra' | null;
}

export function SelecaoProdutoModal({ open, onOpenChange, onSelect, seguimentoFiltro }: SelecaoProdutoModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [seguimentoAtivo, setSeguimentoAtivo] = useState<string | null>(seguimentoFiltro || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchProdutos = async (page = 1, search = '', limit = itemsPerPage, seguimento = seguimentoAtivo) => {
    const cacheKey = `produtos_search_cache_${search}_${seguimento || 'todos'}_page_${page}_limit_${limit}`;
    
    // Desabilitar cache quando há seguimento específico para garantir dados corretos
    let usarCache = !seguimento;
    let cachedItem = null;
    
    if (usarCache) {
      cachedItem = localStorage.getItem(cacheKey);
      if (cachedItem) {
        const { timestamp, data } = JSON.parse(cachedItem);
        const isCacheValid = (new Date().getTime() - timestamp) < 24 * 60 * 60 * 1000; // 24 hours
        
        if (isCacheValid) {
          setProdutos(data.data);
          setTotalPages(data.totalPages);
          setTotalProdutos(data.total);
          setCurrentPage(page);
          return;
        }
      }
    }
    
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status: 'Ativo'
      });

      // Adicionar filtro de seguimento se estiver ativo
      if (seguimento) {
        params.append('seguimento', seguimento);
        console.log('🔍 Aplicando filtro de seguimento:', seguimento);
      }

      const response = await fetch(`/api/produtos?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar produtos');

      const data: PaginatedResponse<Produto> = await response.json();
      
      // Salvar no cache apenas se não há seguimento específico
      if (usarCache) {
        const cacheData = {
          timestamp: new Date().getTime(),
          data,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      }

      setProdutos(data.data);
      setTotalPages(data.totalPages);
      setTotalProdutos(data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (open) {
      setSeguimentoAtivo(seguimentoFiltro || null);
      setCurrentPage(1);
      fetchProdutos(1, searchTerm, itemsPerPage, seguimentoFiltro || null);
    }
  }, [open, seguimentoFiltro]);

  useEffect(() => {
    if (open && !seguimentoFiltro) {
      fetchProdutos(1, searchTerm, itemsPerPage, seguimentoAtivo);
    }
  }, [searchTerm, itemsPerPage]);

  const handleSeguimentoChange = (value: string) => {
    const novoSeguimento = value === 'todos' ? null : value;
    setSeguimentoAtivo(novoSeguimento);
    setCurrentPage(1);
    fetchProdutos(1, searchTerm, itemsPerPage, novoSeguimento);
  };

  const limparFiltros = () => {
    setSeguimentoAtivo(null);
    setSearchTerm('');
    setCurrentPage(1);
    fetchProdutos(1, '', itemsPerPage, null);
  };

  const handleSelectProduct = (produto: Produto) => {
    onSelect(produto);
    onOpenChange(false);
  };

  const columns = [
    {
      key: 'nome' as keyof Produto,
      header: 'Produto',
      render: (value: any, produto: Produto) => (
        <div>
          <div className="font-medium">{produto.nome}</div>
          <div className="text-sm text-muted-foreground">{produto.categoria_nome}</div>
        </div>
      )
    },
    {
      key: 'valor' as keyof Produto,
      header: 'Valor',
      render: (value: any, produto: Produto) => (
        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valor)}</span>
      )
    },
    {
      key: 'acoes',
      header: 'Ação',
      render: (value: any, produto: Produto) => (
        <Button size="sm" onClick={() => handleSelectProduct(produto)}>Selecionar</Button>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchProdutos(1, searchTerm, itemsPerPage, seguimentoAtivo);
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={() => fetchProdutos(1, searchTerm, itemsPerPage, seguimentoAtivo)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={seguimentoAtivo || 'todos'} onValueChange={handleSeguimentoChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os seguimentos</SelectItem>
                  <SelectItem value="alimentos">Alimentos</SelectItem>
                  <SelectItem value="bebidas">Bebidas</SelectItem>
                  <SelectItem value="decoracao">Decoração</SelectItem>
                  <SelectItem value="itens_extra">Itens Extra</SelectItem>
                </SelectContent>
              </Select>
              
              {(seguimentoAtivo || searchTerm) && (
                <Button variant="outline" size="sm" onClick={limparFiltros}>
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
              ) : produtos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum produto encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          {columns.map((column) => (
                            <th
                              key={column.key}
                              className="text-left p-2 font-medium"
                            >
                              {column.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {produtos.map((produto) => (
                          <tr
                            key={produto.id}
                            className="border-b hover:bg-muted/50 transition-colors duration-200"
                          >
                            {columns.map((column) => (
                              <td key={column.key} className="p-2">
                                {column.render
                                  ? column.render((produto as any)[column.key], produto)
                                  : (produto as any)[column.key]
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 bg-background p-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalProdutos)} a{' '}
                          {Math.min(currentPage * itemsPerPage, totalProdutos)} de {totalProdutos} itens
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            const limit = Number(e.target.value);
                            setItemsPerPage(limit);
                            setCurrentPage(1);
                            fetchProdutos(1, searchTerm, limit, seguimentoAtivo);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10 por página</option>
                          <option value={25}>25 por página</option>
                          <option value={50}>50 por página</option>
                          <option value={100}>100 por página</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchProdutos(currentPage - 1, searchTerm, itemsPerPage, seguimentoAtivo)}
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
                                onClick={() => fetchProdutos(pageNum, searchTerm, itemsPerPage, seguimentoAtivo)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchProdutos(currentPage + 1, searchTerm, itemsPerPage, seguimentoAtivo)}
                          disabled={currentPage >= totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 