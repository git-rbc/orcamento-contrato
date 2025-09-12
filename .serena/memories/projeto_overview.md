# Sistema de Gestão de Contratos - Indaiá Eventos

## Propósito do Projeto
Sistema web moderno para gestão de contratos e orçamentos da Indaiá Eventos, substituindo planilhas Excel complexas por um sistema web robusto e profissional.

## Tech Stack
- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI, Lucide Icons, shadcn/ui
- **Backend:** Supabase (Auth, Database, Storage, RLS)
- **Deploy:** Vercel
- **Validação:** Zod, React Hook Form
- **Database:** PostgreSQL com triggers e funções automatizadas

## Estrutura Principal
```
src/
├── app/                     # App Router (Next.js 15)
│   ├── (auth)/             # Grupo de rotas de autenticação
│   ├── api/                # API Routes
│   ├── dashboard/          # Área administrativa
│   │   ├── admin/
│   │   ├── agendamento/    # Sistema de agendamento
│   │   ├── calendario/
│   │   ├── clientes/
│   │   ├── contratos/
│   │   └── ...
├── components/             # Componentes React
├── contexts/               # Contextos React
├── lib/                    # Utilitários e configurações
├── services/               # Camada de serviços
├── types/                  # Definições TypeScript
└── hooks/                  # Hooks customizados
```

## Banco de Dados
- **Tabelas:** users, clientes, servicos, contratos, contrato_servicos, contrato_historico
- **24 índices** de performance
- **Políticas RLS** granulares para segurança
- **8 funções SQL** personalizadas
- **12 triggers automáticos** para auditoria e cálculos