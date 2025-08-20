# Manual do Sistema de Notificações e Alertas

## Visão Geral

O Sistema de Notificações e Alertas foi desenvolvido para manter todos os usuários informados sobre atividades importantes relacionadas a reuniões, conflitos de agenda e atualizações do sistema. O sistema oferece notificações personalizadas baseadas no perfil do usuário e suas preferências.

## Tipos de Usuário e Notificações

### Cliente
Os clientes recebem notificações relacionadas às suas próprias reuniões:
- Confirmação de reunião agendada
- Lembretes de reuniões (24 horas e 2 horas antes)
- Alterações em suas reuniões (reagendamento, cancelamento)
- Notificações sobre conflitos que afetem suas reuniões

### Vendedor
Os vendedores recebem notificações sobre sua agenda e atividades:
- Nova reunião agendada em sua agenda
- Cancelamentos e reagendamentos de reuniões
- Conflitos de agenda detectados
- Lembretes de reuniões próximas
- Alertas sobre sobreposição de horários

### Administrador
Os administradores recebem notificações estratégicas e de gestão:
- Relatórios diários de reuniões
- Alertas de alta demanda em espaços
- Conflitos críticos de agenda que necessitam intervenção
- Resumo de atividades do sistema
- Alertas de problemas operacionais

## Como Acessar as Notificações

### Sino de Notificações
1. Localize o ícone de sino na barra lateral, próximo ao seu perfil de usuário
2. O sino mostra um badge vermelho com o número de notificações não lidas
3. Clique no sino para abrir o dropdown de notificações

### Dropdown de Notificações
O dropdown apresenta:
- Lista das notificações mais recentes
- Indicação de notificações lidas e não lidas
- Botão para marcar todas como lidas
- Acesso às configurações de notificação
- Link para visualização completa (quando implementado)

## Tipos de Notificações

### Notificações de Reunião

#### Reunião Agendada
- **Quando ocorre**: Ao criar uma nova reunião
- **Destinatários**: Cliente e Vendedor envolvidos
- **Conteúdo**: Data, horário, tipo de reunião e participantes

#### Lembrete de Reunião
- **Quando ocorre**: 24 horas e 2 horas antes da reunião
- **Destinatários**: Cliente e Vendedor
- **Conteúdo**: Informações da reunião e tempo restante

#### Alteração de Reunião
- **Quando ocorre**: Ao reagendar ou cancelar reunião
- **Destinatários**: Todas as partes envolvidas
- **Conteúdo**: Detalhes da alteração e nova data/horário (se aplicável)

### Notificações de Conflito

#### Conflito de Agenda
- **Quando ocorre**: Sistema detecta sobreposição de horários
- **Destinatários**: Vendedor afetado
- **Conteúdo**: Reuniões em conflito e horários sobrepostos

#### Conflito Crítico
- **Quando ocorre**: Conflitos que requerem intervenção administrativa
- **Destinatários**: Administradores
- **Conteúdo**: Detalhes do conflito e vendedor afetado

### Notificações Administrativas

#### Relatório Diário
- **Quando ocorre**: Diariamente às 08:00
- **Destinatários**: Administradores
- **Conteúdo**: Estatísticas de reuniões, resumo de atividades

#### Alta Demanda
- **Quando ocorre**: Quando filas de espera excedem limites configurados
- **Destinatários**: Administradores
- **Conteúdo**: Espaços com alta demanda e estatísticas

## Configurações de Notificação

### Acessando as Preferências
1. Clique no sino de notificações
2. Clique no ícone de configurações no dropdown
3. Ajuste suas preferências conforme necessário

### Tipos de Configuração

#### Notificações por Email
- **Email de Reuniões**: Confirmações e alterações de reuniões
- **Email de Lembretes**: Lembretes automáticos de reuniões
- **Email de Alterações**: Notificações sobre mudanças em reuniões

#### Notificações no Sistema
- **Notificações de Conflitos**: Alertas sobre conflitos de agenda
- **Notificações no App**: Notificações gerais dentro do sistema

#### Configurações Administrativas
- **Horário de Relatório**: Horário preferido para receber relatórios diários
- **Limites de Alerta**: Configuração de quando alertas de alta demanda são enviados

## Gerenciando Notificações

### Marcar como Lida
- Clique no ícone de check ao lado da notificação individual
- Use o botão "Marcar todas como lidas" para limpar todas de uma vez

### Remover Notificações
- Clique no ícone de lixeira ao lado da notificação para removê-la permanentemente
- Notificações antigas são automaticamente limpas após 30 dias

### Filtros e Organização
As notificações são organizadas por:
- **Mais recentes primeiro**
- **Status de leitura** (não lidas aparecem destacadas)
- **Tipo de notificação** (identificado por cores e ícones)

## Sistema Automático de Lembretes

### Funcionamento
O sistema executa verificações automáticas a cada 30 minutos para:
- Identificar reuniões que precisam de lembretes
- Enviar notificações no momento adequado
- Verificar conflitos de agenda
- Processar limpeza de notificações antigas

### Horários de Lembretes
- **24 horas antes**: Lembrete principal por email e notificação no sistema
- **2 horas antes**: Lembrete final apenas no sistema
- **Verificação de conflitos**: A cada 2 horas

## Detecção de Conflitos

### Como Funciona
O sistema verifica automaticamente:
- Sobreposição de horários para o mesmo vendedor
- Conflitos ao criar ou editar reuniões
- Verificações periódicas de toda a agenda

### Resolução de Conflitos
Quando um conflito é detectado:
1. Vendedor é notificado imediatamente
2. Administradores recebem alerta se o conflito for crítico
3. Sistema oferece sugestões de horários alternativos
4. Reunião em conflito não é salva até resolução

## Jobs Automáticos do Sistema

### Jobs de Notificação (a cada 30 minutos)
- Verificação de lembretes de 24h e 2h
- Envio de notificações de lembrete
- Verificação de conflitos de agenda

### Jobs de Limpeza (diário às 02:00)
- Remoção de notificações antigas (mais de 30 dias)
- Geração de relatórios diários para administradores
- Limpeza de dados temporários

### Jobs de Verificação (a cada 2 horas)
- Verificação completa de conflitos
- Validação de integridade de dados
- Monitoramento de alta demanda

## Solução de Problemas

### Não Recebo Notificações
1. Verifique suas preferências de notificação
2. Confirme se as notificações estão ativadas para seu tipo de usuário
3. Verifique se há conflitos de configuração

### Notificações Duplicadas
- Pode ocorrer durante atualizações do sistema
- Entre em contato com o administrador se persistir

### Conflitos Não Detectados
1. Verifique se os dados da reunião estão corretos
2. Confirme se o vendedor foi selecionado adequadamente
3. Aguarde até 2 horas para verificação automática

### Performance do Sistema
- O sistema é otimizado para processar milhares de notificações
- Notificações são processadas em background
- Polling de 30 segundos mantém dados atualizados

## Recursos Técnicos

### Segurança
- Row Level Security (RLS) garante que usuários vejam apenas suas notificações
- Validação de permissões em todas as operações
- Logs de auditoria para todas as ações

### Performance
- Índices otimizados para consultas rápidas
- Cache de preferências de usuário
- Processamento assíncrono de notificações

### Integração
- API REST completa para integrações
- Webhooks para sistemas externos
- Suporte a notificações por email via Resend

## API para Desenvolvedores

### Endpoints Principais
- `GET /api/notificacoes` - Listar notificações do usuário
- `POST /api/notificacoes` - Criar nova notificação
- `PATCH /api/notificacoes/[id]` - Marcar como lida
- `GET /api/notificacoes/preferencias` - Obter preferências

### Jobs Automáticos
- `POST /api/notifications/cron?job=lembretes` - Executar lembretes
- `POST /api/notifications/cron?job=conflitos` - Verificar conflitos
- `POST /api/notifications/cron?job=limpeza` - Executar limpeza

### Webhooks
O sistema suporta webhooks para notificar sistemas externos sobre:
- Novas reuniões criadas
- Conflitos detectados
- Alterações em reuniões

## Monitoramento e Métricas

### Logs do Sistema
- Todas as notificações são logadas para auditoria
- Status de entrega (enviado, falhado, pendente)
- Estatísticas de engajamento dos usuários

### Métricas Disponíveis
- Taxa de entrega de notificações
- Tempo de resposta do sistema
- Usuários ativos por período
- Conflitos resolvidos vs. pendentes

## Suporte

Para questões técnicas ou problemas com o sistema de notificações:
1. Verifique este manual primeiro
2. Consulte os logs do sistema se for administrador
3. Entre em contato com o suporte técnico
4. Reporte bugs através do sistema de tickets

---

**Versão do Manual**: 1.0  
**Última Atualização**: Agosto 2025  
**Sistema**: Gestão de Contratos - Módulo de Notificações