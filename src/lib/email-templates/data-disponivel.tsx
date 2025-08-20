import { EmailTemplateData } from '../resend';

interface DataDisponivelProps extends EmailTemplateData {
  nomeCliente: string;
  emailCliente: string;
  telefoneCliente?: string;
  posicaoFila: number;
  linkCriarReserva: string;
  tempoLimiteResposta: string;
  motivoLiberacao: string;
}

export function DataDisponivelTemplate({
  nome, // nome do pré-vendedor
  data,
  hora,
  espaco,
  nomeCliente,
  emailCliente,
  telefoneCliente,
  posicaoFila,
  linkCriarReserva,
  tempoLimiteResposta,
  motivoLiberacao,
  observacoes
}: DataDisponivelProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Data Disponível - Oportunidade!</title>
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
        .opportunity-badge {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
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
        .event-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        .event-details h3 {
          margin: 0 0 15px 0;
          color: #495057;
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
        .priority-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
          text-align: center;
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
        .actions-box {
          background-color: #f8f9fa;
          border-left: 4px solid #28a745;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .contact-info {
          background-color: #f0f9ff;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
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
          font-size: 20px;
        }
        .queue-position {
          background-color: #28a745;
          color: white;
          padding: 10px 15px;
          border-radius: 50%;
          font-weight: bold;
          font-size: 18px;
          display: inline-block;
          margin: 0 10px;
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
          <div class="logo">🎯</div>
          <h1>Data Disponível!</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <div class="opportunity-badge">
            🎉 OPORTUNIDADE! A data solicitada está agora disponível
          </div>
          
          <p>Excelente notícia! A data que estava na fila de espera foi liberada e agora está disponível para o cliente que estava aguardando.</p>
          
          <div class="client-info">
            <h3>👤 Cliente Prioritário na Fila</h3>
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
            <div class="detail-item">
              <span class="detail-label">Posição na Fila:</span>
              <span class="detail-value">
                <span class="queue-position">${posicaoFila}°</span>
                ${posicaoFila === 1 ? 'Primeiro da fila!' : `${posicaoFila}° na fila`}
              </span>
            </div>
          </div>
          
          <div class="event-details">
            <h3>📅 Detalhes da Data Liberada</h3>
            <div class="detail-item">
              <span class="detail-label">Data do Evento:</span>
              <span class="detail-value"><strong>${data}</strong></span>
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
              <span class="detail-label">Motivo da Liberação:</span>
              <span class="detail-value">${motivoLiberacao}</span>
            </div>
            ${observacoes ? `
            <div class="detail-item">
              <span class="detail-label">Observações:</span>
              <span class="detail-value">${observacoes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="priority-box">
            <strong>⏰ Tempo Limite:</strong> Você tem <strong>${tempoLimiteResposta}</strong> para entrar em contato com o cliente e criar a reserva temporária. Após este prazo, o próximo da fila será notificado.
          </div>
          
          <div class="cta-container">
            <a href="${linkCriarReserva}" class="cta-button">
              📋 Criar Reserva Temporária
            </a>
          </div>
          
          <div class="actions-box">
            <h4>⚡ Ações Imediatas Necessárias:</h4>
            <ol>
              <li><strong>Contatar o Cliente AGORA:</strong> Informar sobre a disponibilidade da data</li>
              <li><strong>Confirmar Interesse:</strong> Verificar se o cliente ainda tem interesse</li>
              <li><strong>Criar Reserva Temporária:</strong> Se confirmado o interesse</li>
              <li><strong>Preparar Proposta:</strong> Iniciar preparação da proposta personalizada</li>
            </ol>
          </div>
          
          <div class="contact-info">
            <strong>📞 Contato Imediato do Cliente:</strong><br>
            Email: <a href="mailto:${emailCliente}">${emailCliente}</a>
            ${telefoneCliente ? `<br>Telefone: <a href="tel:${telefoneCliente}">${telefoneCliente}</a>` : ''}
          </div>
          
          <p><strong>Lembre-se:</strong> Esta é uma oportunidade única! Se este cliente não confirmar interesse ou você não conseguir contato dentro do prazo, o próximo da fila será automaticamente notificado.</p>
          
          <p>Boa sorte com esta oportunidade!</p>
          
          <p>Atenciosamente,<br>
          <strong>Sistema de Gestão de Contratos</strong></p>
        </div>
        
        <div class="footer">
          <p>Este é um alerta automático sobre disponibilidade de data. Aja rapidamente!</p>
          <p>© 2024 Gestão de Contratos. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

export function getDataDisponivelText({
  nome,
  data,
  hora,
  espaco,
  nomeCliente,
  emailCliente,
  telefoneCliente,
  posicaoFila,
  linkCriarReserva,
  tempoLimiteResposta,
  motivoLiberacao,
  observacoes
}: DataDisponivelProps): string {
  return `
DATA DISPONÍVEL - OPORTUNIDADE!

Olá ${nome},

OPORTUNIDADE! A data solicitada está agora disponível.

Excelente notícia! A data que estava na fila de espera foi liberada e agora está disponível para o cliente que estava aguardando.

CLIENTE PRIORITÁRIO NA FILA:
- Nome: ${nomeCliente}
- Email: ${emailCliente}
${telefoneCliente ? `- Telefone: ${telefoneCliente}` : ''}
- Posição na Fila: ${posicaoFila}° ${posicaoFila === 1 ? '(Primeiro da fila!)' : ''}

DETALHES DA DATA LIBERADA:
- Data do Evento: ${data}
- Horário: ${hora}
${espaco ? `- Espaço: ${espaco}` : ''}
- Motivo da Liberação: ${motivoLiberacao}
${observacoes ? `- Observações: ${observacoes}` : ''}

TEMPO LIMITE: Você tem ${tempoLimiteResposta} para entrar em contato com o cliente e criar a reserva temporária.

LINK PARA CRIAR RESERVA:
${linkCriarReserva}

AÇÕES IMEDIATAS NECESSÁRIAS:
1. Contatar o Cliente AGORA: Informar sobre a disponibilidade da data
2. Confirmar Interesse: Verificar se o cliente ainda tem interesse
3. Criar Reserva Temporária: Se confirmado o interesse
4. Preparar Proposta: Iniciar preparação da proposta personalizada

CONTATO DO CLIENTE:
Email: ${emailCliente}
${telefoneCliente ? `Telefone: ${telefoneCliente}` : ''}

Lembre-se: Esta é uma oportunidade única! Se este cliente não confirmar interesse ou você não conseguir contato dentro do prazo, o próximo da fila será automaticamente notificado.

Boa sorte com esta oportunidade!

Atenciosamente,
Sistema de Gestão de Contratos
  `.trim();
}