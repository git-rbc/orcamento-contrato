'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { ValidacaoDadosForm } from '@/components/contratos/validacao-dados-form';
import { ContratoPublicoViewer } from '@/components/contratos/contrato-publico-viewer';
import { AssinaturaDigitalCanvas } from '@/components/contratos/assinatura-digital-canvas';
import { ConfirmacaoAssinatura } from '@/components/contratos/confirmacao-assinatura';

interface ContratoPublico {
  id: string;
  numero_contrato: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  numero_participantes: number;
  valor_total: string;
  status: string;
  observacoes: string;
  cliente: {
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
  data_criacao: string;
  data_visualizacao?: string;
}

type EtapaFluxo = 'carregando' | 'validacao' | 'visualizacao' | 'assinatura' | 'confirmacao' | 'erro';

export default function ContratoPublicoPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [etapa, setEtapa] = useState<EtapaFluxo>('carregando');
  const [contrato, setContrato] = useState<ContratoPublico | null>(null);
  const [dadosValidados, setDadosValidados] = useState<any>(null);
  const [assinaturaId, setAssinaturaId] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  useEffect(() => {
    if (token) {
      carregarContrato();
    }
  }, [token]);

  const carregarContrato = async () => {
    try {
      const response = await fetch(`/api/contrato/publico/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setErro(errorData.error || 'Contrato não encontrado');
        setEtapa('erro');
        return;
      }

      const dadosContrato = await response.json();
      setContrato(dadosContrato);
      setEtapa('validacao');
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
      setErro('Erro ao carregar contrato');
      setEtapa('erro');
    }
  };

  const handleValidacaoSucesso = (dados: any) => {
    setDadosValidados(dados);
    setEtapa('visualizacao');
  };

  const handleIniciarAssinatura = () => {
    setEtapa('assinatura');
  };

  const handleAssinaturaSucesso = (idAssinatura: string, urlPdf: string) => {
    setAssinaturaId(idAssinatura);
    setPdfUrl(urlPdf);
    setEtapa('confirmacao');
  };

  const renderizarEtapa = () => {
    switch (etapa) {
      case 'carregando':
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        );

      case 'erro':
        return (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Erro ao Carregar Contrato
              </h2>
              <p className="text-red-600 mb-4">{erro}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        );

      case 'validacao':
        return (
          <ValidacaoDadosForm
            token={token}
            onSucesso={handleValidacaoSucesso}
          />
        );

      case 'visualizacao':
        return (
          <ContratoPublicoViewer
            contrato={contrato!}
            onIniciarAssinatura={handleIniciarAssinatura}
          />
        );

      case 'assinatura':
        return (
          <AssinaturaDigitalCanvas
            token={token}
            dadosValidados={dadosValidados}
            onSucesso={handleAssinaturaSucesso}
            onVoltar={() => setEtapa('visualizacao')}
          />
        );

      case 'confirmacao':
        return (
          <ConfirmacaoAssinatura
            assinaturaId={assinaturaId}
            pdfUrl={pdfUrl}
            contrato={contrato!}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="/logos/LOGO BRANCA FUNDO TRANSP.png"
                alt="Eventos Indaiatuba"
                width={180}
                height={72}
                className="object-contain"
              />
              <div className="border-l border-slate-600 pl-4">
                <h1 className="text-2xl font-bold text-white">
                  Assinatura Digital de Contrato
                </h1>
                <p className="text-slate-300 text-sm">
                  Eventos Indaiatuba
                </p>
              </div>
            </div>
            
            {contrato && (
              <div className="text-right text-slate-300">
                <p className="text-sm">Contrato</p>
                <p className="font-mono font-semibold">
                  {contrato.numero_contrato}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {etapa !== 'carregando' && etapa !== 'erro' && (
        <div className="bg-slate-800/50 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center space-x-8">
              <div className={`flex items-center space-x-2 ${
                etapa === 'validacao' ? 'text-purple-400' : 
                ['visualizacao', 'assinatura', 'confirmacao'].includes(etapa) ? 'text-green-400' : 'text-slate-500'
              }`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  etapa === 'validacao' ? 'border-purple-400 bg-purple-400 text-white' :
                  ['visualizacao', 'assinatura', 'confirmacao'].includes(etapa) ? 'border-green-400 bg-green-400 text-white' :
                  'border-slate-500'
                }`}>
                  {['visualizacao', 'assinatura', 'confirmacao'].includes(etapa) ? '✓' : '1'}
                </div>
                <span className="text-sm font-medium">Validação</span>
              </div>

              <div className={`w-8 h-0.5 ${
                ['visualizacao', 'assinatura', 'confirmacao'].includes(etapa) ? 'bg-green-400' : 'bg-slate-600'
              }`}></div>

              <div className={`flex items-center space-x-2 ${
                etapa === 'visualizacao' ? 'text-purple-400' : 
                ['assinatura', 'confirmacao'].includes(etapa) ? 'text-green-400' : 'text-slate-500'
              }`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  etapa === 'visualizacao' ? 'border-purple-400 bg-purple-400 text-white' :
                  ['assinatura', 'confirmacao'].includes(etapa) ? 'border-green-400 bg-green-400 text-white' :
                  'border-slate-500'
                }`}>
                  {['assinatura', 'confirmacao'].includes(etapa) ? '✓' : '2'}
                </div>
                <span className="text-sm font-medium">Visualização</span>
              </div>

              <div className={`w-8 h-0.5 ${
                ['assinatura', 'confirmacao'].includes(etapa) ? 'bg-green-400' : 'bg-slate-600'
              }`}></div>

              <div className={`flex items-center space-x-2 ${
                etapa === 'assinatura' ? 'text-purple-400' : 
                etapa === 'confirmacao' ? 'text-green-400' : 'text-slate-500'
              }`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  etapa === 'assinatura' ? 'border-purple-400 bg-purple-400 text-white' :
                  etapa === 'confirmacao' ? 'border-green-400 bg-green-400 text-white' :
                  'border-slate-500'
                }`}>
                  {etapa === 'confirmacao' ? '✓' : '3'}
                </div>
                <span className="text-sm font-medium">Assinatura</span>
              </div>

              <div className={`w-8 h-0.5 ${
                etapa === 'confirmacao' ? 'bg-green-400' : 'bg-slate-600'
              }`}></div>

              <div className={`flex items-center space-x-2 ${
                etapa === 'confirmacao' ? 'text-green-400' : 'text-slate-500'
              }`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  etapa === 'confirmacao' ? 'border-green-400 bg-green-400 text-white' : 'border-slate-500'
                }`}>
                  {etapa === 'confirmacao' ? '✓' : '4'}
                </div>
                <span className="text-sm font-medium">Confirmação</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderizarEtapa()}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-slate-400 text-sm">
            <p>© 2025 Eventos Indaiatuba - Todos os direitos reservados</p>
            <p className="mt-1">
              contato@eventosindaia.com.br | Sistema de Assinatura Digital Segura
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}