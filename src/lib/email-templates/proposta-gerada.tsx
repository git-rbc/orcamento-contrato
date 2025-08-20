import { EmailTemplateData } from '../resend';

interface PropostaGeradaProps extends EmailTemplateData {
  numeroReserva: string;
  linkProposta: string;
  tempoExpiracao: string;
  valorProposta?: string;
  tempoResposta?: string;
}

export function PropostaGeradaTemplate({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  linkProposta,
  tempoExpiracao,
  valorProposta,
  tempoResposta,
  observacoes
}: PropostaGeradaProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta Gerada - Gestão de Contratos</title>
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
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
        .success-badge {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-weight: 600;
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
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
        .warning-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .highlight-box {
          background-color: #f8f9fa;
          border-left: 4px solid #28a745;
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
          color: #28a745;
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
          <div class="logo">GC</div>
          <h1>Proposta Criada!</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <div class="success-badge">
            ✅ Sua proposta foi gerada com sucesso!
          </div>
          
          <p>Com base na sua reserva temporária, nossa equipe preparou uma proposta personalizada para o seu evento.</p>
          
          <div class="reservation-details">
            <h3>📋 Detalhes da Proposta</h3>
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
            ${valorProposta ? `
            <div class="detail-item">
              <span class="detail-label">Valor da Proposta:</span>
              <span class="detail-value"><strong>${valorProposta}</strong></span>
            </div>
            ` : ''}
            ${observacoes ? `
            <div class="detail-item">
              <span class="detail-label">Observações:</span>
              <span class="detail-value">${observacoes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="cta-container">
            <a href="${linkProposta}" class="cta-button">
              📄 Visualizar Proposta Completa
            </a>
          </div>
          
          <div class="warning-box">
            <strong>⏰ Prazo para Resposta:</strong> Você tem ${tempoResposta || tempoExpiracao} para aceitar ou recusar esta proposta.
            Após este prazo, a proposta expirará automaticamente.
          </div>
          
          <div class="highlight-box">
            <h4>📋 O que você pode fazer agora:</h4>
            <ul>
              <li><strong>Revisar</strong> todos os detalhes da proposta</li>
              <li><strong>Aceitar</strong> a proposta para prosseguir com o contrato</li>
              <li><strong>Solicitar alterações</strong> se necessário</li>
              <li><strong>Recusar</strong> a proposta se não atender suas necessidades</li>
            </ul>
          </div>
          
          <p>Nossa equipe está à disposição para esclarecer qualquer dúvida sobre a proposta.</p>
          
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

export function getPropostaGeradaText({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  linkProposta,
  tempoExpiracao,
  valorProposta,
  tempoResposta,
  observacoes
}: PropostaGeradaProps): string {
  return `
Olá ${nome},

Sua proposta foi gerada com sucesso!

Com base na sua reserva temporária, nossa equipe preparou uma proposta personalizada para o seu evento.

DETALHES DA PROPOSTA:
- Número da Reserva: ${numeroReserva}
- Data do Evento: ${data}
- Horário: ${hora}
${espaco ? `- Espaço: ${espaco}` : ''}
${valorProposta ? `- Valor da Proposta: ${valorProposta}` : ''}
${observacoes ? `- Observações: ${observacoes}` : ''}

LINK PARA VISUALIZAR A PROPOSTA:
${linkProposta}

PRAZO PARA RESPOSTA: Você tem ${tempoResposta || tempoExpiracao} para aceitar ou recusar esta proposta.

O QUE VOCÊ PODE FAZER AGORA:
- Revisar todos os detalhes da proposta
- Aceitar a proposta para prosseguir com o contrato
- Solicitar alterações se necessário
- Recusar a proposta se não atender suas necessidades

Nossa equipe está à disposição para esclarecer qualquer dúvida sobre a proposta.

Atenciosamente,
Equipe Gestão de Contratos
  `.trim();
}