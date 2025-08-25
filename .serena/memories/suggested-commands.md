# Comandos Sugeridos - Sistema de Gestão de Contratos

## Comandos de Desenvolvimento
```bash
npm run dev      # Servidor de desenvolvimento (porta 3000)
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificação de código com ESLint
```

## Comandos de Deploy
```bash
npm run deploy:check  # Verificar se está pronto para deploy
npm run deploy:prod   # Deploy para produção na Vercel
```

## Comandos de Sistema (Windows)
```cmd
dir              # Listar arquivos e pastas (equivalente ao ls no Unix)
cd               # Navegar entre diretórios
findstr          # Buscar texto em arquivos (equivalente ao grep no Unix)
type             # Visualizar conteúdo de arquivos (equivalente ao cat no Unix)
```

## Comandos Git
```bash
git status       # Status do repositório
git add .        # Adicionar alterações
git commit -m    # Commit das alterações
git push         # Enviar para repositório remoto
```

## Comandos de Banco (Supabase)
- Migrações são executadas via interface web do Supabase
- RLS policies configuradas via SQL Editor
- Triggers e funções criadas diretamente no PostgreSQL