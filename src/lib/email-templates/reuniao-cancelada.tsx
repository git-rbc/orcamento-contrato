import * as React from 'react';

interface ReuniaoCanceladaProps {
  clienteNome: string;
  vendedorNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipoReuniao: string;
  espacoNome?: string;
  motivo?: string;
  logoUrl?: string;
  telefoneContato?: string;
  linkReagendamento?: string;
}

export const ReuniaoCanceladaTemplate: React.FC<ReuniaoCanceladaProps> = ({
  clienteNome,
  vendedorNome,
  data,
  horaInicio,
  horaFim,
  tipoReuniao,
  espacoNome,
  motivo,
  logoUrl,
  telefoneContato,
  linkReagendamento
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
        <title>Reunião Cancelada</title>
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
            backgroundColor: '#EF4444',
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
            <div style={{
              fontSize: '48px',
              marginBottom: '15px'
            }}>
              ❌
            </div>
            <h1 style={{
              color: '#fff',
              margin: '0',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              Reunião Cancelada
            </h1>
            <p style={{
              color: '#FEE2E2',
              margin: '10px 0 0 0',
              fontSize: '16px'
            }}>
              Infelizmente precisamos cancelar sua reunião
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '30px' }}>
            <p style={{ fontSize: '16px', marginBottom: '25px' }}>
              Olá <strong>{clienteNome}</strong>,
            </p>

            <p style={{ fontSize: '16px', marginBottom: '30px' }}>
              Lamentamos informar que precisamos cancelar a reunião que estava agendada. 
              Pedimos desculpas pelo inconveniente.
            </p>

            {/* Meeting Details Card */}
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              borderRadius: '8px',
              padding: '25px',
              marginBottom: '30px'
            }}>
              <h2 style={{
                color: '#DC2626',
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 'bold',
                borderBottom: '2px solid #EF4444',
                paddingBottom: '10px'
              }}>
                Reunião Cancelada
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#7F1D1D',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Tipo:
                  </span>
                  <span style={{ color: '#450A0A', fontSize: '16px' }}>
                    {tipoReuniao}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#7F1D1D',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Data:
                  </span>
                  <span style={{ color: '#450A0A', fontSize: '16px', textDecoration: 'line-through' }}>
                    {formatarData(data)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#7F1D1D',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Horário:
                  </span>
                  <span style={{ color: '#450A0A', fontSize: '16px', textDecoration: 'line-through' }}>
                    {formatarHora(horaInicio)} às {formatarHora(horaFim)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#7F1D1D',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Vendedor:
                  </span>
                  <span style={{ color: '#450A0A', fontSize: '16px' }}>
                    {vendedorNome}
                  </span>
                </div>

                {espacoNome && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#7F1D1D',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Local:
                    </span>
                    <span style={{ color: '#450A0A', fontSize: '16px' }}>
                      {espacoNome}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {motivo && (
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
                  Motivo do Cancelamento:
                </h3>
                <p style={{
                  color: '#92400E',
                  margin: '0',
                  fontSize: '14px'
                }}>
                  {motivo}
                </p>
              </div>
            )}

            {/* Reschedule section */}
            <div style={{
              backgroundColor: '#F0F9FF',
              border: '2px solid #3B82F6',
              borderRadius: '8px',
              padding: '25px',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              <h3 style={{
                color: '#1E40AF',
                margin: '0 0 15px 0',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                Vamos Reagendar?
              </h3>
              <p style={{
                color: '#1E3A8A',
                margin: '0 0 20px 0',
                fontSize: '14px'
              }}>
                Não perdemos o interesse em atendê-lo. Que tal reagendarmos para uma nova data?
              </p>

              {linkReagendamento ? (
                <a
                  href={linkReagendamento}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#fff',
                    padding: '12px 30px',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'inline-block'
                  }}
                >
                  Reagendar Reunião
                </a>
              ) : (
                <p style={{
                  color: '#1E40AF',
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  Entre em contato conosco para reagendar
                </p>
              )}
            </div>

            {/* Contact info */}
            {telefoneContato && (
              <div style={{
                backgroundColor: '#F1F5F9',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{
                  color: '#334155',
                  margin: '0 0 10px 0',
                  fontSize: '14px'
                }}>
                  Para reagendar ou tirar dúvidas, entre em contato:
                </p>
                <p style={{
                  color: '#334155',
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  📞 {telefoneContato}
                </p>
              </div>
            )}

            <p style={{ fontSize: '16px', marginTop: '30px' }}>
              Mais uma vez, pedimos desculpas pelo cancelamento e esperamos reagendar em breve.
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
              Este é um e-mail automático de cancelamento.<br />
              Em caso de dúvidas, entre em contato através dos nossos canais oficiais.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};