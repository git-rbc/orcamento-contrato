# 📧 Sistema de Propostas Públicas - Eventos Indaiatuba

## 🎯 Funcionalidade Implementada

O sistema agora possui um **workflow completo** para envio de propostas via email com **aprovação/rejeição online** pelo cliente.

## 🔄 Como Funciona

### 1. **Criação da Proposta**
- Ao criar uma proposta, o sistema gera automaticamente um **token público único** (8 caracteres)
- Este token permite acesso público à proposta sem necessidade de login

### 2. **Envio para o Cliente** 
- Quando a proposta é marcada como **"Enviada"**, o sistema:
  - ✅ Envia email automático para o cliente
  - ✅ Inclui link dinâmico para visualização
  - ✅ Template profissional com logo da empresa
  - ✅ Resumo visual da proposta

### 3. **Visualização Pública**
- Cliente acessa via link: `https://seusite.com/proposta/ABC12345`
- **Página responsiva** com visual idêntico ao modal interno
- **Todas as seções**: Alimentação, Bebidas, Serviços, Extras, Rolhas
- **Cálculos automáticos** de subtotais e total geral

### 4. **Aprovação/Rejeição**
- Cliente pode **aprovar** ou **recusar** diretamente na página
- ✅ **Aprovada**: Status muda para `aceita`
- ❌ **Recusada**: Status muda para `recusada`
- **Feedback visual** imediato
- **Uma vez respondida**, não pode ser alterada novamente

## 🛡️ Segurança e Validações

- **Tokens únicos** gerados com timestamp + random
- **Acesso apenas a propostas enviadas** (não rascunhos)
- **Validação de status** antes de permitir resposta
- **Logs de auditoria** das respostas dos clientes

## 📱 Template de Email

### Características:
- **Design responsivo** para mobile/desktop
- **Header com logo** da empresa
- **Resumo visual** com gradiente atrativo
- **Botão CTA destacado** para acessar proposta
- **Instruções claras** sobre como proceder
- **Footer profissional** com contatos

### Dados Incluídos:
- Data do evento
- Local do evento  
- Número de convidados
- Valor total da proposta
- Link direto para visualização

## 🔗 URLs e Rotas

### Públicas (sem autenticação):
- **Visualizar proposta**: `/proposta/[token]`
- **API pública**: `/api/proposta/publica/[token]`
- **API resposta**: `/api/proposta/publica/[token]/resposta`

### Internas (com autenticação):
- **Gerenciar propostas**: `/dashboard/propostas`
- **APIs administrativas**: `/api/propostas/*`

## ⚙️ Configuração Necessária

### Variáveis de Ambiente:
```env
# API Resend para emails
RESEND_API_KEY=re_6oShV3fo_BTidTgNk3DrpbDCK6Zcic5Gg

# URL base da aplicação (para links nos emails)
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
```

### Banco de Dados:
```sql
-- Adicionar coluna token_publico na tabela propostas
ALTER TABLE propostas ADD COLUMN token_publico TEXT UNIQUE;
```

## 🎨 Assets Necessários

- **Logo da empresa**: `/public/logos/LOGO BRANCA FUNDO TRANSP.png`
- Recomendado: PNG transparente, resolução mínima 400px de largura

## 📊 Estados das Propostas

1. **`rascunho`** → Pode editar/excluir
2. **`enviada`** → Email enviado, aguardando resposta do cliente
3. **`aceita`** → Cliente aprovou, pode converter para contrato
4. **`recusada`** → Cliente recusou, pode voltar para rascunho
5. **`convertida`** → Virou contrato, não pode mais alterar

## 🚀 Fluxo Completo de Uso

1. **Admin cria** proposta no dashboard
2. **Admin envia** proposta (muda status para "enviada")
3. **Sistema envia email** automaticamente para o cliente
4. **Cliente recebe email** com link personalizado
5. **Cliente visualiza** proposta completa na página pública
6. **Cliente aprova/rejeita** com um clique
7. **Sistema atualiza** status automaticamente
8. **Admin vê resposta** no dashboard e pode prosseguir

## ✨ Benefícios

- **Experiência profissional** para o cliente
- **Processo automatizado** de aprovação
- **Visual consistente** entre interno e externo  
- **Redução de atrito** no processo comercial
- **Rastreabilidade completa** das interações
- **Eliminação de PDFs** e anexos de email

---

**Status**: ✅ **Implementação Completa e Funcional**