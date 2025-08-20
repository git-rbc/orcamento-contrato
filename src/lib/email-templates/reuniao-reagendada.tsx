import * as React from 'react';

interface ReuniaoReagendadaProps {
  clienteNome: string;
  vendedorNome: string;
  // Dados antigos
  dataAnterior: string;
  horaInicioAnterior: string;
  horaFimAnterior: string;
  // Dados novos
  dataNova: string;
  horaInicioNova: string;
  horaFimNova: string;
  // Outros dados
  tipoReuniao: string;
  espacoNome?: string;
  linkReuniao?: string;
  motivo?: string;
  observacoes?: string;
  logoUrl?: string;
  confirmationUrl?: string;
}

export const ReuniaoReagendadaTemplate: React.FC<ReuniaoReagendadaProps> = ({
  clienteNome,
  vendedorNome,
  dataAnterior,
  horaInicioAnterior,
  horaFimAnterior,
  dataNova,
  horaInicioNova,
  horaFimNova,
  tipoReuniao,
  espacoNome,
  linkReuniao,
  motivo,
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
        <title>Reunião Reagendada</title>
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
            backgroundColor: '#8B5CF6',
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
              marginBottom: '15px',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              REAGENDADA
            </div>
            <h1 style={{
              color: '#fff',
              margin: '0',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              Reunião Reagendada
            </h1>
            <p style={{
              color: '#EDE9FE',
              margin: '10px 0 0 0',
              fontSize: '16px'
            }}>
              Sua reunião foi reagendada com sucesso
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '30px' }}>
            <p style={{ fontSize: '16px', marginBottom: '25px' }}>
              Olá <strong>{clienteNome}</strong>,
            </p>

            <p style={{ fontSize: '16px', marginBottom: '30px' }}>
              Informamos que sua reunião foi reagendada. Confira abaixo os novos dados:
            </p>

            {/* Comparison Cards */}
            <div style={{ marginBottom: '30px' }}>
              {/* Old meeting */}
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                opacity: '0.7'
              }}>
                <h3 style={{
                  color: '#DC2626',
                  margin: '0 0 15px 0',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  Data Anterior (Cancelada)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#7F1D1D' }}>Data:</strong>
                    <span style={{ color: '#7F1D1D', marginLeft: '10px', textDecoration: 'line-through' }}>
                      {formatarData(dataAnterior)}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: '#7F1D1D' }}>Horário:</strong>
                    <span style={{ color: '#7F1D1D', marginLeft: '10px', textDecoration: 'line-through' }}>
                      {formatarHora(horaInicioAnterior)} às {formatarHora(horaFimAnterior)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <span style={{ fontSize: '18px', color: '#8B5CF6', fontWeight: 'bold' }}>PARA:</span>
              </div>

              {/* New meeting */}
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '2px solid #10B981',
                borderRadius: '8px',
                padding: '25px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '20px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  padding: '5px 15px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  NOVA DATA
                </div>

                <h3 style={{
                  color: '#047857',
                  margin: '10px 0 20px 0',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  Novo Agendamento
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#065F46',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Tipo:
                    </span>
                    <span style={{ color: '#064E3B', fontSize: '16px' }}>
                      {tipoReuniao}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#065F46',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Data:
                    </span>
                    <span style={{ 
                      color: '#064E3B', 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      backgroundColor: '#A7F3D0',
                      padding: '4px 12px',
                      borderRadius: '6px'
                    }}>
                      {formatarData(dataNova)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#065F46',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Horário:
                    </span>
                    <span style={{ 
                      color: '#064E3B', 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      backgroundColor: '#A7F3D0',
                      padding: '4px 12px',
                      borderRadius: '6px'
                    }}>
                      {formatarHora(horaInicioNova)} às {formatarHora(horaFimNova)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#065F46',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Vendedor:
                    </span>
                    <span style={{ color: '#064E3B', fontSize: '16px' }}>
                      {vendedorNome}
                    </span>
                  </div>

                  {espacoNome && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        color: '#065F46',
                        fontWeight: 'bold',
                        minWidth: '120px',
                        display: 'inline-block'
                      }}>
                        Local:
                      </span>
                      <span style={{ color: '#064E3B', fontSize: '16px' }}>
                        {espacoNome}
                      </span>
                    </div>
                  )}

                  {linkReuniao && (
                    <div style={{ 
                      marginTop: '15px',
                      textAlign: 'center'
                    }}>
                      <a 
                        href={linkReuniao} 
                        style={{
                          color: '#10B981',
                          textDecoration: 'none',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          backgroundColor: '#fff',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '2px solid #10B981',
                          display: 'inline-block'
                        }}
                      >
                        Link da Reunião Online
                      </a>
                    </div>
                  )}
                </div>
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
                  Motivo do Reagendamento:
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

            {observacoes && (
              <div style={{
                backgroundColor: '#F0F9FF',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h3 style={{
                  color: '#1E40AF',
                  margin: '0 0 10px 0',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  Observações:
                </h3>
                <p style={{
                  color: '#1E40AF',
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
                  Confirmar Nova Data
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
                Lembre-se:
              </h3>
              <ul style={{
                color: '#64748B',
                fontSize: '14px',
                margin: '0',
                paddingLeft: '20px'
              }}>
                <li>Anote a nova data e horário em sua agenda</li>
                <li>Chegue 5 minutos antes do horário agendado</li>
                <li>Traga documento de identidade</li>
                {linkReuniao && <li>Teste o link da reunião online antes do horário</li>}
              </ul>
            </div>

            <p style={{ fontSize: '16px', marginTop: '30px' }}>
              Agradecemos pela compreensão e esperamos vê-lo na nova data!
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
              Este é um e-mail automático de reagendamento.<br />
              Em caso de dúvidas, entre em contato através dos nossos canais oficiais.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};