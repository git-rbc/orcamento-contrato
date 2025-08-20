import { EmailTemplateData } from '../resend';

interface PosicaoFilaAtualizadaProps extends EmailTemplateData {
  nomeCliente: string;
  emailCliente: string;
  posicaoAnterior: number;
  posicaoAtual: number;
  totalFila: number;
  motivo: 'subiu_na_fila' | 'foi_liberado' | 'nova_posicao';
  linkGerenciar: string;
  observacoesAdicionais?: string;
}

export function PosicaoFilaAtualizadaTemplate({
  nome, // nome do pré-vendedor
  data,
  hora,
  espaco,
  nomeCliente,
  emailCliente,
  posicaoAnterior,
  posicaoAtual,
  totalFila,
  motivo,
  linkGerenciar,
  observacoesAdicionais
}: PosicaoFilaAtualizadaProps) {
  const getMotivoTexto = () => {
    switch (motivo) {
      case 'subiu_na_fila':
        return {
          titulo: 'Cliente Subiu na Fila!',
          cor: '#28a745',
          emoji: '📈',
          descricao: `O cliente ${nomeCliente} subiu da posição ${posicaoAnterior} para a posição ${posicaoAtual} na fila de espera.`
        };
      case 'foi_liberado':
        return {
          titulo: 'Data Liberada - Cliente na Fila!',
          cor: '#17a2b8',
          emoji: '🎯',
          descricao: `A data foi liberada e o cliente ${nomeCliente} estava na posição ${posicaoAtual} da fila de espera.`
        };
      case 'nova_posicao':
        return {
          titulo: 'Posição na Fila Atualizada',
          cor: '#ffc107',
          emoji: '🔄',
          descricao: `A posição do cliente ${nomeCliente} na fila foi atualizada para ${posicaoAtual}.`
        };
      default:
        return {
          titulo: 'Fila de Espera Atualizada',
          cor: '#6c757d',
          emoji: '📋',
          descricao: `Houve uma atualização na fila de espera para o cliente ${nomeCliente}.`
        };
    }
  };

  const motivoInfo = getMotivoTexto();

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Posição na Fila Atualizada</title>
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
          background: linear-gradient(135deg, ${motivoInfo.cor} 0%, ${motivoInfo.cor}dd 100%);
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
        .status-badge {
          background-color: ${motivoInfo.cor}20;
          border: 1px solid ${motivoInfo.cor}40;
          color: ${motivoInfo.cor};
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
        .queue-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid ${motivoInfo.cor};
        }
        .queue-details h3 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 18px;
        }
        .position-change {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin: 20px 0;
          font-size: 24px;
          font-weight: bold;
        }
        .position-box {
          background-color: #fff;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 15px 20px;
          text-align: center;
          min-width: 80px;
        }
        .position-current {
          border-color: ${motivoInfo.cor};
          background-color: ${motivoInfo.cor}10;
          color: ${motivoInfo.cor};
        }
        .arrow {
          color: ${motivoInfo.cor};
          font-size: 30px;
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
          background: linear-gradient(135deg, ${motivoInfo.cor} 0%, ${motivoInfo.cor}dd 100%);
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
          border-left: 4px solid ${motivoInfo.cor};
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
          color: ${motivoInfo.cor};
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
          .detail-item {
            flex-direction: column;
            gap: 5px;
          }
          .position-change {
            flex-direction: column;
            gap: 10px;
          }
          .arrow {
            transform: rotate(90deg);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${motivoInfo.emoji}</div>
          <h1>${motivoInfo.titulo}</h1>
        </div>
        
        <div class="content">
          <p>Olá <strong>${nome}</strong>,</p>
          
          <div class="status-badge">
            ${motivoInfo.emoji} ${motivoInfo.descricao}
          </div>
          
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
          </div>
          
          <div class="queue-details">
            <h3>📋 Detalhes da Data</h3>
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
              <span class="detail-label">Total na Fila:</span>
              <span class="detail-value">${totalFila} ${totalFila === 1 ? 'pessoa' : 'pessoas'}</span>
            </div>
          </div>
          
          ${motivo !== 'foi_liberado' ? `
          <div class="position-change">
            <div class="position-box">
              <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Posição Anterior</div>
              <div>${posicaoAnterior}°</div>
            </div>
            <div class="arrow">→</div>
            <div class="position-box position-current">
              <div style="font-size: 14px; margin-bottom: 5px;">Posição Atual</div>
              <div>${posicaoAtual}°</div>
            </div>
          </div>
          ` : `
          <div style="text-align: center; margin: 20px 0;">
            <div class="position-box position-current" style="display: inline-block;">
              <div style="font-size: 14px; margin-bottom: 5px;">Posição na Fila</div>
              <div>${posicaoAtual}°</div>
            </div>
          </div>
          `}
          
          <div class="cta-container">
            <a href="${linkGerenciar}" class="cta-button">
              📊 Ver Detalhes da Fila
            </a>
          </div>
          
          <div class="actions-box">
            <h4>📋 Próximas Ações Recomendadas:</h4>
            ${motivo === 'foi_liberado' ? `
            <ul>
              <li><strong>Contatar o Cliente:</strong> Informar que a data foi liberada</li>
              <li><strong>Criar Reserva Temporária:</strong> Se o cliente confirmar interesse</li>
              <li><strong>Verificar Disponibilidade:</strong> Confirmar se a data ainda está livre</li>
            </ul>
            ` : `
            <ul>
              <li><strong>Acompanhar Posição:</strong> Monitorar se o cliente continua subindo na fila</li>
              <li><strong>Preparar Proposta:</strong> Deixar tudo pronto para quando a data for liberada</li>
              <li><strong>Manter Contato:</strong> Informar o cliente sobre sua nova posição</li>
            </ul>
            `}
          </div>
          
          ${observacoesAdicionais ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>📝 Observações Adicionais:</strong><br>
            ${observacoesAdicionais}
          </div>
          ` : ''}
          
          <p>Atenciosamente,<br>
          <strong>Sistema de Gestão de Contratos</strong></p>
        </div>
        
        <div class="footer">
          <p>Este é um alerta automático sobre atualizações na fila de espera.</p>
          <p>© 2024 Gestão de Contratos. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

export function getPosicaoFilaAtualizadaText({
  nome,
  data,
  hora,
  espaco,
  nomeCliente,
  emailCliente,
  posicaoAnterior,
  posicaoAtual,
  totalFila,
  motivo,
  linkGerenciar,
  observacoesAdicionais
}: PosicaoFilaAtualizadaProps): string {
  const getMotivoTexto = () => {
    switch (motivo) {
      case 'subiu_na_fila':
        return `Cliente subiu da posição ${posicaoAnterior} para a posição ${posicaoAtual} na fila de espera.`;
      case 'foi_liberado':
        return `A data foi liberada e o cliente estava na posição ${posicaoAtual} da fila de espera.`;
      case 'nova_posicao':
        return `A posição do cliente na fila foi atualizada para ${posicaoAtual}.`;
      default:
        return `Houve uma atualização na fila de espera para o cliente.`;
    }
  };

  return `
POSIÇÃO NA FILA ATUALIZADA

Olá ${nome},

${getMotivoTexto()}

INFORMAÇÕES DO CLIENTE:
- Nome: ${nomeCliente}
- Email: ${emailCliente}

DETALHES DA DATA:
- Data do Evento: ${data}
- Horário: ${hora}
${espaco ? `- Espaço: ${espaco}` : ''}
- Total na Fila: ${totalFila} ${totalFila === 1 ? 'pessoa' : 'pessoas'}

POSIÇÃO NA FILA:
${motivo !== 'foi_liberado' ? `- Posição Anterior: ${posicaoAnterior}°` : ''}
- Posição Atual: ${posicaoAtual}°

LINK PARA GERENCIAR:
${linkGerenciar}

PRÓXIMAS AÇÕES RECOMENDADAS:
${motivo === 'foi_liberado' ? `
- Contatar o Cliente: Informar que a data foi liberada
- Criar Reserva Temporária: Se o cliente confirmar interesse
- Verificar Disponibilidade: Confirmar se a data ainda está livre
` : `
- Acompanhar Posição: Monitorar se o cliente continua subindo na fila
- Preparar Proposta: Deixar tudo pronto para quando a data for liberada
- Manter Contato: Informar o cliente sobre sua nova posição
`}

${observacoesAdicionais ? `OBSERVAÇÕES ADICIONAIS:\n${observacoesAdicionais}\n` : ''}

Atenciosamente,
Sistema de Gestão de Contratos
  `.trim();
}