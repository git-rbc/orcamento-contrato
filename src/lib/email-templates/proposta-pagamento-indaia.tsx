import { EmailTemplateData } from '../resend';

interface PropostaPagamentoIndaiaProps extends EmailTemplateData {
  numeroReserva: string;
  linkProposta: string;
  tempoExpiracao: string;
  valorProposta: string;
  valorTotalComJuros: string;
  valorEntrada: string;
  quantidadeParcelas: number;
  valorParcelas: string;
  valorSaldoFinal: string;
  tempoResposta?: string;
}

export function PropostaPagamentoIndaiaTemplate({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  linkProposta,
  tempoExpiracao,
  valorProposta,
  valorTotalComJuros,
  valorEntrada,
  quantidadeParcelas,
  valorParcelas,
  valorSaldoFinal,
  tempoResposta,
  observacoes
}: PropostaPagamentoIndaiaProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta Pagamento Indaiá - Gestão de Contratos</title>
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
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
          background-color: #dbeafe;
          border: 1px solid #93c5fd;
          color: #1e40af;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-weight: 600;
        }
        .indaia-badge {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-weight: 600;
          font-size: 16px;
        }
        .reservation-details {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #1e40af;
        }
        .reservation-details h3 {
          margin: 0 0 15px 0;
          color: #1e40af;
          font-size: 18px;
        }
        .payment-breakdown {
          background-color: #eff6ff;
          border: 2px solid #bfdbfe;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .payment-breakdown h3 {
          margin: 0 0 15px 0;
          color: #1e40af;
          font-size: 18px;
          text-align: center;
        }
        .payment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 12px 0;
          padding: 12px;
          background-color: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .payment-item.highlight {
          background-color: #fef3c7;
          border-color: #f59e0b;
          font-weight: 600;
        }
        .payment-item.total {
          background-color: #1e40af;
          color: white;
          font-weight: bold;
          font-size: 16px;
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
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          color: #92400e;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .highlight-box {
          background-color: #f0f9ff;
          border-left: 4px solid #1e40af;
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
          color: #1e40af;
        }
        .benefits-list {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .benefits-list h4 {
          color: #059669;
          margin: 0 0 10px 0;
        }
        .benefits-list ul {
          margin: 0;
          padding-left: 20px;
          color: #065f46;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 0;
          }
          .content {
            padding: 20px;
          }
          .payment-item {
            flex-direction: column;
            gap: 5px;
            text-align: center;
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
          <h1>Proposta Pagamento Indaiá</h1>
        </div>

        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>

          <div class="success-badge">
            ✅ Sua proposta com Pagamento Indaiá foi gerada!
          </div>

          <div class="indaia-badge">
            🎯 PAGAMENTO INDAIÁ - Condições Especiais Aplicadas
          </div>

          <p>Preparamos uma proposta personalizada com o <strong>modelo de Pagamento Indaiá</strong>, que oferece condições facilitadas para o seu evento.</p>

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
            ${observacoes ? `
            <div class="detail-item">
              <span class="detail-label">Observações:</span>
              <span class="detail-value">${observacoes}</span>
            </div>
            ` : ''}
          </div>

          <div class="payment-breakdown">
            <h3>💰 Breakdown do Pagamento Indaiá</h3>

            <div class="payment-item">
              <span>Valor Original do Evento</span>
              <span>${valorProposta}</span>
            </div>

            <div class="payment-item highlight">
              <span>Valor Total com Juros (1,29% a.m.)</span>
              <span><strong>${valorTotalComJuros}</strong></span>
            </div>

            <div class="payment-item total">
              <span>🏦 Entrada Obrigatória (20%)</span>
              <span>${valorEntrada}</span>
            </div>

            <div class="payment-item">
              <span>📅 ${quantidadeParcelas}x Parcelas Mensais</span>
              <span>${valorParcelas} cada</span>
            </div>

            <div class="payment-item total">
              <span>🎯 Saldo Final (30% - 30 dias antes)</span>
              <span>${valorSaldoFinal}</span>
            </div>
          </div>

          <div class="benefits-list">
            <h4>✨ Vantagens do Pagamento Indaiá:</h4>
            <ul>
              <li><strong>Parcelamento facilitado</strong> com condições especiais</li>
              <li><strong>Entrada reduzida</strong> de apenas 20% do valor total</li>
              <li><strong>Flexibilidade</strong> para organizar suas finanças</li>
              <li><strong>Pagamento do saldo</strong> próximo ao evento</li>
              <li><strong>Taxa competitiva</strong> de 1,29% ao mês</li>
            </ul>
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
            <h4>📋 Próximos Passos:</h4>
            <ul>
              <li><strong>Revisar</strong> todos os detalhes e condições do Pagamento Indaiá</li>
              <li><strong>Aceitar</strong> a proposta para garantir seu evento</li>
              <li><strong>Realizar</strong> o pagamento da entrada de ${valorEntrada}</li>
              <li><strong>Acompanhar</strong> o cronograma de parcelas mensais</li>
              <li><strong>Preparar</strong> o saldo final para 30 dias antes do evento</li>
            </ul>
          </div>

          <p><strong>Importante:</strong> O Pagamento Indaiá foi especialmente calculado considerando a data do seu evento e oferece as melhores condições para que você possa realizar seu evento dos sonhos!</p>

          <p>Nossa equipe está à disposição para esclarecer qualquer dúvida sobre as condições de pagamento.</p>

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

export function getPropostaPagamentoIndaiaText({
  nome,
  data,
  hora,
  espaco,
  numeroReserva,
  linkProposta,
  tempoExpiracao,
  valorProposta,
  valorTotalComJuros,
  valorEntrada,
  quantidadeParcelas,
  valorParcelas,
  valorSaldoFinal,
  tempoResposta,
  observacoes
}: PropostaPagamentoIndaiaProps): string {
  return `
Olá ${nome},

PROPOSTA PAGAMENTO INDAIÁ GERADA!

Preparamos uma proposta personalizada com o modelo de Pagamento Indaiá, que oferece condições facilitadas para o seu evento.

DETALHES DA RESERVA:
- Número da Reserva: ${numeroReserva}
- Data do Evento: ${data}
- Horário: ${hora}
${espaco ? `- Espaço: ${espaco}` : ''}
${observacoes ? `- Observações: ${observacoes}` : ''}

BREAKDOWN DO PAGAMENTO INDAIÁ:
- Valor Original: ${valorProposta}
- Valor Total com Juros (1,29% a.m.): ${valorTotalComJuros}
- Entrada Obrigatória (20%): ${valorEntrada}
- ${quantidadeParcelas}x Parcelas Mensais: ${valorParcelas} cada
- Saldo Final (30% - 30 dias antes): ${valorSaldoFinal}

VANTAGENS DO PAGAMENTO INDAIÁ:
✓ Parcelamento facilitado com condições especiais
✓ Entrada reduzida de apenas 20% do valor total
✓ Flexibilidade para organizar suas finanças
✓ Pagamento do saldo próximo ao evento
✓ Taxa competitiva de 1,29% ao mês

LINK PARA VISUALIZAR A PROPOSTA:
${linkProposta}

PRAZO PARA RESPOSTA: ${tempoResposta || tempoExpiracao}

PRÓXIMOS PASSOS:
1. Revisar todos os detalhes e condições do Pagamento Indaiá
2. Aceitar a proposta para garantir seu evento
3. Realizar o pagamento da entrada de ${valorEntrada}
4. Acompanhar o cronograma de parcelas mensais
5. Preparar o saldo final para 30 dias antes do evento

O Pagamento Indaiá foi especialmente calculado considerando a data do seu evento e oferece as melhores condições!

Nossa equipe está à disposição para esclarecer qualquer dúvida.

Atenciosamente,
Equipe Gestão de Contratos
  `.trim();
}