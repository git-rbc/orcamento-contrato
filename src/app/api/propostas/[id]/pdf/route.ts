import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import jsPDF from 'jspdf';
import { calcularPagamentoIndaia } from '@/lib/payment-calculations';

// GET /api/propostas/[id]/pdf - Gerar PDF da proposta
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar proposta completa
    const { data: proposta, error: fetchError } = await supabase
      .from('propostas')
      .select(`
        *,
        cliente:clientes(nome, email, telefone, cpf_cnpj, endereco),
        espaco:espacos_eventos(nome, cidade),
        layout:espacos_eventos_layouts(layout)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Gerar PDF
    const pdf = await gerarPDFProposta(proposta);

    // Retornar PDF como blob
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposta-${proposta.codigo_reuniao || id}.pdf"`
      },
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
  }
}

async function gerarPDFProposta(proposta: any) {
  const pdf = new jsPDF();
  
  // Configuração da página
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Cabeçalho
  pdf.setFillColor(52, 58, 64); // zinc-800
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROPOSTA DE EVENTO', pageWidth / 2, 25, { align: 'center' });
  
  currentY = 60;
  
  // Informações do cliente
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DADOS DO CLIENTE', margin, currentY);
  currentY += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nome: ${proposta.cliente?.nome || 'N/A'}`, margin, currentY);
  currentY += 6;
  pdf.text(`Email: ${proposta.cliente?.email || 'N/A'}`, margin, currentY);
  currentY += 6;
  pdf.text(`CPF/CNPJ: ${proposta.cliente?.cpf_cnpj || 'N/A'}`, margin, currentY);
  currentY += 15;

  // Dados do evento
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DADOS DO EVENTO', margin, currentY);
  currentY += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  if (proposta.data_realizacao) {
    pdf.text(`Data: ${new Date(proposta.data_realizacao).toLocaleDateString('pt-BR')}`, margin, currentY);
    currentY += 6;
  }
  if (proposta.espaco?.nome) {
    pdf.text(`Local: ${proposta.espaco.nome}`, margin, currentY);
    currentY += 6;
  }
  if (proposta.num_pessoas) {
    pdf.text(`Número de Pessoas: ${proposta.num_pessoas}`, margin, currentY);
    currentY += 6;
  }
  if (proposta.dia_semana) {
    pdf.text(`Dia da Semana: ${proposta.dia_semana}`, margin, currentY);
    currentY += 6;
  }
  currentY += 10;

  // Função para adicionar seção de itens
  const adicionarSecaoItens = (titulo: string, itens: any[]) => {
    if (!itens || itens.length === 0) return;

    // Verificar se precisamos de nova página
    if (currentY > pageHeight - 80) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(titulo, margin, currentY);
    currentY += 8;

    let subtotal = 0;

    itens.forEach(item => {
      if (item.descricao && (item.valorUnitario > 0 || item.quantidade > 0)) {
        // Verificar quebra de página
        if (currentY > pageHeight - 40) {
          pdf.addPage();
          currentY = margin;
        }

        const valorTotal = (item.valorUnitario || 0) * (item.quantidade || 1);
        const valorComDesconto = valorTotal * (1 - (item.descontoAplicado || 0) / 100);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        const linha = `${item.descricao} - Qtd: ${item.quantidade || 1} x ${(item.valorUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        pdf.text(linha, margin + 5, currentY);
        
        if (item.descontoAplicado > 0) {
          currentY += 4;
          pdf.text(`  Desconto: ${item.descontoAplicado}%`, margin + 5, currentY);
        }
        
        pdf.text(valorComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - margin, currentY, { align: 'right' });
        
        subtotal += valorComDesconto;
        currentY += 6;
      }
    });

    // Subtotal da seção
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Subtotal ${titulo}:`, pageWidth - 80, currentY, { align: 'right' });
    pdf.text(subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;
  };

  // Adicionar seções de itens
  if (proposta.itens_alimentacao) {
    adicionarSecaoItens('ALIMENTAÇÃO', proposta.itens_alimentacao);
  }
  
  if (proposta.itens_bebidas) {
    adicionarSecaoItens('BEBIDAS', proposta.itens_bebidas);
  }
  
  if (proposta.itens_servicos) {
    adicionarSecaoItens('SERVIÇOS', proposta.itens_servicos);
  }
  
  if (proposta.itens_extras) {
    adicionarSecaoItens('ITENS EXTRAS', proposta.itens_extras);
  }

  // Rolhas
  const rolhas = [
    { nome: 'Vinho', valor: proposta.rolha_vinho },
    { nome: 'Destilado', valor: proposta.rolha_destilado },
    { nome: 'Energético', valor: proposta.rolha_energetico },
    { nome: 'Chopp', valor: proposta.rolha_chopp }
  ].filter(r => r.valor && r.valor !== 'ISENTA');

  if (rolhas.length > 0) {
    adicionarSecaoItens('ROLHAS', rolhas.map(r => ({
      descricao: `Rolha ${r.nome}`,
      valorUnitario: parseFloat(r.valor.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
      quantidade: 1,
      descontoAplicado: 0
    })));
  }

  // Total final
  if (currentY > pageHeight - 60) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('VALOR TOTAL DA PROPOSTA:', margin, currentY);
  pdf.text(
    (proposta.total_proposta || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    pageWidth - margin, currentY, { align: 'right' }
  );
  
  if (proposta.valor_entrada > 0) {
    currentY += 8;
    pdf.setFontSize(12);
    pdf.text('Valor de Entrada:', margin, currentY);
    pdf.text(
      (proposta.valor_entrada || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      pageWidth - margin, currentY, { align: 'right' }
    );
  }

  // Condições de pagamento
  currentY += 20;

  // Verificar se precisamos de nova página
  if (currentY > pageHeight - 120) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONDIÇÕES DE PAGAMENTO:', margin, currentY);
  currentY += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const modelo = proposta.modelo_pagamento || 'À vista';
  pdf.text(`Modelo: ${modelo}`, margin, currentY);
  currentY += 8;

  // Condições específicas para Pagamento Indaiá
  if (modelo === 'Pagamento Indaiá' && proposta.data_realizacao) {
    try {
      const calculo = calcularPagamentoIndaia({
        valorTotal: proposta.total_proposta,
        dataEvento: new Date(proposta.data_realizacao)
      });

      pdf.setFont('helvetica', 'bold');
      pdf.text('DETALHAMENTO DO PAGAMENTO INDAIÁ:', margin, currentY);
      currentY += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`• Valor original: ${proposta.total_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin + 5, currentY);
      currentY += 6;
      pdf.text(`• Valor total com juros (1,29% a.m.): ${calculo.valorTotalComJuros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin + 5, currentY);
      currentY += 6;
      pdf.text(`• Entrada obrigatória (20%): ${calculo.valorEntrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin + 5, currentY);
      currentY += 6;
      pdf.text(`• ${calculo.quantidadeParcelas}x parcelas de ${calculo.valorParcelas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin + 5, currentY);
      currentY += 6;
      pdf.text(`• Saldo final (30%): ${calculo.valorSaldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin + 5, currentY);
      currentY += 6;
      pdf.text(`  (A ser pago 30 dias antes do evento)`, margin + 10, currentY);
      currentY += 6;
      pdf.text(`• Taxa de juros: 1,29% ao mês`, margin + 5, currentY);
      currentY += 8;
    } catch (error) {
      console.error('Erro ao calcular Pagamento Indaiá no PDF:', error);
    }
  } else {
    // Condições para outros modelos
    if (proposta.entrada === 'Sim' && proposta.valor_entrada > 0) {
      pdf.text(`Entrada: ${proposta.valor_entrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin, currentY);
      currentY += 6;
    }

    if (proposta.qtd_meses > 1) {
      const valorRestante = proposta.total_proposta - (proposta.valor_entrada || 0);
      const valorParcela = valorRestante / proposta.qtd_meses;
      pdf.text(`Parcelamento: ${proposta.qtd_meses}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin, currentY);
      currentY += 6;

      if (proposta.dia_vencimento) {
        pdf.text(`Vencimento: dia ${proposta.dia_vencimento} de cada mês`, margin, currentY);
        currentY += 6;
      }
    }

    if (proposta.juros && proposta.juros > 0) {
      pdf.text(`Juros: ${proposta.juros}% ao mês`, margin, currentY);
      currentY += 6;
    }

    if (proposta.forma_saldo_final) {
      pdf.text(`Forma de pagamento: ${proposta.forma_saldo_final}`, margin, currentY);
      currentY += 6;
    }
  }

  // Cláusulas adicionais
  if (proposta.clausulas_adicionais) {
    currentY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLÁUSULAS ADICIONAIS:', margin, currentY);
    currentY += 6;

    pdf.setFont('helvetica', 'normal');
    const clausulas = proposta.clausulas_adicionais.split('\n');
    clausulas.forEach(clausula => {
      if (clausula.trim()) {
        pdf.text(clausula, margin, currentY);
        currentY += 5;
      }
    });
  }

  // Observação financeira
  if (proposta.observacao_financeiro) {
    currentY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('OBSERVAÇÕES FINANCEIRAS:', margin, currentY);
    currentY += 6;

    pdf.setFont('helvetica', 'normal');
    const observacoes = proposta.observacao_financeiro.split('\n');
    observacoes.forEach(obs => {
      if (obs.trim()) {
        pdf.text(obs, margin, currentY);
        currentY += 5;
      }
    });
  }

  // Rodapé
  currentY = pageHeight - 40;
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text('Esta proposta é válida por 30 dias a partir da data de emissão.', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, currentY, { align: 'center' });

  return pdf;
}