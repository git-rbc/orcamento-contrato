-- Migração para adicionar campo token_publico na tabela propostas
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna token_publico se não existir
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS token_publico TEXT UNIQUE;

-- 2. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_propostas_token_publico ON propostas(token_publico);

-- 3. Atualizar propostas existentes que não têm token
-- (Opcional - apenas se houver propostas existentes sem token)
DO $$
DECLARE 
    proposta RECORD;
    novo_token TEXT;
    token_existe BOOLEAN;
BEGIN
    FOR proposta IN SELECT id FROM propostas WHERE token_publico IS NULL
    LOOP
        -- Gerar token único para cada proposta
        REPEAT
            novo_token := UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
            
            SELECT EXISTS(SELECT 1 FROM propostas WHERE token_publico = novo_token) INTO token_existe;
        UNTIL NOT token_existe END REPEAT;
        
        -- Atualizar proposta com o novo token
        UPDATE propostas 
        SET token_publico = novo_token 
        WHERE id = proposta.id;
        
        RAISE NOTICE 'Token % criado para proposta %', novo_token, proposta.id;
    END LOOP;
END $$;

-- 4. Verificar se tudo está correto
SELECT 
    COUNT(*) as total_propostas,
    COUNT(token_publico) as propostas_com_token,
    COUNT(*) - COUNT(token_publico) as propostas_sem_token
FROM propostas;

-- 5. Mostrar alguns exemplos
SELECT id, token_publico, status, created_at 
FROM propostas 
ORDER BY created_at DESC 
LIMIT 5;