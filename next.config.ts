import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações para produção
  poweredByHeader: false,
  compress: true,
  
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
  
  // Experimental features para melhor performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
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
