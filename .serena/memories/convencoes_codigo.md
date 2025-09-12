# Convenções de Código

## Estilo e Padrões
- **TypeScript** rigoroso com tipagem estática
- **Tailwind CSS** para estilos
- **Radix UI** e **shadcn/ui** para componentes base
- **React Hook Form** para formulários
- **Zod** para validação
- **ESLint** para análise de código

## Estrutura de Componentes
- Componentes base em `src/components/ui/`
- Componentes específicos organizados por domínio
- Context providers em `src/contexts/`
- Hooks customizados em `src/hooks/`

## Padrões de Nomenclatura
- Arquivos: kebab-case
- Componentes: PascalCase
- Funções: camelCase
- Constantes: UPPER_SNAKE_CASE

## Segurança
- **Row Level Security (RLS)** no Supabase
- **Validação server-side** com Zod
- **Sanitização** de inputs
- Nunca expor segredos ou chaves

## Arquitetura
- **App Router** do Next.js 15
- **Server Components** quando possível
- **Client Components** apenas quando necessário
- **API Routes** para endpoints customizados