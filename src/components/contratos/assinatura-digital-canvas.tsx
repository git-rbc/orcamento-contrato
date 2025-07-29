'use client';

import { useRef, useState, useEffect } from 'react';

interface AssinaturaDigitalCanvasProps {
  token: string;
  dadosValidados: any;
  onSucesso: (assinaturaId: string, pdfUrl: string) => void;
  onVoltar: () => void;
}

export function AssinaturaDigitalCanvas({ 
  token, 
  dadosValidados, 
  onSucesso, 
  onVoltar 
}: AssinaturaDigitalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Limpar canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Suporte para touch (mobile)
  const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const touchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const processarAssinatura = async () => {
    if (!hasSignature) {
      setErro('Por favor, faça sua assinatura no campo acima');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setCarregando(true);
    setErro('');

    try {
      // Converter canvas para base64
      const assinaturaBase64 = canvas.toDataURL('image/png');

      // Enviar para API
      const response = await fetch(`/api/contrato/publico/${token}/assinar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assinatura_base64: assinaturaBase64,
          cpf_cnpj: dadosValidados.cpf_cnpj,
          nome_completo: dadosValidados.nome_completo
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao processar assinatura');
        return;
      }

      // Sucesso na assinatura
      onSucesso(data.assinatura_id, data.pdf_url);
    } catch (error) {
      console.error('Erro ao processar assinatura:', error);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Assinatura Digital
            </h2>
            <p className="text-slate-600">
              Desenhe sua assinatura no campo abaixo
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Informações do signatário */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-2">Dados Validados:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Nome:</span> {dadosValidados.nome_completo}
              </div>
              <div>
                <span className="font-medium">Documento:</span> {dadosValidados.cpf_cnpj}
              </div>
            </div>
          </div>

          {/* Canvas de assinatura */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assinatura (desenhe no campo abaixo)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full border border-slate-200 rounded bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startTouchDrawing}
                onTouchMove={touchDraw}
                onTouchEnd={stopTouchDrawing}
                style={{ touchAction: 'none' }}
              />
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-slate-500">
                  Use o mouse ou toque na tela para desenhar sua assinatura
                </p>
                <button
                  onClick={limparAssinatura}
                  className="text-sm text-slate-600 hover:text-slate-800 underline"
                  type="button"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{erro}</p>
              </div>
            </div>
          )}

          {/* Avisos legais */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-blue-700 text-sm">
                <p className="font-semibold mb-1">Validade Jurídica:</p>
                <p>Esta assinatura digital possui a mesma validade jurídica de uma assinatura manuscrita, conforme a MP 2.200-2/2001 e Lei 14.063/2020.</p>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-between space-x-4">
            <button
              onClick={onVoltar}
              disabled={carregando}
              className="flex-1 px-6 py-3 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Voltar
            </button>
            
            <button
              onClick={processarAssinatura}
              disabled={carregando || !hasSignature}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {carregando ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </div>
              ) : (
                'Confirmar Assinatura'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}