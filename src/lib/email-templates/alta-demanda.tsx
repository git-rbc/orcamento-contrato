interface AltaDemandaProps {
  nomeAdmin: string;
  datasAlerta: Array<{
    data: string;
    hora: string;
    espaco?: string;
    totalFila: number;
    ultimasReservas: number; // últimas 24h
    tendencia: 'crescente' | 'estavel' | 'decrescente';
    tempoMedioEspera: string;
  }>;
  estatisticasGerais: {
    totalPessoasFilas: number;
    datasComFilasLongas: number; // filas com mais de 5 pessoas
    crescimentoUltimas24h: number; // percentual
  };
  recomendacoes: string[];
  linkGerenciamento: string;
}

export function AltaDemandaTemplate({
  nomeAdmin,
  datasAlerta,
  estatisticasGerais,
  recomendacoes,
  linkGerenciamento
}: AltaDemandaProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta de Alta Demanda - Gestão de Contratos</title>
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
          max-width: 700px;
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
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 30px 0;
        }
        .stat-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-number {
          font-size: 28px;
          font-weight: bold;
          color: #856404;
          display: block;
          margin-bottom: 5px;
        }
        .stat-label {
          color: #856404;
          font-size: 14px;
          font-weight: 600;
        }
        .dates-alert {
          margin: 30px 0;
        }
        .date-card {
          background-color: #fff;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #ff6b6b;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .date-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .date-title {
          font-weight: 600;
          color: #333;
          font-size: 18px;
        }
        .queue-badge {
          background-color: #ff6b6b;
          color: white;
          padding: 5px 12px;
          border-radius: 15px;
          font-size: 14px;
          font-weight: 600;
        }
        .date-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        .detail-item {
          text-align: center;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 6px;
        }
        .detail-value {
          font-weight: 600;
          font-size: 16px;
          display: block;
          margin-bottom: 5px;
          color: #333;
        }
        .detail-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .tendencia {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tendencia.crescente {
          color: #dc3545;
        }
        .tendencia.estavel {
          color: #ffc107;
        }
        .tendencia.decrescente {
          color: #28a745;
        }
        .recommendations {
          background-color: #e1f5fe;
          border-left: 4px solid #0288d1;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .recommendations h3 {
          margin: 0 0 15px 0;
          color: #0277bd;
        }
        .recommendations ul {
          margin: 0;
          padding-left: 20px;
        }
        .recommendations li {
          margin: 10px 0;
          color: #0277bd;
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
          font-size: 20px;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 0;
          }
          .content {
            padding: 20px;
          }
          .stats-overview {
            grid-template-columns: 1fr;
          }
          .date-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
          .date-details {
            grid-template-columns: 1fr 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔥</div>
          <h1>Alerta de Alta Demanda</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nomeAdmin}</strong>,</p>
          
          <div class="alert-badge">
            🚨 ALTA DEMANDA DETECTADA - Algumas datas estão com filas muito longas
          </div>
          
          <p>O sistema identificou um aumento significativo na demanda por algumas datas. Isso pode indicar oportunidades de negócio ou necessidade de ações estratégicas.</p>
          
          <div class="stats-overview">
            <div class="stat-box">
              <span class="stat-number">${estatisticasGerais.totalPessoasFilas}</span>
              <span class="stat-label">Total em Filas</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">${estatisticasGerais.datasComFilasLongas}</span>
              <span class="stat-label">Datas com Filas Longas</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">${estatisticasGerais.crescimentoUltimas24h > 0 ? '+' : ''}${estatisticasGerais.crescimentoUltimas24h}%</span>
              <span class="stat-label">Crescimento 24h</span>
            </div>
          </div>
          
          <div class="dates-alert">
            <h3>📅 Datas com Alta Demanda</h3>
            ${datasAlerta.map(dataItem => `
            <div class="date-card">
              <div class="date-header">
                <div class="date-title">
                  ${dataItem.data} - ${dataItem.hora}
                  ${dataItem.espaco ? `<br><small style="color: #666; font-weight: normal;">${dataItem.espaco}</small>` : ''}
                </div>
                <div class="queue-badge">
                  ${dataItem.totalFila} na fila
                </div>
              </div>
              
              <div class="date-details">
                <div class="detail-item">
                  <span class="detail-value">${dataItem.ultimasReservas}</span>
                  <span class="detail-label">Reservas 24h</span>
                </div>
                <div class="detail-item">
                  <span class="detail-value">${dataItem.tempoMedioEspera}</span>
                  <span class="detail-label">Tempo Médio</span>
                </div>
                <div class="detail-item">
                  <span class="detail-value">
                    <div class="tendencia ${dataItem.tendencia}">
                      ${dataItem.tendencia === 'crescente' ? '📈 Crescente' : 
                        dataItem.tendencia === 'estavel' ? '➡️ Estável' : '📉 Decrescente'}
                    </div>
                  </span>
                  <span class="detail-label">Tendência</span>
                </div>
              </div>
            </div>
            `).join('')}
          </div>
          
          <div class="recommendations">
            <h3>💡 Recomendações Estratégicas</h3>
            <ul>
              ${recomendacoes.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          
          <div class="cta-container">
            <a href="${linkGerenciamento}" class="cta-button">
              🎯 Gerenciar Demanda
            </a>
          </div>
          
          <p><strong>Nota:</strong> Este alerta é gerado automaticamente quando detectamos filas com mais de 5 pessoas ou crescimento superior a 50% nas últimas 24 horas.</p>
          
          <p>Atenciosamente,<br>
          <strong>Sistema de Gestão de Contratos</strong></p>
        </div>
        
        <div class="footer">
          <p>Alerta automático de alta demanda - Sistema de Gestão de Contratos</p>
          <p>© 2024 Gestão de Contratos. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

export function getAltaDemandaText({
  nomeAdmin,
  datasAlerta,
  estatisticasGerais,
  recomendacoes,
  linkGerenciamento
}: AltaDemandaProps): string {
  return `
ALERTA DE ALTA DEMANDA

Olá ${nomeAdmin},

ALTA DEMANDA DETECTADA - Algumas datas estão com filas muito longas.

O sistema identificou um aumento significativo na demanda por algumas datas. Isso pode indicar oportunidades de negócio ou necessidade de ações estratégicas.

ESTATÍSTICAS GERAIS:
- Total em Filas: ${estatisticasGerais.totalPessoasFilas}
- Datas com Filas Longas: ${estatisticasGerais.datasComFilasLongas}
- Crescimento 24h: ${estatisticasGerais.crescimentoUltimas24h > 0 ? '+' : ''}${estatisticasGerais.crescimentoUltimas24h}%

DATAS COM ALTA DEMANDA:
${datasAlerta.map(dataItem => `
- ${dataItem.data} - ${dataItem.hora}${dataItem.espaco ? ` (${dataItem.espaco})` : ''}
  ${dataItem.totalFila} na fila | ${dataItem.ultimasReservas} reservas 24h | Tempo médio: ${dataItem.tempoMedioEspera}
  Tendência: ${dataItem.tendencia === 'crescente' ? 'Crescente' : 
    dataItem.tendencia === 'estavel' ? 'Estável' : 'Decrescente'}
`).join('')}

RECOMENDAÇÕES ESTRATÉGICAS:
${recomendacoes.map(rec => `- ${rec}`).join('\n')}

LINK PARA GERENCIAMENTO:
${linkGerenciamento}

Nota: Este alerta é gerado automaticamente quando detectamos filas com mais de 5 pessoas ou crescimento superior a 50% nas últimas 24 horas.

Atenciosamente,
Sistema de Gestão de Contratos
  `.trim();
}