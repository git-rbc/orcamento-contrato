import * as React from 'react';

interface ReuniaoAgendadaProps {
  clienteNome: string;
  vendedorNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipoReuniao: string;
  espacoNome?: string;
  linkReuniao?: string;
  observacoes?: string;
  logoUrl?: string;
  confirmationUrl?: string;
}

export const ReuniaoAgendadaTemplate: React.FC<ReuniaoAgendadaProps> = ({
  clienteNome,
  vendedorNome,
  data,
  horaInicio,
  horaFim,
  tipoReuniao,
  espacoNome,
  linkReuniao,
  observacoes,
  logoUrl,
  confirmationUrl
}) => {
  const formatarData = (dataStr: string) => {
    const dataObj = new Date(dataStr + 'T00:00:00');
    return dataObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatarHora = (horaStr: string) => {
    return horaStr.substring(0, 5);
  };

  return (
    <html>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reunião Agendada</title>
      </head>
      <body style={{ 
        fontFamily: 'Arial, sans-serif', 
        lineHeight: '1.6', 
        color: '#333', 
        margin: '0', 
        padding: '0',
        backgroundColor: '#f4f4f4' 
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '20px auto',
          backgroundColor: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#3B82F6',
            padding: '30px 20px',
            textAlign: 'center'
          }}>
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ maxHeight: '60px', marginBottom: '20px' }} 
              />
            )}
            <h1 style={{
              color: '#fff',
              margin: '0',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              Reunião Agendada
            </h1>
            <p style={{
              color: '#E5F3FF',
              margin: '10px 0 0 0',
              fontSize: '16px'
            }}>
              Sua reunião foi confirmada com sucesso
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '30px' }}>
            <p style={{ fontSize: '16px', marginBottom: '25px' }}>
              Olá <strong>{clienteNome}</strong>,
            </p>

            <p style={{ fontSize: '16px', marginBottom: '30px' }}>
              Confirmamos o agendamento da sua reunião. Abaixo estão os detalhes:
            </p>

            {/* Meeting Details Card */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '2px solid #E2E8F0',
              borderRadius: '8px',
              padding: '25px',
              marginBottom: '30px'
            }}>
              <h2 style={{
                color: '#1E40AF',
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 'bold',
                borderBottom: '2px solid #E2E8F0',
                paddingBottom: '10px'
              }}>
                Detalhes da Reunião
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#6B7280',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Tipo:
                  </span>
                  <span style={{ color: '#1F2937', fontSize: '16px' }}>
                    {tipoReuniao}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#6B7280',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Data:
                  </span>
                  <span style={{ color: '#1F2937', fontSize: '16px' }}>
                    {formatarData(data)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#6B7280',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Horário:
                  </span>
                  <span style={{ color: '#1F2937', fontSize: '16px' }}>
                    {formatarHora(horaInicio)} às {formatarHora(horaFim)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#6B7280',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Vendedor:
                  </span>
                  <span style={{ color: '#1F2937', fontSize: '16px' }}>
                    {vendedorNome}
                  </span>
                </div>

                {espacoNome && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#6B7280',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Local:
                    </span>
                    <span style={{ color: '#1F2937', fontSize: '16px' }}>
                      {espacoNome}
                    </span>
                  </div>
                )}

                {linkReuniao && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#6B7280',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Link:
                    </span>
                    <a 
                      href={linkReuniao} 
                      style={{
                        color: '#3B82F6',
                        textDecoration: 'none',
                        fontSize: '16px'
                      }}
                    >
                      Acessar reunião online
                    </a>
                  </div>
                )}
              </div>
            </div>

            {observacoes && (
              <div style={{
                backgroundColor: '#FEF7CD',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h3 style={{
                  color: '#92400E',
                  margin: '0 0 10px 0',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  Observações:
                </h3>
                <p style={{
                  color: '#92400E',
                  margin: '0',
                  fontSize: '14px'
                }}>
                  {observacoes}
                </p>
              </div>
            )}

            {confirmationUrl && (
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <a
                  href={confirmationUrl}
                  style={{
                    backgroundColor: '#10B981',
                    color: '#fff',
                    padding: '12px 30px',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'inline-block'
                  }}
                >
                  Confirmar Presença
                </a>
              </div>
            )}

            <div style={{
              backgroundColor: '#F1F5F9',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: '#334155',
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                Importante:
              </h3>
              <ul style={{
                color: '#64748B',
                fontSize: '14px',
                margin: '0',
                paddingLeft: '20px'
              }}>
                <li>Chegue 5 minutos antes do horário agendado</li>
                <li>Traga documento de identidade</li>
                <li>Em caso de impedimento, reagende com antecedência</li>
                <li>Para cancelar ou reagendar, entre em contato conosco</li>
              </ul>
            </div>

            <p style={{ fontSize: '16px', marginTop: '30px' }}>
              Estamos ansiosos para atendê-lo!
            </p>

            <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
              Atenciosamente,<br />
              Equipe de Vendas
            </p>
          </div>

          {/* Footer */}
          <div style={{
            backgroundColor: '#F8FAFC',
            padding: '20px',
            textAlign: 'center',
            borderTop: '1px solid #E2E8F0'
          }}>
            <p style={{
              color: '#6B7280',
              fontSize: '12px',
              margin: '0'
            }}>
              Este é um e-mail automático, não responda a esta mensagem.<br />
              Em caso de dúvidas, entre em contato através dos nossos canais oficiais.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};