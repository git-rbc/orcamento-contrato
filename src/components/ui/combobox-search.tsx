import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchItem {
  id?: string;
  value?: string;
  nome?: string;
  label?: string;
  cpf_cnpj?: string;
  valor_unitario?: number;
  categoria?: string;
  unidade_medida?: string;
}

interface ComboboxSearchProps {
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  value?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSelect: (item: SearchItem | null) => void;
  items: SearchItem[];
  loading: boolean;
  formatDisplay?: (item: SearchItem) => string;
  className?: string;
}

export function ComboboxSearch({
  placeholder = "Selecione...",
  searchPlaceholder = "Pesquisar...",
  emptyText = "Nenhum resultado encontrado.",
  value,
  inputValue,
  onInputChange,
  onSelect,
  items,
  loading,
  formatDisplay,
  className
}: ComboboxSearchProps) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatItemDisplay = (item: SearchItem) => {
    if (formatDisplay) {
      return formatDisplay(item);
    }
    if (item.label) {
      return item.label;
    }
    return item.cpf_cnpj ? `${item.nome} - ${item.cpf_cnpj}` : item.nome;
  };

  const handleSelect = (item: SearchItem) => {
    setSelectedItem(item);
    onSelect(item);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedItem(null);
    onSelect(null);
  };

  useEffect(() => {
    if (value && items.length > 0) {
      const foundItem = items.find(item => item.id === value);
      if (foundItem) {
        setSelectedItem(foundItem);
      }
    } else if (!value) {
      setSelectedItem(null);
    }
  }, [value, items]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Focar no input quando abrir
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
      >
        <span className={cn("truncate", !selectedItem && "text-muted-foreground")}>
          {selectedItem ? formatItemDisplay(selectedItem) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedItem && (
            <X 
              className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100" 
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </Button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          <div className="max-h-48 overflow-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.value || item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === (item.value || item.id) && "bg-accent text-accent-foreground"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === (item.value || item.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label || item.nome}</span>
                    {item.cpf_cnpj && (
                      <span className="text-xs text-muted-foreground">
                        {item.cpf_cnpj}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 