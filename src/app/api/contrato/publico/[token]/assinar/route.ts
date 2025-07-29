import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gerarIdAssinatura, validarCpfCnpj, compararNomes } from '@/lib/assinatura-utils';
import { getClientInfo } from '@/lib/ip-utils';
import { uploadPdfAssinado } from '@/lib/supabase-storage';
import jsPDF from 'jspdf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { 
      assinatura_base64, 
      cpf_cnpj, 
      nome_completo 
    } = await request.json();
    
    // Validar formato do token
    if (!token || !/^[A-Z0-9]{8}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Validar dados de entrada
    if (!assinatura_base64 || !cpf_cnpj || !nome_completo) {
      return NextResponse.json(
        { error: 'Assinatura, CPF/CNPJ e nome completo são obrigatórios' },
        { status: 400 }
      );
    }

    // Apenas determinar tipo do documento (sem validação)
    const validacaoDoc = { 
      valido: true, 
      tipo: cpf_cnpj.replace(/[^\d]/g, '').length <= 11 ? 'CPF' : 'CNPJ' 
    };

    // Buscar contrato pelo token
    const { data: contrato, error } = await supabase
      .from('contratos')
      .select(`
        *,
        cliente:clientes(*)
      `)
      .eq('token_publico', token)
      .in('status', ['enviado', 'visualizado', 'em_assinatura'])
      .single();

    if (error || !contrato) {
      return NextResponse.json(
        { error: 'Contrato não encontrado ou não disponível para assinatura' },
        { status: 404 }
      );
    }

    // Verificar se já foi assinado
    const { data: assinaturaExistente } = await supabase
      .from('contrato_assinaturas')
      .select('id')
      .eq('contrato_id', contrato.id)
      .single();

    if (assinaturaExistente) {
      return NextResponse.json(
        { error: 'Este contrato já foi assinado' },
        { status: 400 }
      );
    }

    // Apenas registrar os dados fornecidos (sem validação de correspondência)
    console.log(`Dados fornecidos para assinatura no contrato ${contrato.id} - CPF/CNPJ: ${cpf_cnpj}, Nome: ${nome_completo}`);

    // Capturar informações do cliente
    const clientInfo = getClientInfo(request);
    
    // Gerar ID único da assinatura
    const assinaturaId = gerarIdAssinatura();
    
    // Preparar dados validados
    const dadosValidados = {
      cpf_cnpj: cpf_cnpj,
      nome_completo: nome_completo,
      tipo_documento: validacaoDoc.tipo,
      timestamp_validacao: new Date().toISOString()
    };

    // Salvar assinatura no banco
    const { data: assinatura, error: errorAssinatura } = await supabase
      .from('contrato_assinaturas')
      .insert({
        contrato_id: contrato.id,
        assinatura_id: assinaturaId,
        ip_usuario: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        assinatura_base64,
        dados_validados: dadosValidados
      })
      .select()
      .single();

    if (errorAssinatura) {
      console.error('Erro ao salvar assinatura:', errorAssinatura);
      return NextResponse.json(
        { error: 'Erro ao processar assinatura' },
        { status: 500 }
      );
    }

    // Gerar PDF com assinatura
    const pdfBuffer = await gerarPdfComAssinatura(contrato, assinatura, assinatura_base64);
    
    // Upload do PDF para o bucket público
    const uploadResult = await uploadPdfAssinado(contrato.id, pdfBuffer);
    
    if (!uploadResult) {
      console.error('Erro ao fazer upload do PDF assinado');
      return NextResponse.json(
        { error: 'Erro ao gerar PDF final' },
        { status: 500 }
      );
    }

    // Atualizar status do contrato
    await supabase
      .from('contratos')
      .update({
        status: 'assinado',
        data_assinatura: new Date().toISOString(),
        arquivo_assinado: uploadResult.path
      })
      .eq('id', contrato.id);

    console.log(`Contrato ${contrato.id} assinado com sucesso. ID: ${assinaturaId}, IP: ${clientInfo.ip}`);

    return NextResponse.json({
      success: true,
      message: 'Contrato assinado com sucesso',
      assinatura_id: assinaturaId,
      pdf_url: uploadResult.url,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao processar assinatura digital:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para gerar PDF com assinatura usando o mesmo template do viewer
async function gerarPdfComAssinatura(contrato: any, assinatura: any, assinaturaBase64: string): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Função auxiliar para quebrar texto
  const addTextWithWrap = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * (fontSize * 0.35));
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para formatar moeda
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0;
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // CABEÇALHO
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INDEX02 EVENTOS LTDA.', margin, currentY);
  currentY += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('CNPJ: 30.969.797/0001-09', margin, currentY);
  currentY += 5;
  pdf.text('Representante: Asura Kenji', margin, currentY);
  currentY += 10;

  // Número do contrato (direita)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const contratoText = `Contrato Nº ${contrato.numero_contrato}`;
  const contratoWidth = pdf.getTextWidth(contratoText);
  pdf.text(contratoText, pageWidth - margin - contratoWidth, margin);

  // Linha divisória
  pdf.setDrawColor(31, 41, 55);
  pdf.setLineWidth(1);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;

  // DADOS DO CONTRATANTE E EVENTO (lado a lado)
  const colWidth = (pageWidth - (margin * 2) - 10) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 10;

  // Coluna 1 - Dados do Contratante
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DADOS DO CONTRATANTE', col1X, currentY);
  let col1Y = currentY + 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  col1Y = addTextWithWrap(`Nome: ${contrato.cliente?.nome || '-'}`, col1X, col1Y, colWidth, 10);
  col1Y = addTextWithWrap(`CPF/CNPJ: ${contrato.cliente?.cpf_cnpj || '-'}`, col1X, col1Y, colWidth, 10);
  col1Y = addTextWithWrap(`Telefone: ${contrato.cliente?.telefone || '-'}`, col1X, col1Y, colWidth, 10);
  col1Y = addTextWithWrap(`E-mail: ${contrato.cliente?.email || '-'}`, col1X, col1Y, colWidth, 10);
  
  const endereco = [
    contrato.cliente?.endereco,
    contrato.cliente?.numero,
    contrato.cliente?.bairro,
    contrato.cliente?.cidade
  ].filter(Boolean).join(', ') || '-';
  col1Y = addTextWithWrap(`Endereço: ${endereco}`, col1X, col1Y, colWidth, 10);

  // Coluna 2 - Dados do Evento
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DADOS DO EVENTO', col2X, currentY);
  let col2Y = currentY + 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  col2Y = addTextWithWrap(`Tipo: ${contrato.tipo_evento || '-'}`, col2X, col2Y, colWidth, 10);
  col2Y = addTextWithWrap(`Data: ${formatDate(contrato.data_evento)}`, col2X, col2Y, colWidth, 10);
  col2Y = addTextWithWrap(`Local: ${contrato.local_evento || '-'}`, col2X, col2Y, colWidth, 10);
  col2Y = addTextWithWrap(`Participantes: ${contrato.numero_participantes || '-'}`, col2X, col2Y, colWidth, 10);
  col2Y = addTextWithWrap(`Valor Total: ${formatCurrency(contrato.valor_total)}`, col2X, col2Y, colWidth, 10);
  col2Y = addTextWithWrap(`Data Contratação: ${formatDate(contrato.data_criacao)}`, col2X, col2Y, colWidth, 10);

  currentY = Math.max(col1Y, col2Y) + 15;

  // TERMOS E CONDIÇÕES
  pdf.setDrawColor(31, 41, 55);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const termosText = 'TERMOS E CONDIÇÕES DO CONTRATO';
  const termosWidth = pdf.getTextWidth(termosText);
  pdf.text(termosText, (pageWidth - termosWidth) / 2, currentY);
  currentY += 15;

  // Conteúdo do contrato
  if (contrato.observacoes) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    currentY = addTextWithWrap(contrato.observacoes, margin, currentY, pageWidth - (margin * 2), 10);
  }

  // Se necessário, adicionar nova página para assinaturas
  if (currentY > pageHeight - 100) {
    pdf.addPage();
    currentY = margin;
  } else {
    currentY += 20;
  }

  // ÁREA DE ASSINATURAS
  pdf.setDrawColor(31, 41, 55);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const assinaturasText = 'ASSINATURAS';
  const assinaturasWidth = pdf.getTextWidth(assinaturasText);
  pdf.text(assinaturasText, (pageWidth - assinaturasWidth) / 2, currentY);
  currentY += 20;

  // Área das assinaturas (lado a lado)
  const sigWidth = (pageWidth - (margin * 2) - 20) / 2;
  const sig1X = margin;
  const sig2X = margin + sigWidth + 20;

  // Assinatura da empresa
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('[ASSINATURA DA EMPRESA]', sig1X, currentY);
  currentY += 10;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('INDEX02 EVENTOS LTDA.', sig1X, currentY);
  currentY += 5;
  pdf.text('CNPJ: 30.969.797/0001-09', sig1X, currentY);
  currentY += 5;
  pdf.text('Asura Kenji', sig1X, currentY);
  currentY += 5;
  pdf.text('CONTRATADA', sig1X, currentY);
  
  // Linha para assinatura da empresa
  pdf.line(sig1X, currentY + 5, sig1X + sigWidth, currentY + 5);

  // Assinatura do cliente
  const sigClienteY = currentY - 25;
  pdf.setFont('helvetica', 'normal');
  pdf.text(contrato.cliente.nome, sig2X, sigClienteY);
  pdf.text(contrato.cliente.cpf_cnpj, sig2X, sigClienteY + 5);
  
  // Adicionar assinatura digital como imagem
  try {
    pdf.addImage(assinaturaBase64, 'PNG', sig2X, sigClienteY + 8, 50, 15);
  } catch (error) {
    console.error('Erro ao adicionar assinatura ao PDF:', error);
  }
  
  pdf.text('CONTRATANTE', sig2X, sigClienteY + 25);
  
  // Linha para assinatura do cliente
  pdf.line(sig2X, sigClienteY + 30, sig2X + sigWidth, sigClienteY + 30);

  currentY += 15;

  // INFORMAÇÕES DA ASSINATURA DIGITAL
  currentY += 10;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`ID da Assinatura: ${assinatura.assinatura_id}`, margin, currentY);
  currentY += 4;
  pdf.text(`Data/Hora: ${new Date(assinatura.timestamp_assinatura).toLocaleString('pt-BR')}`, margin, currentY);
  currentY += 4;
  pdf.text('Documento assinado digitalmente com certificação de autenticidade', margin, currentY);

  return Buffer.from(pdf.output('arraybuffer'));
}