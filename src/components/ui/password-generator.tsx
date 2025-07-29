'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { gerarSenhaAutomatica, copiarParaClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface PasswordGeneratorProps {
  value: string;
  onChange: (password: string) => void;
  label?: string;
  placeholder?: string;
  readonly?: boolean;
  showGenerator?: boolean;
  className?: string;
}

export function PasswordGenerator({
  value,
  onChange,
  label = "Senha",
  placeholder = "Senha gerada aparecerá aqui",
  readonly = false,
  showGenerator = true,
  className = ""
}: PasswordGeneratorProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const novaSenha = gerarSenhaAutomatica(12);
    onChange(novaSenha);
    toast.success('Nova senha gerada!');
  };

  const handleCopy = async () => {
    if (value) {
      const sucesso = await copiarParaClipboard(value);
      if (sucesso) {
        setCopied(true);
        toast.success('Senha copiada para a área de transferência!');
        setTimeout(() => setCopied(false), 3000);
      } else {
        toast.error('Erro ao copiar senha');
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="password-field">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="password-field"
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => !readonly && onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readonly}
            className="pr-20"
          />
          <div className="absolute right-2 top-0 h-full flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {showGenerator && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            title="Gerar nova senha"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={copied}
            title="Copiar senha"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      {value && (
        <div className="text-xs text-muted-foreground">
          Força: <span className="font-medium text-green-600">Forte</span> • 
          Tamanho: {value.length} caracteres
        </div>
      )}
    </div>
  );
} 