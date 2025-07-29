'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Interface para as props do editor
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}

// Importação dinâmica do ReactQuill
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    
    // Função para criar um componente wrapper que evita o findDOMNode
    const QuillWrapper = ({ forwardedRef, ...props }: any) => {
      return <RQ ref={forwardedRef} {...props} />;
    };
    
    return QuillWrapper;
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
        <p className="text-gray-500">Carregando editor...</p>
      </div>
    ),
  }
);

// Configuração dos módulos do editor
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    [{ align: [] }],
    ['clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
};

// Formatos permitidos no editor
const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'indent',
  'align',
  'link',
];

/**
 * Componente Editor de Texto Rico (WYSIWYG) baseado no ReactQuill.
 * Otimizado para Next.js com importação dinâmica para evitar problemas de SSR.
 */
export const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  style, 
  className 
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[400px] bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
        <p className="text-gray-500">Carregando editor...</p>
      </div>
    );
  }

  return (
    <div style={style} className={className}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
      />
    </div>
  );
};