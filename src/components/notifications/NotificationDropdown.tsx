'use client';

import { useState } from 'react';
import { 
  CheckCheck, 
  X, 
  Clock, 
  AlertCircle, 
  Calendar,
  Users,
  Settings,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationDropdownProps {
  onClose: () => void;
}

interface NotificationItemProps {
  notificacao: any;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notificacao, onMarkRead, onDelete }: NotificationItemProps) {
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'reuniao_agendada':
      case 'nova_reuniao':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'conflito_agenda':
      case 'conflito_critico':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'lembrete_reuniao':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'conflito_agenda':
      case 'conflito_critico':
        return 'destructive';
      case 'lembrete_reuniao':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notificacao.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });

  return (
    <div className={`p-3 border-b border-border hover:bg-muted/50 transition-colors ${
      !notificacao.lida ? 'bg-blue-50/50' : ''
    }`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon(notificacao.tipo)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                !notificacao.lida ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {notificacao.titulo}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notificacao.mensagem}
              </p>
              
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={getBadgeVariant(notificacao.tipo)} className="text-xs">
                  {notificacao.tipo.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {timeAgo}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              {!notificacao.lida && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onMarkRead(notificacao.id)}
                  title="Marcar como lida"
                >
                  <CheckCheck className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notificacao.id)}
                title="Remover notificação"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [showPreferences, setShowPreferences] = useState(false);
  const {
    notificacoes,
    countNaoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    carregarNotificacoes
  } = useInAppNotifications();

  const handleMarkRead = async (id: string) => {
    await marcarComoLida(id);
  };

  const handleDelete = async (id: string) => {
    await deletarNotificacao(id);
  };

  const handleMarkAllRead = async () => {
    await marcarTodasComoLidas();
  };

  if (showPreferences) {
    return (
      <div className="w-80">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Preferências de Notificação</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreferences(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-3">
          <p className="text-sm text-muted-foreground">
            Configurações de notificação em desenvolvimento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium">Notificações</h3>
            {countNaoLidas > 0 && (
              <Badge variant="destructive" className="text-xs">
                {countNaoLidas}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreferences(true)}
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {countNaoLidas > 0 && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs h-7"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="p-6 text-center">
            <div className="h-8 w-8 text-muted-foreground mx-auto mb-2">📔</div>
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação encontrada
            </p>
          </div>
        ) : (
          <div className="h-96 overflow-y-auto">
            {notificacoes.map((notificacao) => (
              <NotificationItem
                key={notificacao.id}
                notificacao={notificacao}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notificacoes.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                // TODO: Navegar para página completa de notificações
                onClose();
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        </>
      )}
    </div>
  );
}