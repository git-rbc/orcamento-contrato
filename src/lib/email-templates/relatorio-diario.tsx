interface RelatorioDiarioProps {
  nomeAdmin: string;
  dataRelatorio: string;
  estatisticas: {
    reservasTemporarias: {
      criadas: number;
      expiradas: number;
      convertidas: number;
      ativas: number;
    };
    filaEspera: {
      novasEntradas: number;
      liberacoes: number;
      totalPessoas: number;
      datasComFila: number;
    };
    propostas: {
      geradas: number;
      aceitas: number;
      recusadas: number;
      pendentes: number;
    };
    contratos: {
      assinados: number;
      valorTotal: string;
    };
  };
  alertas: Array<{
    tipo: 'warning' | 'error' | 'info';
    titulo: string;
    descricao: string;
    acao?: string;
  }>;
  topDatas: Array<{
    data: string;
    reservas: number;
    filaEspera: number;
  }>;
  linkDashboard: string;
}

export function RelatorioDiarioTemplate({
  nomeAdmin,
  dataRelatorio,
  estatisticas,
  alertas,
  topDatas,
  linkDashboard
}: RelatorioDiarioProps) {
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Diário - Gestão de Contratos</title>
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
          background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
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
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .stat-card {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          border-left: 4px solid #6c5ce7;
        }
        .stat-card h3 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 16px;
          font-weight: 600;
        }
        .stat-item {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          padding: 5px 0;
        }
        .stat-label {
          color: #666;
          font-size: 14px;
        }
        .stat-value {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        .stat-value.positive {
          color: #28a745;
        }
        .stat-value.negative {
          color: #dc3545;
        }
        .stat-value.warning {
          color: #ffc107;
        }
        .alerts-section {
          margin: 30px 0;
        }
        .alert-item {
          background-color: #fff;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert-item.warning {
          border-left-color: #ffc107;
          background-color: #fff8e1;
        }
        .alert-item.error {
          border-left-color: #dc3545;
          background-color: #ffeaea;
        }
        .alert-item.info {
          border-left-color: #17a2b8;
          background-color: #e1f5fe;
        }
        .alert-title {
          font-weight: 600;
          margin-bottom: 5px;
          color: #333;
        }
        .alert-description {
          color: #666;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .alert-action {
          color: #6c5ce7;
          font-size: 12px;
          font-style: italic;
        }
        .top-dates {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .top-dates h3 {
          margin: 0 0 15px 0;
          color: #495057;
        }
        .date-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .date-item:last-child {
          border-bottom: none;
        }
        .date-name {
          font-weight: 600;
          color: #333;
        }
        .date-stats {
          display: flex;
          gap: 15px;
          font-size: 14px;
        }
        .date-stat {
          text-align: center;
        }
        .date-stat-value {
          font-weight: 600;
          display: block;
        }
        .date-stat-label {
          color: #666;
          font-size: 12px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
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
          color: #6c5ce7;
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
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .date-stats {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📊</div>
          <h1>Relatório Diário</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${dataRelatorio}</p>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nomeAdmin}</strong>,</p>
          
          <p>Aqui está o resumo das atividades do sistema de calendário e reservas temporárias:</p>
          
          <div class="stats-grid">
            <div class="stat-card">
              <h3>📅 Reservas Temporárias</h3>
              <div class="stat-item">
                <span class="stat-label">Criadas hoje:</span>
                <span class="stat-value positive">${estatisticas.reservasTemporarias.criadas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Convertidas:</span>
                <span class="stat-value positive">${estatisticas.reservasTemporarias.convertidas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Expiradas:</span>
                <span class="stat-value negative">${estatisticas.reservasTemporarias.expiradas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Ativas:</span>
                <span class="stat-value">${estatisticas.reservasTemporarias.ativas}</span>
              </div>
            </div>
            
            <div class="stat-card">
              <h3>👥 Fila de Espera</h3>
              <div class="stat-item">
                <span class="stat-label">Novas entradas:</span>
                <span class="stat-value">${estatisticas.filaEspera.novasEntradas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Liberações:</span>
                <span class="stat-value">${estatisticas.filaEspera.liberacoes}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Total aguardando:</span>
                <span class="stat-value warning">${estatisticas.filaEspera.totalPessoas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Datas com fila:</span>
                <span class="stat-value">${estatisticas.filaEspera.datasComFila}</span>
              </div>
            </div>
            
            <div class="stat-card">
              <h3>📋 Propostas</h3>
              <div class="stat-item">
                <span class="stat-label">Geradas:</span>
                <span class="stat-value positive">${estatisticas.propostas.geradas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Aceitas:</span>
                <span class="stat-value positive">${estatisticas.propostas.aceitas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Recusadas:</span>
                <span class="stat-value negative">${estatisticas.propostas.recusadas}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Pendentes:</span>
                <span class="stat-value warning">${estatisticas.propostas.pendentes}</span>
              </div>
            </div>
            
            <div class="stat-card">
              <h3>📄 Contratos</h3>
              <div class="stat-item">
                <span class="stat-label">Assinados hoje:</span>
                <span class="stat-value positive">${estatisticas.contratos.assinados}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Valor total:</span>
                <span class="stat-value positive">${estatisticas.contratos.valorTotal}</span>
              </div>
            </div>
          </div>
          
          ${alertas.length > 0 ? `
          <div class="alerts-section">
            <h3>🚨 Alertas e Notificações</h3>
            ${alertas.map(alerta => `
            <div class="alert-item ${alerta.tipo}">
              <div class="alert-title">${alerta.titulo}</div>
              <div class="alert-description">${alerta.descricao}</div>
              ${alerta.acao ? `<div class="alert-action">Ação recomendada: ${alerta.acao}</div>` : ''}
            </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${topDatas.length > 0 ? `
          <div class="top-dates">
            <h3>🔥 Datas com Maior Demanda</h3>
            ${topDatas.map((data, index) => `
            <div class="date-item">
              <span class="date-name">${index + 1}. ${data.data}</span>
              <div class="date-stats">
                <div class="date-stat">
                  <span class="date-stat-value">${data.reservas}</span>
                  <span class="date-stat-label">Reservas</span>
                </div>
                <div class="date-stat">
                  <span class="date-stat-value">${data.filaEspera}</span>
                  <span class="date-stat-label">Na Fila</span>
                </div>
              </div>
            </div>
            `).join('')}
          </div>
          ` : ''}
          
          <div class="cta-container">
            <a href="${linkDashboard}" class="cta-button">
              📊 Ver Dashboard Completo
            </a>
          </div>
          
          <p>Este relatório é gerado automaticamente todos os dias às 08:00.</p>
          
          <p>Atenciosamente,<br>
          <strong>Sistema de Gestão de Contratos</strong></p>
        </div>
        
        <div class="footer">
          <p>Relatório automático diário - Sistema de Gestão de Contratos</p>
          <p>© 2024 Gestão de Contratos. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

export function getRelatorioDiarioText({
  nomeAdmin,
  dataRelatorio,
  estatisticas,
  alertas,
  topDatas,
  linkDashboard
}: RelatorioDiarioProps): string {
  return `
RELATÓRIO DIÁRIO - ${dataRelatorio}

Olá ${nomeAdmin},

Aqui está o resumo das atividades do sistema de calendário e reservas temporárias:

RESERVAS TEMPORÁRIAS:
- Criadas hoje: ${estatisticas.reservasTemporarias.criadas}
- Convertidas: ${estatisticas.reservasTemporarias.convertidas}
- Expiradas: ${estatisticas.reservasTemporarias.expiradas}
- Ativas: ${estatisticas.reservasTemporarias.ativas}

FILA DE ESPERA:
- Novas entradas: ${estatisticas.filaEspera.novasEntradas}
- Liberações: ${estatisticas.filaEspera.liberacoes}
- Total aguardando: ${estatisticas.filaEspera.totalPessoas}
- Datas com fila: ${estatisticas.filaEspera.datasComFila}

PROPOSTAS:
- Geradas: ${estatisticas.propostas.geradas}
- Aceitas: ${estatisticas.propostas.aceitas}
- Recusadas: ${estatisticas.propostas.recusadas}
- Pendentes: ${estatisticas.propostas.pendentes}

CONTRATOS:
- Assinados hoje: ${estatisticas.contratos.assinados}
- Valor total: ${estatisticas.contratos.valorTotal}

${alertas.length > 0 ? `
ALERTAS E NOTIFICAÇÕES:
${alertas.map(alerta => `
- ${alerta.titulo}: ${alerta.descricao}
  ${alerta.acao ? `Ação recomendada: ${alerta.acao}` : ''}
`).join('')}
` : ''}

${topDatas.length > 0 ? `
DATAS COM MAIOR DEMANDA:
${topDatas.map((data, index) => `${index + 1}. ${data.data} - ${data.reservas} reservas, ${data.filaEspera} na fila`).join('\n')}
` : ''}

DASHBOARD COMPLETO:
${linkDashboard}

Este relatório é gerado automaticamente todos os dias às 08:00.

Atenciosamente,
Sistema de Gestão de Contratos
  `.trim();
}