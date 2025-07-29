# Sistema de Gestão de Contratos - Indaiá Eventos

Sistema web moderno para gestão de contratos e orçamentos da Indaiá Eventos, desenvolvido com Next.js 15, TypeScript, Tailwind CSS e Supabase. Substituindo planilhas Excel complexas por um sistema web robusto e profissional.

## 🚀 Tecnologias

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI, Lucide Icons, shadcn/ui
- **Backend:** Supabase (Auth, Database, Storage, RLS)
- **Deploy:** Vercel
- **Validação:** Zod, React Hook Form
- **Database:** PostgreSQL com triggers e funções automatizadas

## ✨ Status do Desenvolvimento

### ✅ Fase 1 - Infraestrutura (Concluída)
- **Sistema de autenticação completo** com Supabase
- **Banco de dados robusto** com 6 tabelas principais
- **24 índices de performance** para otimização
- **Políticas RLS** granulares para segurança
- **8 funções SQL** personalizadas
- **12 triggers automáticos** para auditoria e cálculos
- **Geração automática** de números de contrato

### ✅ Fase 2 - CRUD Básico (Concluída)
- **APIs RESTful completas** para clientes e serviços
- **Interface moderna** com sidebar responsivo
- **Gestão de clientes** com validação CPF/CNPJ
- **Gestão de serviços** com categorias e valores
- **DataTable avançada** com paginação e filtros
- **Dashboard administrativo** com estatísticas
- **Soft delete** e proteções de integridade
- **Sistema de primeiro login** para admin
- **Controle de acesso** por roles

### 🚧 Fase 3 - Sistema de Contratos (Próxima)
- Criação e edição de contratos
- Workflow de aprovação
- Geração de PDF
- Sistema de assinatura eletrônica

### 📊 Fase 4 - Relatórios e Analytics (Planejada)
- Dashboard avançado com métricas
- Relatórios customizáveis
- Exportação de dados
- Gráficos e análises

## 📋 Funcionalidades Implementadas

### 🔐 Autenticação e Autorização
- ✅ Login com validação de senha forte
- ✅ Perfis de usuário (Admin/Vendedor)
- ✅ Proteção de rotas por permissão
- ✅ Context de autenticação global
- ✅ Sistema de primeiro login para admin
- ✅ Controle de criação de usuários (apenas admin)
- ⚠️ **Cadastro público desabilitado** - apenas admins criam usuários

### 👥 Gestão de Clientes
- ✅ CRUD completo de clientes
- ✅ Validação CPF/CNPJ brasileiros
- ✅ Diferenciação Pessoa Física/Jurídica
- ✅ Busca e filtros avançados
- ✅ Paginação otimizada
- ✅ Soft delete com proteção de relacionamentos

### 🛍️ Gestão de Serviços
- ✅ CRUD completo de serviços
- ✅ Sistema de categorias
- ✅ Valores monetários formatados
- ✅ Unidades de medida configuráveis
- ✅ Duplicação inteligente de serviços
- ✅ Estatísticas em tempo real

### 🎨 Interface e UX
- ✅ Sidebar moderno e responsivo
- ✅ Tema claro/escuro
- ✅ Componentes reutilizáveis
- ✅ Animações suaves
- ✅ Feedback visual consistente
- ✅ DataTable com ordenação e busca

### 📊 Dashboard e Relatórios
- ✅ Cards informativos por módulo
- ✅ Estatísticas em tempo real
- ✅ Status do sistema
- ✅ Informações do usuário logado
- ✅ Progresso do desenvolvimento

## 🏗️ Estrutura do Banco de Dados

### Tabelas Principais
- **`users`** - Perfis e autenticação de usuários
- **`clientes`** - Dados completos dos clientes
- **`servicos`** - Catálogo de serviços e valores
- **`contratos`** - Core business com workflow
- **`contrato_servicos`** - Relacionamento many-to-many
- **`contrato_historico`** - Auditoria completa

### Funcionalidades Avançadas
- **Triggers automáticos** para cálculos de valores
- **Funções SQL** para geração de números únicos
- **Índices otimizados** para performance
- **RLS (Row Level Security)** para proteção de dados

## 🛠️ Configuração Local

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/git-rbc/orcamento-contrato.git
cd gestaocontratosapp
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Configure suas credenciais do Supabase no `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_publica
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

5. Execute as migrações do banco:
```sql
-- Acesse o SQL Editor do Supabase e execute os scripts de criação das tabelas
-- (Consulte a documentação de banco de dados)
```

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação.

## 🔑 Primeiro Acesso

### Configuração do Administrador

1. **Usuário Admin Pré-configurado:**
   - Email: `gabrielpiffer@gmail.com`
   - Status: Primeiro login (senha deve ser definida)

2. **Processo de Primeiro Login:**
   - Acesse a página de login
   - Digite o email do admin
   - Digite qualquer senha (será detectado como primeiro login)
   - Defina uma senha segura na tela especial
   - Login automático após configuração

3. **Criação de Novos Usuários:**
   - Apenas o administrador pode criar novos usuários
   - Cadastro público está desabilitado
   - Futura implementação: interface admin para gestão de usuários

## 🏗️ Estrutura do Projeto

```
src/
├── app/                     # App Router (Next.js 15)
│   ├── (auth)/             # Grupo de rotas de autenticação
│   │   ├── login/          # Página de login
│   │   ├── cadastro/       # Página de cadastro
│   │   └── layout.tsx      # Layout de autenticação
│   ├── api/                # API Routes
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── clientes/
│   │   ├── empresas/
│   │   ├── endereco/
│   │   ├── espacos-eventos/
│   │   ├── feriados/
│   │   ├── menus/
│   │   ├── produtos/
│   │   ├── servicos/
│   │   └── tipos-decoracao/
│   ├── dashboard/          # Área administrativa
│   │   ├── admin/
│   │   ├── clientes/
│   │   ├── contratos/
│   │   ├── espacos-eventos/
│   │   ├── produtos/
│   │   ├── propostas/
│   │   ├── servicos/
│   │   └── tipos-decoracao/
│   ├── debug/
│   ├── globals.css         # Estilos globais
│   └── layout.tsx          # Layout raiz
├── components/             # Componentes React
│   ├── ui/                 # Componentes base (shadcn/ui)
│   ├── clientes/
│   ├── contratos/
│   ├── espacos-eventos/
│   ├── layout/
│   ├── produtos/
│   ├── propostas/
│   └── providers/
├── contexts/               # Contextos React
│   └── auth-context.tsx    # Contexto de autenticação
├── lib/                    # Utilitários e configurações
│   ├── api-utils.ts        # Utilitários para APIs
│   ├── cache.ts
│   ├── constants.ts
│   ├── performance-monitor.ts
│   ├── supabase.ts         # Cliente Supabase
│   ├── supabase-server.ts  # Supabase server-side
│   └── utils.ts            # Utilidades gerais
├── services/               # Camada de serviços
│   ├── admin.ts
│   ├── audit.ts
│   ├── clientes.ts
│   ├── menus.ts
│   ├── permissions.ts
│   ├── roles.ts
│   └── servicos.ts
├── types/                  # Definições TypeScript
│   ├── auth.ts             # Tipos de autenticação
│   └── database.ts         # Tipos do banco de dados
└── hooks/                  # Hooks customizados
```

## 🔐 Configuração do Supabase

### Recursos Utilizados
- **Authentication:** Login/cadastro de usuários
- **Database:** PostgreSQL com RLS
- **Storage:** Upload de arquivos (futuro)
- **Edge Functions:** Processamento server-side (futuro)

### Políticas de Segurança (RLS)
- Usuários só acessam seus próprios dados
- Admins têm acesso completo
- Vendedores têm acesso limitado

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificação de código
```

## 📦 Deploy na Vercel

### Deploy Automático
1. Conecte seu repositório na [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente no dashboard
3. Deploy automático a cada push na main

### Variáveis de Ambiente Necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_publica
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

## 🧪 Testes e Qualidade

- **TypeScript:** Tipagem estática
- **ESLint:** Análise de código
- **Prettier:** Formatação consistente
- **Validação Zod:** Validação runtime

## 📈 Performance

### Otimizações Implementadas
- **Paginação server-side** para grandes datasets
- **Índices de banco** otimizados
- **Lazy loading** de componentes
- **Caching** de requisições
- **Debounce** em buscas

## 🛡️ Segurança

### Medidas Implementadas
- **Row Level Security (RLS)** no Supabase
- **Validação server-side** com Zod
- **Sanitização** de inputs
- **Proteção CSRF** automática
- **Headers de segurança** configurados


## 📧 Contato

**Desenvolvedor:** Emerson Oliveira  
**Email:** emersonfilho953@gmail.com  
**GitHub:** [@emersonloliver1](https://github.com/emersonloliver1)

## 📄 Licença

Este projeto é privado e propriedade da Indaiá Eventos.

---

**Status:** 🚀 Em desenvolvimento ativo  
**Última atualização:** Julho 2025