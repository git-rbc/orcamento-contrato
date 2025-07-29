import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { uploadPdfAssinado } from './supabase-storage';

export interface ExportPDFOptions {
  filename?: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export async function exportHTMLToPDF(
  htmlContent: string,
  options: ExportPDFOptions = {}
): Promise<void> {
  const {
    filename = 'contrato.pdf',
    title = 'Contrato',
    author = 'INDEX02 EVENTOS LTDA.',
    subject = 'Contrato de Prestação de Serviços',
    keywords = 'contrato, evento, prestação de serviços',
    margin = { top: 20, right: 20, bottom: 20, left: 20 }
  } = options;

  try {
    // Criar um elemento temporário para renderizar o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '210mm'; // Largura A4
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.color = '#000';
    
    document.body.appendChild(tempDiv);

    // Configurar o canvas para captura
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: tempDiv.scrollWidth,
      height: tempDiv.scrollHeight
    });

    // Remover o elemento temporário
    document.body.removeChild(tempDiv);

    // Criar o PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configurar metadados do PDF
    pdf.setProperties({
      title,
      author,
      subject,
      keywords,
      creator: 'Sistema de Gestão de Contratos'
    });

    // Calcular dimensões
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin.left - margin.right;
    const contentHeight = pageHeight - margin.top - margin.bottom;

    // Converter canvas para imagem
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calcular proporção para ajustar à página
    const ratio = Math.min(contentWidth / (imgWidth * 0.264583), contentHeight / (imgHeight * 0.264583));
    const scaledWidth = imgWidth * 0.264583 * ratio;
    const scaledHeight = imgHeight * 0.264583 * ratio;

    // Verificar se precisa de múltiplas páginas
    const totalPages = Math.ceil(scaledHeight / contentHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const yOffset = -(page * contentHeight);
      
      pdf.addImage(
        imgData,
        'PNG',
        margin.left,
        margin.top + yOffset,
        scaledWidth,
        scaledHeight
      );
    }

    // Salvar o PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw new Error('Falha ao exportar PDF');
  }
}

export async function exportContractToPDF(
  numeroContrato: string,
  clienteNome: string,
  conteudoHTML: string
): Promise<void> {
  const filename = `contrato_${numeroContrato.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const title = `Contrato ${numeroContrato}`;
  const subject = `Contrato de Prestação de Serviços - ${clienteNome}`;

  await exportHTMLToPDF(conteudoHTML, {
    filename,
    title,
    subject,
    keywords: `contrato, ${numeroContrato}, ${clienteNome}, evento`
  });
}

export function prepareHTMLForPDF(htmlContent: string): string {
  // Limpar e preparar o HTML para exportação
  let cleanHTML = htmlContent
    // Remover tags de script e style
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Converter quebras de linha
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '</p>\n')
    // Limpar atributos desnecessários
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/data-[^=]*="[^"]*"/gi, '');

  // Envolver em estrutura HTML básica
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contrato</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #000;
          margin: 0;
          padding: 20px;
          background: white;
        }
        h1, h2, h3 {
          color: #000;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        p {
          margin-bottom: 10px;
          text-align: justify;
        }
        ul, ol {
          margin-bottom: 10px;
          padding-left: 20px;
        }
        li {
          margin-bottom: 5px;
        }
        strong {
          font-weight: bold;
        }
        em {
          font-style: italic;
        }
        .contract-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        .contract-section {
          margin-bottom: 25px;
        }
        .contract-clause {
          margin-bottom: 15px;
          text-indent: 20px;
        }
      </style>
    </head>
    <body>
      ${cleanHTML}
    </body>
    </html>
  `;
}

export async function generatePDFAndUpload(
  numeroContrato: string,
  clienteNome: string,
  conteudoHTML: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Preparar HTML para PDF
    const htmlForPDF = prepareHTMLForPDF(conteudoHTML);
    
    // Criar um elemento temporário para renderizar o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlForPDF;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '210mm'; // Largura A4
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.color = '#000';
    
    document.body.appendChild(tempDiv);

    // Configurar o canvas para captura
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: tempDiv.scrollWidth,
      height: tempDiv.scrollHeight
    });

    // Remover o elemento temporário
    document.body.removeChild(tempDiv);

    // Criar o PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configurar metadados do PDF
    pdf.setProperties({
      title: `Contrato ${numeroContrato}`,
      author: 'INDEX02 EVENTOS LTDA.',
      subject: `Contrato de Prestação de Serviços - ${clienteNome}`,
      keywords: `contrato, ${numeroContrato}, ${clienteNome}, evento`,
      creator: 'Sistema de Gestão de Contratos'
    });

    // Calcular dimensões
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const contentWidth = pageWidth - margin.left - margin.right;
    const contentHeight = pageHeight - margin.top - margin.bottom;

    // Converter canvas para imagem
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calcular proporção para ajustar à página
    const ratio = Math.min(contentWidth / (imgWidth * 0.264583), contentHeight / (imgHeight * 0.264583));
    const scaledWidth = imgWidth * 0.264583 * ratio;
    const scaledHeight = imgHeight * 0.264583 * ratio;

    // Verificar se precisa de múltiplas páginas
    const totalPages = Math.ceil(scaledHeight / contentHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const yOffset = -(page * contentHeight);
      
      pdf.addImage(
        imgData,
        'PNG',
        margin.left,
        margin.top + yOffset,
        scaledWidth,
        scaledHeight
      );
    }

    // Gerar blob do PDF
    const pdfBlob = pdf.output('blob');
    
    // Fazer upload para o Supabase Storage
    const filename = `contrato_${numeroContrato.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const uploadResult = await uploadPdfAssinado(numeroContrato, Buffer.from(await pdfBlob.arrayBuffer()), filename);
    
    if (uploadResult) {
      return { success: true, url: uploadResult.url };
    } else {
      return { success: false, error: 'Erro no upload do PDF' };
    }

  } catch (error) {
    console.error('Erro ao gerar e fazer upload do PDF:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}