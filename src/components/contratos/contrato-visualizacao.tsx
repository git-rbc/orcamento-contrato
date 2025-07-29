'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileText, 
  Edit,
  Send,
  Download
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { ContratoPdfViewer } from './contrato-pdf-viewer';
import { generatePDFAndUpload } from '@/lib/pdf-utils';

interface Contrato {
  id: string;
  numero_contrato: string;
  cliente_id: string;
  vendedor_id: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  numero_participantes: number;
  valor_total: string;
  status: string;
  data_criacao: string;
  data_envio: string | null;
  data_assinatura: string | null;
  observacoes: string;
  arquivo_pdf: string | null;
  arquivo_assinado: string | null;
  cliente: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cpf_cnpj: string;
    tipo_pessoa: string;
    endereco: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
  };
}

const statusColors = {
  rascunho: 'bg-gray-100 text-gray-800',
  enviado: 'bg-blue-100 text-blue-800',
  assinado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

const statusLabels = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado'
};

interface ContratoVisualizacaoProps {
  contratoId: string;
}

export function ContratoVisualizacao({ contratoId }: ContratoVisualizacaoProps) {
  const router = useRouter();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [vendedorNome, setVendedorNome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const fetchContrato = async () => {
      try {
        const supabase = createClient();
        
        // Buscar contrato completo
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select(`
            *,
            cliente:clientes(*)
          `)
          .eq('id', contratoId)
          .single();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
          setError('Contrato não encontrado');
          return;
        }

        setContrato(contratoData);

        // Buscar nome do vendedor
        if (contratoData.vendedor_id) {
          const { data: vendedor } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', contratoData.vendedor_id)
            .single();
          
          if (vendedor) {
            setVendedorNome(vendedor.nome);
          }
        }

      } catch (error) {
        console.error('Erro ao carregar contrato:', error);
        setError('Erro ao carregar contrato');
      } finally {
        setLoading(false);
      }
    };

    if (contratoId) {
      fetchContrato();
    }
  }, [contratoId]);

  const handleExportPDF = async () => {
    if (!contrato) return;

    try {
      setExportingPdf(true);
      
      // Usar o conteúdo do PDF viewer para gerar o PDF
      const pdfContent = document.getElementById('contrato-pdf-content');
      if (!pdfContent) {
        alert('Erro: Conteúdo do contrato não encontrado');
        return;
      }

      const result = await generatePDFAndUpload(
        contrato.numero_contrato,
        contrato.cliente.nome,
        pdfContent.innerHTML
      );
      
      if (result.success && result.url) {
        // Atualizar o contrato com o URL do PDF
        const supabase = createClient();
        await supabase
          .from('contratos')
          .update({ arquivo_pdf: result.url })
          .eq('id', contrato.id);

        alert('PDF gerado e salvo com sucesso!');
        
        // Abrir o PDF em nova aba
        window.open(result.url, '_blank');
      } else {
        alert(result.error || 'Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Visualizar Contrato</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Visualizar Contrato</h1>
        </div>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Contrato não encontrado</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{contrato.numero_contrato}</h1>
            <p className="text-muted-foreground">
              Contrato de {contrato.cliente.nome}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={statusColors[contrato.status as keyof typeof statusColors]}>
            {statusLabels[contrato.status as keyof typeof statusLabels]}
          </Badge>
          
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          
          {contrato.status === 'rascunho' && (
            <Button size="sm">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPdf}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportingPdf ? 'Gerando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Visualização do contrato em formato PDF */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <ContratoPdfViewer 
          contrato={contrato} 
          vendedorNome={vendedorNome}
        />
      </div>
    </div>
  );
}