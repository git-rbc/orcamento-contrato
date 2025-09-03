# Plano de Remodelagem — Supabase (Reuniões/Vendas)

Este documento define o plano por etapas para remodelar o banco de dados no Supabase (via MCP) e o menu de Reuniões, com base na análise da planilha "VENDAS - REUNIoES - SOCIAIS.xlsx". Não contém valores hardcoded.

## Objetivos
- [ ] Normalizar dados de clientes, leads, reuniões, eventos e usuários.
- [ ] Padronizar status de reunião e histórico de mudanças.
- [ ] Centralizar endereços/unidades e espaços/salas.
- [ ] Habilitar confirmações/notificações rastreáveis por canal.
- [ ] Implantar políticas RLS por papel/unidade.
- [ ] Redesenhar o menu de Reuniões com filtros e ações rápidas.
- [ ] Migrar dados legados a partir das abas relevantes da planilha.

## Inventário Baseado na Planilha
- [ ] Reuniões: metacampos e colunas operacionais (status, data, origem/campanha, confirmação).
- [ ] Reuniões Futuras: pipeline de agendamentos.
- [ ] Resumo: visão agregada (campos de cliente, confirmação, origem/campanha, horário).
- [ ] BD Cadastro: usuários (nome, cargo, status, telefone, setor, cidade origem, user_id, portfolio_id).
- [ ] BD Status Reunião: status por código, datas de agendamento/reunião e marcações.
- [ ] Confirmações: código, cliente, pré-vendedor, vendedor, unidade, horário, status, tipo evento, atendente, texto envio, sistema, local, flag "do dia".
- [ ] Data de Evento: código, data realização, status, local, pacote, tipo, cidade, data contratação, origem/campanha, início, resumo.
- [ ] Endereços: city, code, name, adress, latitude, longitude.
- [ ] Relação Espaços X Salas: unidade de negócio, qtde de salas.
- [ ] Pré/Pós/Feedback Reunião: formulários/lifecycle de reunião.
- [ ] Notificação Vendedores (quando aplicável): recados por atendente/telefone.

## Esquema Proposto (Tabelas)
- [ ] `units` (unidades de negócio)
  - id (pk)
  - name (unique)
  - city
  - active

- [ ] `locations` (endereços físicos)
  - id (pk)
  - unit_id (fk -> units)
  - code
  - name
  - address
  - latitude
  - longitude
  - unique(unit_id, code)

- [ ] `spaces` (espaços por unidade) e `rooms`
  - spaces: id (pk), unit_id (fk), name, active
  - rooms: id (pk), space_id (fk), name, capacity, active

- [ ] `users` (catálogo local vinculado ao auth)
  - id (pk) — referência ao auth.user_id
  - name
  - role (enum: pre_sales, sales, coordinator, manager, admin, attendant)
  - phone
  - sector (e.g., Sociais/Corporativo)
  - unit_id (fk)
  - status (active/inactive)
  - unique(phone) opcional

- [ ] `contacts`
  - id (pk)
  - name
  - phone
  - alt_phone
  - email
  - city
  - notes
  - unique(phone) opcional

- [ ] `leads`
  - id (pk)
  - contact_id (fk -> contacts)
  - origin (e.g., origem)
  - campaign
  - coupon
  - entered_at (timestamp)
  - source_system
  - unit_id (fk)

- [ ] `events`
  - id (pk)
  - lead_id (fk -> leads)
  - event_type (e.g., Casamento, Corporativo)
  - city
  - venue (local do evento)
  - start_time (time)
  - realization_date (date)
  - contracted_at (date)
  - package
  - external_notes

- [ ] `appointments` (reuniões)
  - id (pk)
  - code (unique)
  - lead_id (fk)
  - contact_id (fk)
  - unit_id (fk)
  - location_id (fk) opcional
  - pre_sales_user_id (fk -> users)
  - sales_user_id (fk -> users)
  - meeting_date (date)
  - meeting_time (time)
  - scheduled_at (timestamp)
  - event_type
  - summary

- [ ] `appointment_statuses` (lookup)
  - key (pk) — e.g., scheduled, confirmed, cancelled, no_show, rescheduled, pending
  - order_index
  - active

- [ ] `appointment_status_history`
  - id (pk)
  - appointment_id (fk)
  - status_key (fk -> appointment_statuses)
  - reason
  - created_at (timestamp)
  - created_by (fk -> users)

- [ ] `confirmations`
  - id (pk)
  - appointment_id (fk)
  - channel (e.g., whatsapp, sms, call)
  - message_template
  - attendant_user_id (fk -> users)
  - status (e.g., sent, delivered, responded, failed)
  - sent_at (timestamp)
  - response_at (timestamp)
  - response_text

- [ ] `notifications_to_sellers`
  - id (pk)
  - user_id (fk -> users)
  - message
  - phone
  - created_at (timestamp)
  - status

- [ ] `pre_meeting_forms`, `post_meeting_forms`, `feedback_forms`
  - id (pk)
  - appointment_id (fk)
  - filled_by (fk -> users)
  - payload (jsonb)
  - created_at (timestamp)

- [ ] `sales_pipeline` (opcional, se necessário mapear "BD Vendas")
  - id (pk)
  - lead_id (fk)
  - stage (enum)
  - amount
  - probability
  - updated_at

## Relacionamentos (Resumo)
- [ ] units 1—N locations/spaces/appointments/users/leads
- [ ] contacts 1—N leads
- [ ] leads 1—N events/appointments
- [ ] appointments 1—N status_history/confirmations/forms

## Políticas de Acesso (RLS)
- [ ] Ativar RLS em todas as tabelas.
- [ ] Vendedor: ver registros da própria unidade e/ou atribuídos (appointments.sales_user_id = auth.uid()).
- [ ] Pré-vendedor: ver leads/appointments atribuídos como pre_sales_user_id.
- [ ] Coordenador: ver registros da sua unidade.
- [ ] Admin: acesso total por papel/claim.
- [ ] Logs (history/confirmations): leitura conforme vínculo ao appointment.

## Índices e Desempenho
- [ ] Índice composto em `appointments (unit_id, meeting_date, status)`.
- [ ] Índice em `confirmations (appointment_id, sent_at)`.
- [ ] Índice em `appointment_status_history (appointment_id, created_at)`.
- [ ] Índice em `leads (unit_id, entered_at)`.
- [ ] Chaves únicas conforme indicado (code, phone se aplicável, etc.).

## Mapeamento de ETL (Planilha -> Tabelas)
- [ ] Resumo/Reuniões/Reuniões Futuras -> `appointments`, `appointment_status_history` (extrair code, unidade, data, hora, pre/sales, tipo evento, status, origem/campanha, resumo, confirmação).
- [ ] Confirmações -> `confirmations` (canal/sistema, atendente, mensagem, status, timestamps; relacionar por code/telefone/data).
- [ ] Data de Evento -> `events` (tipo, cidade, local, pacote, datas, origem/campanha).
- [ ] BD Cadastro -> `users` (nome, cargo/role, status, telefone, setor, unidade, user_id, portfolio_id).
- [ ] Endereços -> `locations` + `units` (unidade/cidade, geolocalização).
- [ ] Relação Espaços X Salas -> `spaces`/`rooms` (por unidade, criar N rooms por quantidade).
- [ ] Pré/Pós/Feedback Reunião -> `pre_meeting_forms` / `post_meeting_forms` / `feedback_forms` (carga em jsonb).
- [ ] Notificação Vendedores -> `notifications_to_sellers`.
- [ ] BD Status Reunião -> `appointment_status_history` (ajustar chaves e de-duplicar status).

## Passos MCP (Supabase)
- [ ] Definir enums (roles, appointment_statuses, pipeline_stages) e criar tabelas.
- [ ] Criar FKs e constraints.
- [ ] Criar índices e uniques.
- [ ] Escrever políticas RLS por tabela.
- [ ] Criar RPCs/Views úteis (agenda do dia, pendentes de confirmação, funil por unidade).
- [ ] Scripts de migração/ETL (import CSVs, upserts por código/telefone + unidade/data/hora).
- [ ] Jobs/Triggers opcionais (atualizar status atual do appointment a partir do history; manter campo `current_status`).

## Redesenho — Menu de Reuniões
- [ ] Visões: Hoje, Próximas, Sem Resposta, Confirmadas, Canceladas, Reagendadas.
- [ ] Filtros: Unidade, Espaço/Sala, Vendedor, Pré-vendedor, Tipo de Evento, Origem, Campanha, Intervalo de datas/horas, Status.
- [ ] Ações rápidas: Confirmar por canal, Reagendar, Cancelar (motivo), Check-in, Enviar lembrete.
- [ ] Colunas padrão: Código, Cliente, Unidade/Local, Pré-vendedor, Vendedor, Data/Hora, Tipo, Status atual, Origem/Campanha, Última confirmação.
- [ ] Detalhe da reunião: timeline de status, confirmações, formulários pré/pós/feedback, evento vinculado.
- [ ] Permissões no UI: escopo por papel/unidade.

## Fases e Cronograma
- [ ] Fase 1 — Modelagem e criação de schema (MCP/Supabase).
- [ ] Fase 2 — ETL inicial (importação planilha -> staging -> produção).
- [ ] Fase 3 — RLS/Policies e views.
- [ ] Fase 4 — Redesenho do menu de reuniões (front) + endpoints.
- [ ] Fase 5 — Automações (confirmações, lembretes, status atual via trigger).
- [ ] Fase 6 — Validação de dados e ajustes finos.

## Perguntas/Decisões em Aberto
- [ ] "Und. Negócio" é equivalente a unidade/cidade? Existe catálogo oficial de unidades?
- [ ] O campo `Código do Cliente`/`Cód` é chave externa única para relacionar registros entre abas?
- [ ] Lista canônica de `Status` de reunião e transições permitidas? (ex.: scheduled -> confirmed -> realized / cancelled / no_show)
- [ ] Canais de confirmação efetivos (WhatsApp, SMS, ligação) e integração pretendida?
- [ ] Atribuição obrigatória de pré-vendedor e vendedor para toda reunião? Alguma pode ter só um dos dois?
- [ ] "BD Vendas": qual o objetivo exato e chaves? (parece normalização de telefones/IDs)
- [ ] "Agenda (cidade)" devem virar views derivadas por unidade ao invés de tabelas?
- [ ] Regras de visibilidade por papel/unidade: exceções?

## Critérios de Aceite
- [ ] Schema criado no Supabase com constraints e RLS ativas.
- [ ] Import mínimo bem-sucedido com deduplicação por código/telefone.
- [ ] Views/RPCs entregam as listas do menu com performance adequada.
- [ ] Menu redesenhado com filtros e ações funcionais por papel.
- [ ] Histórico de status e confirmações completo por reunião.
