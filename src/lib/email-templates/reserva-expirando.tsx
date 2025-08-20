import { EmailTemplateData } from '../resend';

interface ReservaExpirandoProps extends EmailTemplateData {
  numeroReserva: string;
  tempoRestante: string;
  nomeCliente: string;
  emailCliente: string;
  telefoneCliente?: string;
  linkGerenciar: string;
}

export function ReservaExpirandoTemplate({
  nome, // nome do pré-vendedor
  data,
  hora,
  espaco,
  numeroReserva,
  tempoRestante,
  nomeCliente,
  emailCliente,
  telefoneCliente,
  linkGerenciar,
  observacoes
}: ReservaExpirandoProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta - Reserva Expirando</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .alert-badge {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-weight: 600;
          font-size: 16px;
        }
        .client-info {
          background-color: #e8f4f8;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .client-info h3 {
          margin: 0 0 15px 0;
          color: #0d7377;
          font-size: 18px;
        }
        .reservation-details {
          background-color: #fff3cd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .reservation-details h3 {
          margin: 0 0 15px 0;
          color: #856404;
          font-size: 18px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-item:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #555;
        }
        .detail-value {
          color: #333;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 15px 30px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
        }
        .urgent-actions {
          background-color: #f8f9fa;
          border-left: 4px solid #ff6b6b;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .logo {
          width: 40px;
          height: 40px;
          margin: 0 auto 10px;
          background-color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #ff6b6b;
        }
        .contact-info {
          background-color: #f0f9ff;
          padding: 15px;
          border-radius: 6px;
          margin: 10px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 0;
          }
          .content {
            padding: 20px;
          }
          .detail-item {
            flex-direction: column;
            gap: 5px;
          }
          .cta-button {
            display: block;
            width: 100%;
            box-sizing: border-box;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚠️</div>
          <h1>Reserva Expirando!</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <div class="alert-badge">
            🚨 AÇÃO URGENTE NECESSÁRIA - Reserva expira em ${tempoRestante}
          </div>
          
          <p>Uma reserva temporária sob sua responsabilidade está prestes a expirar e precisa de ação imediata.</p>
          
          <div class="client-info">
            <h3>👤 Informações do Cliente</h3>
            <div class="detail-item">
              <span class="detail-label">Nome:</span>
              <span class="detail-value"><strong>${nomeCliente}</strong></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${emailCliente}</span>
            </div>
            ${telefoneCliente ? `
            <div class="detail-item">
              <span class="detail-label">Telefone:</span>
              <span class="detail-value">${telefoneCliente}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="reservation-details">
            <h3>📋 Detalhes da Reserva</h3>
            <div class="detail-item">
              <span class="detail-label">Número da Reserva:</span>
              <span class="detail-value"><strong>${numeroReserva}</strong></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Data do Evento:</span>
              <span class="detail-value">${data}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Horário:</span>
              <span class="detail-value">${hora}</span>
            </div>
            ${espaco ? `
            <div class="detail-item">
              <span class="detail-label">Espaço:</span>
              <span class="detail-value">${espaco}</span>
            </div>
            ` : ''}
            <div class="detail-item">
              <span class="detail-label">Tempo Restante:</span>
              <span class="detail-value"><strong style="color: #dc3545;">${tempoRestante}</strong></span>
            </div>
            ${observacoes ? `
            <div class="detail-item">
              <span class="detail-label">Observações:</span>
              <span class="detail-value">${observacoes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="cta-container">
            <a href="${linkGerenciar}" class="cta-button">
              🔧 Gerenciar Reserva Agora
            </a>
          </div>
          
          <div class="urgent-actions">
            <h4>⚡ Ações Urgentes Necessárias:</h4>
            <ul>
              <li><strong>Converter em Proposta:</strong> Se todas as informações estão prontas</li>
              <li><strong>Estender Prazo:</strong> Se precisa de mais tempo para preparar a proposta</li>
              <li><strong>Entrar em Contato:</strong> Com o cliente para confirmar detalhes</li>
              <li><strong>Liberar Data:</strong> Se o cliente não confirmar interesse</li>
            </ul>
          </div>
          
          <div class="contact-info">
            <strong>📞 Contato Rápido do Cliente:</strong><br>
            Email: <a href="mailto:${emailCliente}">${emailCliente}</a>
            ${telefoneCliente ? `<br>Telefone: <a href="tel:${telefoneCliente}">${telefoneCliente}</a>` : ''}
          </div>
          
          <p><strong>Lembre-se:</strong> Após a expiração, a data ficará disponível novamente e outros clientes poderão manifestar interesse.</p>
          
          <p>Atenciosamente,<br>
          <strong>Sistema de Gestão de Contratos</strong></p>
        </div>
        
        <div class="footer">
          <p>Este é um alerta automático do sistema. Verifique a reserva o quanto antes.</p>
          <p>© 2024 Gestão de Contratos. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

export function getReservaExpirandoText({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  tempoRestante,
  nomeCliente,
  emailCliente,
  telefoneCliente,
  linkGerenciar,
  observacoes
}: ReservaExpirandoProps): string {
  return `
ALERTA URGENTE - RESERVA EXPIRANDO

Olá ${nome},

AÇÃO URGENTE NECESSÁRIA - Reserva expira em ${tempoRestante}

Uma reserva temporária sob sua responsabilidade está prestes a expirar e precisa de ação imediata.

INFORMAÇÕES DO CLIENTE:
- Nome: ${nomeCliente}
- Email: ${emailCliente}
${telefoneCliente ? `- Telefone: ${telefoneCliente}` : ''}

DETALHES DA RESERVA:
- Número da Reserva: ${numeroReserva}
- Data do Evento: ${data}
- Horário: ${hora}
${espaco ? `- Espaço: ${espaco}` : ''}
- Tempo Restante: ${tempoRestante}
${observacoes ? `- Observações: ${observacoes}` : ''}

LINK PARA GERENCIAR:
${linkGerenciar}

AÇÕES URGENTES NECESSÁRIAS:
- Converter em Proposta: Se todas as informações estão prontas
- Estender Prazo: Se precisa de mais tempo para preparar a proposta
- Entrar em Contato: Com o cliente para confirmar detalhes
- Liberar Data: Se o cliente não confirmar interesse

CONTATO DO CLIENTE:
Email: ${emailCliente}
${telefoneCliente ? `Telefone: ${telefoneCliente}` : ''}

Lembre-se: Após a expiração, a data ficará disponível novamente e outros clientes poderão manifestar interesse.

Atenciosamente,
Sistema de Gestão de Contratos
  `.trim();
}