'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface CalendarFiltersProps {
  filters: {
    espacoId: string;
    status: string;
    clienteId: string;
  };
  onFiltersChange: (filters: any) => void;
  espacos: any[];
  clientes: any[];
}

export function CalendarFilters({
  filters,
  onFiltersChange,
  espacos,
  clientes
}: CalendarFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      espacoId: '',
      status: '',
      clienteId: ''
    });
  };

  const hasActiveFilters = filters.espacoId || filters.status || filters.clienteId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro por Espaço */}
        <div className="space-y-2">
          <Label htmlFor="espaco-filter">Espaço</Label>
          <Select
            value={filters.espacoId}
            onValueChange={(value) => handleFilterChange('espacoId', value)}
          >
            <SelectTrigger id="espaco-filter">
              <SelectValue placeholder="Todos os espaços" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os espaços</SelectItem>
              {espacos.map((espaco) => (
                <SelectItem key={espaco.id} value={espaco.id}>
                  {espaco.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Status */}
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Cliente */}
        <div className="space-y-2">
          <Label htmlFor="cliente-filter">Cliente</Label>
          <Select
            value={filters.clienteId}
            onValueChange={(value) => handleFilterChange('clienteId', value)}
          >
            <SelectTrigger id="cliente-filter">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os clientes</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legenda de Cores */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Legenda</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm text-muted-foreground">Confirmado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-sm text-muted-foreground">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm text-muted-foreground">Cancelado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full" />
              <span className="text-sm text-muted-foreground">Data Bloqueada</span>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Resultados</h4>
            <div className="text-sm text-muted-foreground">
              Mostrando eventos filtrados
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}