# Visão Geral do Projeto - Sistema de Gestão de Contratos

## Propósito
Sistema web moderno para gestão de contratos e orçamentos da Indaiá Eventos, desenvolvido para substituir planilhas Excel complexas por um sistema web robusto e profissional.

## Stack Tecnológica
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI, Lucide Icons, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, RLS)
- **Database**: PostgreSQL com triggers e funções automatizadas
- **Deploy**: Vercel
- **Validação**: Zod, React Hook Form

## Funcionalidades Principais
- Sistema de autenticação com roles (Admin/Vendedor)
- Gestão de clientes (PF/PJ) com validação CPF/CNPJ
- Gestão de produtos e serviços
- Gestão de espaços de eventos
- Sistema de calendário e reservas
- Criação de contratos e propostas
- Sistema administrativo completo
- Dashboard com estatísticas

## Estrutura de Permissões
- **Admin**: Acesso completo ao sistema
- **Vendedor**: Acesso limitado conforme permissões definidas
- RLS (Row Level Security) implementado no Supabase