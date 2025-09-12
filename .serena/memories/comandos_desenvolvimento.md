# Comandos de Desenvolvimento

## Scripts Disponíveis
```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção  
npm run start    # Servidor de produção
npm run lint     # Verificação de código
```

## Scripts Especiais
```bash
npm run deploy:check    # Verificação antes do deploy
npm run deploy:prod     # Deploy de produção no Vercel
```

## Comandos Windows
- `ls` - listar arquivos
- `git` - controle de versão
- `cd` - navegação entre diretórios

## Comandos Pós-Tarefa
Sempre executar após modificações:
1. `npm run lint` - verificar código
2. `npm run build` - testar build
3. Testar funcionalidade no navegador em http://localhost:3000

## Configuração Local
1. `npm install` - instalar dependências
2. Configurar `.env.local` com credenciais Supabase
3. `npm run dev` - iniciar desenvolvimento