#!/usr/bin/env node

/**
 * Script de verificação pré-deployment
 * Verifica se todas as configurações estão corretas antes do deploy
 */

const fs = require('fs');
const path = require('path');

const PRODUCTION_URL = 'https://contrato-orcamento.eventosindaia.com.br';
const SUPABASE_URL = 'https://euuihpkgzhthbvftkkho.supabase.co';

console.log('🚀 Verificando configurações para deployment...\n');

// Verificar se arquivos essenciais existem
const essentialFiles = [
  'next.config.ts',
  'vercel.json',
  'package.json',
  'tsconfig.json',
  '.env.local'
];

console.log('📁 Verificando arquivos essenciais:');
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - ARQUIVO FALTANDO!`);
  }
});

// Verificar variáveis de ambiente
console.log('\n🔐 Verificando variáveis de ambiente:');
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName}`);
    } else {
      console.log(`❌ ${varName} - VARIÁVEL FALTANDO!`);
    }
  });
} else {
  console.log('❌ Arquivo .env.local não encontrado!');
}

// Verificar next.config.ts
console.log('\n⚙️  Verificando configurações do Next.js:');
if (fs.existsSync('next.config.ts')) {
  const configContent = fs.readFileSync('next.config.ts', 'utf8');
  
  if (configContent.includes('contrato-orcamento.eventosindaia.com.br')) {
    console.log('✅ URL de produção configurada no next.config.ts');
  } else {
    console.log('⚠️  URL de produção não encontrada no next.config.ts');
  }
  
  if (configContent.includes('Strict-Transport-Security')) {
    console.log('✅ Headers de segurança configurados');
  } else {
    console.log('⚠️  Headers de segurança não configurados');
  }
} else {
  console.log('❌ next.config.ts não encontrado!');
}

// Verificar vercel.json
console.log('\n🌐 Verificando configurações do Vercel:');
if (fs.existsSync('vercel.json')) {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.functions) {
    console.log('✅ Configurações de functions definidas');
  }
  
  if (vercelConfig.headers) {
    console.log('✅ Headers de segurança configurados');
  }
  
  if (vercelConfig.regions) {
    console.log(`✅ Região configurada: ${vercelConfig.regions.join(', ')}`);
  }
} else {
  console.log('❌ vercel.json não encontrado!');
}

// Verificar se o build funciona
console.log('\n🔨 Testando build...');
const { execSync } = require('child_process');

try {
  console.log('📦 Executando npm run build...');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build executado com sucesso!');
} catch (error) {
  console.log('❌ Erro no build:');
  console.log(error.stdout?.toString());
  console.log(error.stderr?.toString());
}

console.log('\n📋 Checklist de Deploy:');
console.log('1. ✅ Fazer push para branch main');
console.log('2. ⏳ Aguardar deploy automático no Vercel');
console.log('3. 🔧 Configurar Site URL no Supabase:');
console.log(`   ${PRODUCTION_URL}`);
console.log('4. 🔧 Adicionar Redirect URLs no Supabase:');
console.log(`   ${PRODUCTION_URL}/dashboard`);
console.log(`   ${PRODUCTION_URL}/login`);
console.log('5. 🧪 Testar login/cadastro na URL de produção');

console.log('\n🎯 URL de Produção:');
console.log(`${PRODUCTION_URL}`);

console.log('\n📊 Monitoramento:');
console.log('- Vercel Dashboard: https://vercel.com/dashboard');
console.log('- Supabase Dashboard: https://supabase.com/dashboard');

console.log('\n✨ Deploy finalizado! Boa sorte! 🚀'); 