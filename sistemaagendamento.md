Vamos criar o sistema de agendamentos de reuniões utilizando opcionalmente nossos agentes e consultando gemini cli ou codex cli opcionalmente tambem, leia o codebase e consulte as tabelas via mcp do supabase, ao criar menus além de inserir no código os insira na tabela menus seguindo a estrutura. 
## 2. Sistema de Agendamento de Reuniões 
### Objetivo 
Complementar o calendário (menu) de datas com um sistema completo de agendamento de reuniões (pode ser um submenu), incluindo gestão de disponibilidade de vendedores, usar api resend para envio de email de reunioes agendadas. 
### Funcionalidades Principais 
#### 2.1 Agendamento de Reuniões 
 Permitir inserir o link do google meet ou microsoft teams. 
- Interface integrada ao calendário de datas 
- Fluxo sequencial: reserva de data → agendamento de reunião - Campos para agendamento: 
 - Data e horário 
 - Cliente (integração com base existente) 
 - Vendedor responsável 
 - Ambiente/espaço 
 - Tipo de reunião 
 - Observações 
#### 2.2 Gestão de Disponibilidade de Vendedores 
- Calendário de disponibilidade por vendedor
- Configuração de horários por: 
 - Dia da semana 
 - Ambiente/cidade 
 - Período (manhã, tarde, noite) 
- Suporte a vendedores que trabalham em múltiplas cidades - Bloqueios temporários e permanentes 
#### 2.3 Visualizações Administrativas 
- Dashboard com filtros por: 
 - Horário 
 - Cidade 
 - Vendedor 
 - Ambiente 
 - Status da reunião 
- Relatórios de produtividade 
- Análise de ocupação por vendedor/ambiente 
#### 2.4 Controle de Acesso 
- **Vendedores**: Visualização apenas (consulta de agenda) - **Administração**: Controle total de disponibilidade 
- **Pré-vendedores**: Agendamento dentro da disponibilidade 
