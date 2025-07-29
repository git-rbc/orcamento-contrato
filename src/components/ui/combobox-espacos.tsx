'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface EspacoItem {
  id: string;
  nome: string;
  capacidade_maxima: number;
  cidade: string;
}

interface ComboboxEspacosProps {
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  value?: string;
  onSelect?: (item: EspacoItem) => void;
  className?: string;
}

export function ComboboxEspacos({
  placeholder = 'Selecione um espaço...',
  searchPlaceholder = 'Buscar espaços...',
  emptyText = 'Nenhum espaço encontrado.',
  value,
  onSelect,
  className,
}: ComboboxEspacosProps) {
  const [open, setOpen] = React.useState(false);
  const [espacos, setEspacos] = React.useState<EspacoItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Buscar espaços
  const fetchEspacos = React.useCallback(async (q: string = '') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/espacos/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      
      if (data.success) {
        setEspacos(data.data);
      } else {
        setEspacos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar espaços:', error);
      setEspacos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar espaços na inicialização
  React.useEffect(() => {
    fetchEspacos();
  }, [fetchEspacos]);

  // Buscar com delay quando o usuário digita
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 0) {
        fetchEspacos(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchEspacos]);

  const selectedEspaco = espacos.find(espaco => espaco.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedEspaco ? (
            <span className="truncate">
              {selectedEspaco.nome} ({selectedEspaco.capacidade_maxima})
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Carregando...' : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {espacos.map((espaco) => (
                <CommandItem
                  key={espaco.id}
                  value={espaco.nome}
                  onSelect={() => {
                    onSelect?.(espaco);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === espaco.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{espaco.nome}</span>
                    <span className="text-sm text-muted-foreground">
                      {espaco.cidade} • Capacidade: {espaco.capacidade_maxima}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}