import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { gerarUrlPublicaProposta, gerarUrlRecursoEstatico } from '@/lib/token-utils';

const resend = new Resend(process.env.RESEND_API_KEY);

interface UpdateStatusRequest {
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'cancelada' | 'convertida';
  observacoes?: string;
}

// Validar transições permitidas
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  'rascunho': ['enviada', 'cancelada'],
  'enviada': ['aceita', 'recusada', 'rascunho'],
  'aceita': ['convertida'],
  'recusada': ['rascunho'],
  'cancelada': [],
  'convertida': []
};

// PUT /api/propostas/[id]/status - Atualizar status da proposta
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body: UpdateStatusRequest = await request.json();
    
    if (!body.status) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 });
    }

    // Buscar proposta atual
    const { data: proposta, error: fetchError } = await supabase
      .from('propostas')
      .select(`
        *,
        cliente:clientes(nome, email),
        espaco:espacos_eventos(nome)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Validar transição de status
    const statusAtual = proposta.status || 'rascunho';
    const novoStatus = body.status;
    
    if (!TRANSICOES_PERMITIDAS[statusAtual]?.includes(novoStatus)) {
      return NextResponse.json({ 
        error: `Transição não permitida: ${statusAtual} → ${novoStatus}` 
      }, { status: 400 });
    }

    // Validar se cliente tem email cadastrado ao tentar enviar
    if (novoStatus === 'enviada') {
      const { data: clienteEmail } = await supabase
        .from('clientes')
        .select('email, email_secundario')
        .eq('id', proposta.cliente_id)
        .single();
      
      if (!clienteEmail || (!clienteEmail.email && !clienteEmail.email_secundario)) {
        return NextResponse.json({ 
          error: 'Não é possível enviar a proposta. Cliente não possui email cadastrado.' 
        }, { status: 400 });
      }
    }

    // Atualizar proposta
    const { data: propostaAtualizada, error: updateError } = await supabase
      .from('propostas')
      .update({ 
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        cliente:clientes(nome, email),
        espaco:espacos_eventos(nome)
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar proposta:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar proposta' }, { status: 500 });
    }

    // Enviar email quando apropriado
    if (novoStatus === 'enviada' && propostaAtualizada.token_publico) {
      try {
        // Buscar dados completos do cliente para email
        const { data: clienteCompleto } = await supabase
          .from('clientes')
          .select('nome, email, email_secundario')
          .eq('id', propostaAtualizada.cliente_id)
          .single();
        
        if (clienteCompleto && (clienteCompleto.email || clienteCompleto.email_secundario)) {
          await enviarEmailProposta(clienteCompleto, propostaAtualizada);
        } else {
          console.warn('Cliente não possui email cadastrado para envio da proposta');
        }
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não falhar a operação por causa do email
      }
    }

    // Registrar no histórico (implementar depois)
    // await registrarHistorico(id, statusAtual, novoStatus, user.id, body.observacoes);

    return NextResponse.json({ 
      success: true, 
      data: propostaAtualizada,
      message: `Status atualizado para ${novoStatus} com sucesso` 
    });

  } catch (error) {
    console.error('Erro na API de status:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function enviarEmailProposta(cliente: any, proposta: any) {
  try {
    const urlProposta = gerarUrlPublicaProposta(proposta.token_publico);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const logoUrl = `${baseUrl}/api/logo?tipo=branca`;

    // Preparar lista de emails destinatários
    const emailsDestinatarios = [];
    if (cliente.email) emailsDestinatarios.push(cliente.email);
    if (cliente.email_secundario && cliente.email_secundario !== cliente.email) {
      emailsDestinatarios.push(cliente.email_secundario);
    }

    if (emailsDestinatarios.length === 0) {
      throw new Error('Cliente não possui email cadastrado');
    }

    const { data, error } = await resend.emails.send({
      from: 'contato@eventosindaia.com.br',
      to: emailsDestinatarios,
      subject: `Proposta de Evento - ${cliente.nome || 'Cliente'}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Proposta de Evento</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header com Logo -->
            <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
              <img src="${logoUrl}" alt="Eventos Indaiatuba" style="max-width: 250px; height: auto; display: block; margin: 0 auto;" onerror="this.style.display='none'" />
            </div>
            
            <!-- Corpo do Email -->
            <div style="padding: 40px 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 20px; font-size: 28px; text-align: center;">
                🎉 Sua Proposta de Evento está Pronta!
              </h1>
              
              <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                Olá <strong>${cliente.nome}</strong>,
              </p>
              
              <p style="color: #555; font-size: 16px; margin-bottom: 30px;">
                Preparamos com muito carinho uma proposta especial para o seu evento. 
                Clique no botão abaixo para visualizar todos os detalhes e dar sua resposta.
              </p>
              
              <!-- Card de Resumo -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 30px 0; color: white; text-align: center;">
                <h3 style="margin: 0 0 15px 0; font-size: 20px;">Resumo da Proposta</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                  ${proposta.data_realizacao ? `
                    <div>
                      <div style="font-size: 14px; opacity: 0.9;">📅 Data do Evento</div>
                      <div style="font-size: 16px; font-weight: bold;">${new Date(proposta.data_realizacao).toLocaleDateString('pt-BR')}</div>
                    </div>
                  ` : ''}
                  ${proposta.num_pessoas ? `
                    <div>
                      <div style="font-size: 14px; opacity: 0.9;">👥 Convidados</div>
                      <div style="font-size: 16px; font-weight: bold;">${proposta.num_pessoas} pessoas</div>
                    </div>
                  ` : ''}
                </div>
                ${proposta.espaco?.nome ? `
                  <div style="margin: 15px 0;">
                    <div style="font-size: 14px; opacity: 0.9;">📍 Local</div>
                    <div style="font-size: 16px; font-weight: bold;">${proposta.espaco.nome}</div>
                  </div>
                ` : ''}
                <div style="font-size: 24px; font-weight: bold; margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                  💰 ${proposta.total_proposta?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'A consultar'}
                </div>
              </div>
              
              <!-- Botão CTA -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${urlProposta}" 
                   style="display: inline-block; background: linear-gradient(45deg, #4CAF50, #45a049); 
                          color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; 
                          font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
                          transition: all 0.3s ease;">
                  ✅ Visualizar Proposta Completa
                </a>
              </div>
              
              <!-- Instruções -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 30px 0;">
                <h4 style="color: #007bff; margin: 0 0 10px 0;">Como funciona:</h4>
                <ol style="color: #555; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Clique no botão acima para acessar sua proposta</li>
                  <li style="margin-bottom: 8px;">Revise todos os detalhes do seu evento</li>
                  <li style="margin-bottom: 8px;">Clique em "Aprovar" ou "Recusar" no final da página</li>
                  <li>Retornaremos o contato em breve!</li>
                </ol>
              </div>
              
              <p style="color: #555; font-size: 16px; margin-top: 30px;">
                Se você tiver alguma dúvida, não hesite em entrar em contato conosco. 
                Estamos aqui para tornar seu evento inesquecível! 🌟
              </p>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px; margin: 5px 0;">
                  📧 contato@eventosindaia.com.br
                </p>
                <p style="color: #888; font-size: 14px; margin: 5px 0;">
                  📱 Entre em contato para mais informações
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
              <p style="color: #ecf0f1; font-size: 12px; margin: 0;">
                Este email foi enviado automaticamente pelo sistema Eventos Indaiatuba.<br>
                Esta proposta é válida por 30 dias a partir da data de envio.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email via Resend:', error);
      throw error;
    }

    console.log(`Email da proposta enviado com sucesso para: ${emailsDestinatarios.join(', ')}`, data);
    return data;
  } catch (error) {
    console.error('Erro na função enviarEmailProposta:', error);
    throw error;
  }
}