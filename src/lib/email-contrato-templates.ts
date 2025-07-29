interface ContratoEmailData {
  cliente_nome: string;
  numero_contrato: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  num_convidados: number;
  link_contrato: string;
}

export function gerarTemplateEmailContrato(dados: ContratoEmailData): string {
  const dataFormatada = new Date(dados.data_evento).toLocaleDateString('pt-BR');
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato de Evento - Assinatura Digital</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f8f9fa; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: #2d3748; padding: 30px; text-align: center;">
      <div>
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
          Contrato de Evento
        </h1>
        <p style="color: #a0aec0; margin: 10px 0 0 0; font-size: 16px;">
          Assinatura Digital Segura
        </p>
        <div style="background: #4a5568; padding: 6px 14px; border-radius: 4px; display: inline-block; margin-top: 12px;">
          <span style="color: white; font-size: 14px; font-weight: 500;">Eventos Indaiatuba</span>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1a202c; margin: 0 0 10px 0; font-size: 24px;">
          Olá, <strong style="color: #2d3748;">${dados.cliente_nome}</strong>!
        </h2>
        <p style="color: #4a5568; margin: 0; font-size: 16px; line-height: 1.6;">
          Seu contrato de evento está pronto para <strong>assinatura digital</strong>!
        </p>
      </div>
      
      <!-- Contract Summary Card -->
      <div style="background: #f7fafc; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #2d3748;">
        <h3 style="margin: 0 0 20px 0; color: #2d3748; font-size: 18px;">
          Resumo do Contrato
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
          <div style="display: flex; flex-direction: column;">
            <span style="color: #718096; font-weight: 500; margin-bottom: 5px;">Contrato:</span>
            <span style="color: #2d3748; font-weight: 600;">${dados.numero_contrato}</span>
          </div>
          <div style="display: flex; flex-direction: column;">
            <span style="color: #718096; font-weight: 500; margin-bottom: 5px;">Evento:</span>
            <span style="color: #2d3748; font-weight: 600;">${dados.tipo_evento}</span>
          </div>
          <div style="display: flex; flex-direction: column;">
            <span style="color: #718096; font-weight: 500; margin-bottom: 5px;">Data:</span>
            <span style="color: #2d3748; font-weight: 600;">${dataFormatada}</span>
          </div>
          <div style="display: flex; flex-direction: column;">
            <span style="color: #718096; font-weight: 500; margin-bottom: 5px;">Local:</span>
            <span style="color: #2d3748; font-weight: 600;">${dados.local_evento}</span>
          </div>
          <div style="display: flex; flex-direction: column; grid-column: 1 / -1;">
            <span style="color: #718096; font-weight: 500; margin-bottom: 5px;">Convidados:</span>
            <span style="color: #2d3748; font-weight: 600;">${dados.num_convidados} pessoas</span>
          </div>
        </div>
      </div>
      
      <!-- Steps -->
      <div style="margin: 30px 0;">
        <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px;">Para assinar o contrato:</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; padding: 10px; background: #f7fafc; border-radius: 4px;">
            <div style="background: #2d3748; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin-right: 10px;">1</div>
            <span style="color: #4a5568; font-size: 14px;">Clique no botão abaixo</span>
          </div>
          <div style="display: flex; align-items: center; padding: 10px; background: #f7fafc; border-radius: 4px;">
            <div style="background: #2d3748; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin-right: 10px;">2</div>
            <span style="color: #4a5568; font-size: 14px;">Informe seu CPF/CNPJ e nome completo</span>
          </div>
          <div style="display: flex; align-items: center; padding: 10px; background: #f7fafc; border-radius: 4px;">
            <div style="background: #2d3748; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin-right: 10px;">3</div>
            <span style="color: #4a5568; font-size: 14px;">Visualize o contrato completo</span>
          </div>
          <div style="display: flex; align-items: center; padding: 10px; background: #f7fafc; border-radius: 4px;">
            <div style="background: #2d3748; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin-right: 10px;">4</div>
            <span style="color: #4a5568; font-size: 14px;">Assine digitalmente com validade jurídica</span>
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dados.link_contrato}" 
           style="background: #2d3748; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  display: inline-block; 
                  font-weight: 500; 
                  font-size: 16px;">
          Visualizar e Assinar Contrato
        </a>
      </div>
      
      <!-- Important Notice -->
      <div style="background: #fef5e7; 
                  border: 1px solid #d69e2e; 
                  padding: 15px; 
                  border-radius: 4px; 
                  margin: 20px 0;">
        <div>
          <p style="margin: 0 0 8px 0; color: #744210; font-weight: 600; font-size: 14px;">
            IMPORTANTE - Tenha em mãos:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #744210; font-size: 14px;">
            <li>Seu documento (CPF/CNPJ) para validação</li>
            <li>Nome completo conforme cadastrado</li>
          </ul>
        </div>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #e6fffa; border: 1px solid #38b2ac; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <div>
          <p style="margin: 0; color: #234e52; font-size: 13px; line-height: 1.5;">
            <strong>Segurança garantida:</strong> Sua assinatura digital possui a mesma validade jurídica de uma assinatura manuscrita, com rastreamento de IP e certificado de autenticidade único.
          </p>
        </div>
      </div>
      
      <!-- Support -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
          Dúvidas ou precisa de ajuda?
        </p>
        <a href="mailto:contato@eventosindaia.com.br" 
           style="color: #2d3748; text-decoration: none; font-weight: 500; font-size: 14px;">
          contato@eventosindaia.com.br
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #1a202c; padding: 25px 30px; text-align: center;">
      <p style="margin: 0 0 5px 0; color: #a0aec0; font-size: 14px; font-weight: 500;">
        Eventos Indaiatuba
      </p>
      <p style="margin: 0; color: #718096; font-size: 12px;">
        Sistema de Assinatura Digital Segura © ${new Date().getFullYear()}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function gerarAssuntoEmailContrato(numeroContrato: string, tipoEvento: string): string {
  return `📝 Contrato ${numeroContrato} - ${tipoEvento} - Assinatura Digital`;
}