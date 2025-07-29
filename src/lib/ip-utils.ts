import { NextRequest } from 'next/server';

/**
 * Captura o IP real do usuário considerando proxies e CDNs
 * Funciona tanto em desenvolvimento quanto em produção
 */
export function getClientIP(request: NextRequest): string {
  // Lista de headers comuns que contêm o IP real do cliente
  const ipHeaders = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx
    'x-forwarded-for', // Proxy padrão
    'x-client-ip', // Apache
    'x-forwarded', // Outros proxies
    'forwarded-for',
    'forwarded',
  ];

  // Verifica cada header em ordem de prioridade
  for (const header of ipHeaders) {
    const ip = request.headers.get(header);
    if (ip) {
      // Se for uma lista de IPs separados por vírgula, pega o primeiro
      const cleanIP = ip.split(',')[0].trim();
      if (isValidIP(cleanIP)) {
        return cleanIP;
      }
    }
  }

  // Se não encontrou nos headers, usa o IP da conexão
  const remoteAddr = request.headers.get('x-forwarded-for') || 
                    request.headers.get('remote-addr');

  if (remoteAddr) {
    const cleanIP = remoteAddr.split(',')[0].trim();
    if (isValidIP(cleanIP)) {
      return cleanIP;
    }
  }

  // Fallback para desenvolvimento local
  return '127.0.0.1';
}

/**
 * Valida se o IP está em formato válido (IPv4 ou IPv6)
 */
function isValidIP(ip: string): boolean {
  // Validação básica para IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // Validação básica para IPv6
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === 'localhost';
}

/**
 * Captura informações detalhadas do cliente
 */
export function getClientInfo(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const timestamp = new Date().toISOString();

  return {
    ip,
    userAgent,
    timestamp,
    headers: {
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'user-agent': userAgent,
    }
  };
}

/**
 * Formata o IP para exibição
 */
export function formatIPForDisplay(ip: string): string {
  if (ip === '127.0.0.1' || ip === '::1') {
    return 'localhost';
  }
  return ip;
}