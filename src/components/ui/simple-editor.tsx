'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, Link, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface SimpleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({
  value,
  onChange,
  placeholder,
  style,
  className
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newValue = 
      value.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      value.substring(end);
    
    onChange(newValue);
    
    // Restaurar posição do cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const formatButtons = [
    { icon: Bold, action: () => insertText('**', '**'), title: 'Negrito' },
    { icon: Italic, action: () => insertText('*', '*'), title: 'Itálico' },
    { icon: List, action: () => insertText('\n- ', ''), title: 'Lista' },
    { icon: Link, action: () => insertText('[', '](url)'), title: 'Link' },
  ];

  return (
    <div style={style} className={className}>
      {/* Toolbar simples */}
      <div className="flex gap-1 p-2 border-b bg-gray-50 rounded-t-md">
        {formatButtons.map((button, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={button.action}
            title={button.title}
            className="h-8 w-8 p-0"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[350px] rounded-t-none border-t-0 resize-none"
        style={{ fontFamily: 'monospace' }}
      />
      
      {/* Dica de uso */}
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-b-md border-t">
        Dica: Selecione texto e use os botões acima para formatação básica
      </div>
    </div>
  );
};