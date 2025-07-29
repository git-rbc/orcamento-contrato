import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL and Service Role Key are required');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Faz upload de PDF assinado para o bucket público
 */
export async function uploadPdfAssinado(
  contratoId: string,
  pdfBuffer: Buffer,
  fileName?: string
): Promise<{ url: string; path: string } | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Gera o nome do arquivo se não fornecido
    const nomeArquivo = fileName || `contrato-${contratoId}-assinado.pdf`;
    
    // Caminho organizado por ano/mês
    const filePath = `${year}/${month}/${nomeArquivo}`;
    
    // Upload do arquivo
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from('contratos-assinados')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true // Permite sobrescrever se existir
      });

    if (error) {
      console.error('Erro no upload do PDF:', error);
      return null;
    }

    // Gera URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('contratos-assinados')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Erro ao fazer upload do PDF:', error);
    return null;
  }
}

/**
 * Remove PDF do storage
 */
export async function removerPdfAssinado(filePath: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.storage
      .from('contratos-assinados')
      .remove([filePath]);

    if (error) {
      console.error('Erro ao remover PDF:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover PDF:', error);
    return false;
  }
}

/**
 * Lista PDFs de contratos por ano/mês
 */
export async function listarPdfsContratos(ano?: number, mes?: number) {
  try {
    const folder = ano && mes ? `${ano}/${String(mes).padStart(2, '0')}` : '';
    
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from('contratos-assinados')
      .list(folder);

    if (error) {
      console.error('Erro ao listar PDFs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar PDFs:', error);
    return [];
  }
}

/**
 * Gera URL pública para um PDF específico
 */
export function getUrlPublicaPdf(filePath: string): string {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = supabaseAdmin.storage
    .from('contratos-assinados')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Verifica se um arquivo existe no storage
 */
export async function verificarArquivoExiste(filePath: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from('contratos-assinados')
      .list('', {
        search: filePath
      });

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Erro ao verificar arquivo:', error);
    return false;
  }
}