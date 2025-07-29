import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { gerarUrlPublicaProposta, gerarUrlRecursoEstatico } from '@/lib/token-utils';

const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/teste-email?cliente_id=xxx - Enviar email de teste
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('cliente_id');
    
    if (!clienteId) {
      return NextResponse.json({ error: 'cliente_id é obrigatório' }, { status: 400 });
    }

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('nome, email, email_secundario')
      .eq('id', clienteId)
      .single();

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (!cliente.email && !cliente.email_secundario) {
      return NextResponse.json({ error: 'Cliente não possui email cadastrado' }, { status: 400 });
    }

    // Preparar dados de teste
    const propostaTeste = {
      token_publico: 'TESTE123',
      data_realizacao: new Date().toISOString(),
      espaco: { nome: 'Salão de Festas Teste' },
      num_pessoas: 100,
      total_proposta: 15000
    };

    // Preparar emails destinatários
    const emailsDestinatarios = [];
    if (cliente.email) emailsDestinatarios.push(cliente.email);
    if (cliente.email_secundario && cliente.email_secundario !== cliente.email) {
      emailsDestinatarios.push(cliente.email_secundario);
    }

    const urlProposta = gerarUrlPublicaProposta(propostaTeste.token_publico);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const logoUrl = `${baseUrl}/api/logo?tipo=branca`;

    // Enviar email de teste
    const { data, error } = await resend.emails.send({
      from: 'contato@eventosindaia.com.br',
      to: emailsDestinatarios,
      subject: `[TESTE] Proposta de Evento - ${cliente.nome}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Teste - Proposta de Evento</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            
            <!-- Header com Logo -->
            <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <img src="${logoUrl}" alt="Eventos Indaiatuba" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
            </div>
            
            <!-- Corpo do Email -->
            <div style="padding: 40px 30px;">
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <strong style="color: #856404;">🧪 ESTE É UM EMAIL DE TESTE</strong>
              </div>
              
              <h1 style="color: #2c3e50; margin-bottom: 20px; font-size: 28px; text-align: center;">
                🎉 Sua Proposta de Evento está Pronta!
              </h1>
              
              <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                Olá <strong>${cliente.nome}</strong>,
              </p>
              
              <p style="color: #555; font-size: 16px; margin-bottom: 30px;">
                Este é um email de teste do sistema. Em uma proposta real, você receberia um link para visualizar todos os detalhes e dar sua resposta.
              </p>
              
              <!-- Card de Resumo -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 30px 0; color: white; text-align: center;">
                <h3 style="margin: 0 0 15px 0; font-size: 20px;">Dados do Teste</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                  <div>
                    <div style="font-size: 14px; opacity: 0.9;">📅 Data do Evento</div>
                    <div style="font-size: 16px; font-weight: bold;">${new Date(propostaTeste.data_realizacao).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div>
                    <div style="font-size: 14px; opacity: 0.9;">👥 Convidados</div>
                    <div style="font-size: 16px; font-weight: bold;">${propostaTeste.num_pessoas} pessoas</div>
                  </div>
                </div>
                <div style="margin: 15px 0;">
                  <div style="font-size: 14px; opacity: 0.9;">📍 Local</div>
                  <div style="font-size: 16px; font-weight: bold;">${propostaTeste.espaco.nome}</div>
                </div>
                <div style="font-size: 24px; font-weight: bold; margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                  💰 ${propostaTeste.total_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
              
              <!-- Botão CTA (desabilitado para teste) -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="display: inline-block; background: #6c757d; color: white; padding: 18px 40px; border-radius: 50px; font-size: 18px; font-weight: bold;">
                  🧪 Link de Teste (Desabilitado)
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 10px;">
                  URL real seria: ${urlProposta}
                </p>
              </div>
              
              <!-- Info de Teste -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 30px 0;">
                <h4 style="color: #007bff; margin: 0 0 10px 0;">Informações do Teste:</h4>
                <ul style="color: #555; margin: 0; padding-left: 20px;">
                  <li><strong>Cliente:</strong> ${cliente.nome}</li>
                  <li><strong>Email Principal:</strong> ${cliente.email || 'Não cadastrado'}</li>
                  <li><strong>Email Secundário:</strong> ${cliente.email_secundario || 'Não cadastrado'}</li>
                  <li><strong>Emails Enviados Para:</strong> ${emailsDestinatarios.join(', ')}</li>
                  <li><strong>Token de Teste:</strong> ${propostaTeste.token_publico}</li>
                </ul>
              </div>
              
              <p style="color: #555; font-size: 16px; margin-top: 30px;">
                Se você recebeu este email, significa que o sistema está funcionando corretamente! 🎉
              </p>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px; margin: 5px 0;">
                  📧 contato@eventosindaia.com.br
                </p>
                <p style="color: #888; font-size: 14px; margin: 5px 0;">
                  🧪 Sistema de Propostas - Modo de Teste
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Teste - Eventos Indaiatuba - ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email de teste:', error);
      return NextResponse.json({ error: 'Erro ao enviar email', details: error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Email de teste enviado com sucesso para: ${emailsDestinatarios.join(', ')}`,
      data: {
        cliente: cliente.nome,
        emails_enviados: emailsDestinatarios,
        email_id: data?.id,
        url_teste: urlProposta
      }
    });

  } catch (error) {
    console.error('Erro na API de teste de email:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}