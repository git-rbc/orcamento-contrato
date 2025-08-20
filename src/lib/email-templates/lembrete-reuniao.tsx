import * as React from 'react';

interface LembreteReuniaoProps {
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
  horasAntecedencia: number;
  telefoneContato?: string;
}

export const LembreteReuniaoTemplate: React.FC<LembreteReuniaoProps> = ({
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
  horasAntecedencia,
  telefoneContato
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

  const calcularTempo = () => {
    if (horasAntecedencia < 1) {
      return `${Math.round(horasAntecedencia * 60)} minutos`;
    } else if (horasAntecedencia === 1) {
      return '1 hora';
    } else if (horasAntecedencia === 24) {
      return '1 dia';
    } else if (horasAntecedencia < 24) {
      return `${horasAntecedencia} horas`;
    } else {
      return `${Math.round(horasAntecedencia / 24)} dias`;
    }
  };

  return (
    <html>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Lembrete de Reunião</title>
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
            backgroundColor: '#F59E0B',
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
              ⏰
            </div>
            <h1 style={{
              color: '#fff',
              margin: '0',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              Lembrete de Reunião
            </h1>
            <p style={{
              color: '#FEF3C7',
              margin: '10px 0 0 0',
              fontSize: '16px'
            }}>
              Sua reunião será em {calcularTempo()}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '30px' }}>
            <p style={{ fontSize: '16px', marginBottom: '25px' }}>
              Olá <strong>{clienteNome}</strong>,
            </p>

            <p style={{ fontSize: '16px', marginBottom: '30px' }}>
              Este é um lembrete da sua reunião agendada. Não se esqueça!
            </p>

            {/* Meeting Details Card */}
            <div style={{
              backgroundColor: '#FEF7CD',
              border: '2px solid #F59E0B',
              borderRadius: '8px',
              padding: '25px',
              marginBottom: '30px'
            }}>
              <h2 style={{
                color: '#92400E',
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 'bold',
                borderBottom: '2px solid #F59E0B',
                paddingBottom: '10px'
              }}>
                Detalhes da Reunião
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#92400E',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Tipo:
                  </span>
                  <span style={{ color: '#451A03', fontSize: '16px' }}>
                    {tipoReuniao}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#92400E',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Data:
                  </span>
                  <span style={{ color: '#451A03', fontSize: '16px', fontWeight: 'bold' }}>
                    {formatarData(data)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#92400E',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Horário:
                  </span>
                  <span style={{ 
                    color: '#451A03', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    backgroundColor: '#FCD34D',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {formatarHora(horaInicio)} às {formatarHora(horaFim)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    color: '#92400E',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    display: 'inline-block'
                  }}>
                    Vendedor:
                  </span>
                  <span style={{ color: '#451A03', fontSize: '16px' }}>
                    {vendedorNome}
                  </span>
                </div>

                {espacoNome && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      color: '#92400E',
                      fontWeight: 'bold',
                      minWidth: '120px',
                      display: 'inline-block'
                    }}>
                      Local:
                    </span>
                    <span style={{ color: '#451A03', fontSize: '16px' }}>
                      {espacoNome}
                    </span>
                  </div>
                )}

                {linkReuniao && (
                  <div style={{ 
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#FCD34D',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{
                      margin: '0 0 10px 0',
                      color: '#451A03',
                      fontWeight: 'bold'
                    }}>
                      Link da reunião online:
                    </p>
                    <a 
                      href={linkReuniao} 
                      style={{
                        color: '#7C2D12',
                        textDecoration: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        backgroundColor: '#fff',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}
                    >
                      Entrar na Reunião
                    </a>
                  </div>
                )}
              </div>
            </div>

            {observacoes && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #EF4444',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h3 style={{
                  color: '#DC2626',
                  margin: '0 0 10px 0',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  Observações Importantes:
                </h3>
                <p style={{
                  color: '#DC2626',
                  margin: '0',
                  fontSize: '14px'
                }}>
                  {observacoes}
                </p>
              </div>
            )}

            {/* Preparation checklist */}
            <div style={{
              backgroundColor: '#F0F9FF',
              border: '2px solid #3B82F6',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px'
            }}>
              <h3 style={{
                color: '#1E40AF',
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                ✅ Checklist para a Reunião:
              </h3>
              <ul style={{
                color: '#1E3A8A',
                fontSize: '14px',
                margin: '0',
                paddingLeft: '20px'
              }}>
                <li>Documento de identidade</li>
                <li>Chegue 5 minutos antes</li>
                {linkReuniao && <li>Teste o link da reunião online antes</li>}
                <li>Prepare suas dúvidas e questionamentos</li>
                <li>Confirme o endereço (se presencial)</li>
              </ul>
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
                  Precisa reagendar ou tem alguma dúvida?
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
              Aguardamos você!
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
              Este é um lembrete automático da sua reunião agendada.<br />
              Em caso de dúvidas, entre em contato através dos nossos canais oficiais.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};