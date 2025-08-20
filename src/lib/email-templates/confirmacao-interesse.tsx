import { EmailTemplateData } from '../resend';

interface ConfirmacaoInteresseProps extends EmailTemplateData {
  numeroReserva: string;
  tempoExpiracao: string;
}

export function ConfirmacaoInteresseTemplate({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  tempoExpiracao,
  observacoes
}: ConfirmacaoInteresseProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Interesse - Reserva Temporária</title>
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .highlight-box {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .reservation-details {
          background-color: #e3f2fd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .reservation-details h3 {
          margin: 0 0 15px 0;
          color: #1976d2;
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
        .warning-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
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
          color: #667eea;
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
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GC</div>
          <h1>Interesse Confirmado!</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <p>Seu interesse na data foi registrado com sucesso! Criamos uma reserva temporária para você.</p>
          
          <div class="reservation-details">
            <h3>📅 Detalhes da Reserva Temporária</h3>
            <div class="detail-item">
              <span class="detail-label">Número da Reserva:</span>
              <span class="detail-value"><strong>${numeroReserva}</strong></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Data:</span>
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
            ${observacoes ? `
            <div class="detail-item">
              <span class="detail-label">Observações:</span>
              <span class="detail-value">${observacoes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="warning-box">
            <strong>⏰ Atenção:</strong> Esta reserva temporária expira em <strong>${tempoExpiracao}</strong>. 
            Nossa equipe entrará em contato em breve para enviar a proposta oficial.
          </div>
          
          <div class="highlight-box">
            <h4>📋 Próximos Passos:</h4>
            <ul>
              <li>Nossa equipe analisará sua solicitação</li>
              <li>Você receberá uma proposta personalizada</li>
              <li>Terá um período para aceitar ou recusar a proposta</li>
              <li>Após aceite, poderemos finalizar o contrato</li>
            </ul>
          </div>
          
          <p>Se tiver alguma dúvida, entre em contato conosco. Estamos aqui para ajudar!</p>
          
          <p>Atenciosamente,<br>
          <strong>Equipe Gestão de Contratos</strong></p>
        </div>
        
        <div class="footer">
          <p>Este é um email automático. Por favor, não responda diretamente.</p>
          <p>© 2024 Gestão de Contratos. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

export function getConfirmacaoInteresseText({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  tempoExpiracao,
  observacoes
}: ConfirmacaoInteresseProps): string {
  return `
Olá ${nome},

Seu interesse na data foi registrado com sucesso! Criamos uma reserva temporária para você.

DETALHES DA RESERVA TEMPORÁRIA:
- Número da Reserva: ${numeroReserva}
- Data: ${data}
- Horário: ${hora}
${espaco ? `- Espaço: ${espaco}` : ''}
${observacoes ? `- Observações: ${observacoes}` : ''}

ATENÇÃO: Esta reserva temporária expira em ${tempoExpiracao}. Nossa equipe entrará em contato em breve para enviar a proposta oficial.

PRÓXIMOS PASSOS:
- Nossa equipe analisará sua solicitação
- Você receberá uma proposta personalizada
- Terá um período para aceitar ou recusar a proposta
- Após aceite, poderemos finalizar o contrato

Se tiver alguma dúvida, entre em contato conosco.

Atenciosamente,
Equipe Gestão de Contratos
  `.trim();
}