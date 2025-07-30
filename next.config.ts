import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Otimizações para produção
  poweredByHeader: false,
  compress: true,
  
  // Configurações de cache agressivas para desenvolvimento
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 minuto
    pagesBufferLength: 2,
  },
  
  // Configurações de webpack para resolver problemas de chunk loading
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Configurações otimizadas para desenvolvimento
      config.watchOptions = {
        poll: false, // Desabilita polling para reduzir CPU
        aggregateTimeout: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      }
      
      // Reduzir workers
      config.parallelism = 1;
      
      // Desabilitar otimizações pesadas em desenvolvimento
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
        minimize: false,
      }
      
      // Deixar Next.js gerenciar devtool automaticamente
    }
    
    // Remover aliases que podem causar problemas de resolução
    
    return config
  },
  
  // Configurações de imagem para Vercel (usando nova configuração)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'euuihpkgzhthbvftkkho.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'contrato-orcamento.eventosindaia.com.br',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Turbopack para compilação mais rápida
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Experimental features para melhor performance
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@supabase/supabase-js', 
      '@radix-ui/react-dialog', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@tanstack/react-query'
    ],
  },
  
  // Configurações de headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
  
  // Redirects para garantir HTTPS em produção
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'sb-euuihpkgzhthbvftkkho-auth-token',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
