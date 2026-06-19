import { Inbox, LoaderCircle, SearchX, TriangleAlert } from 'lucide-react';

const STATE_DEFAULTS = {
  empty: {
    icon: Inbox,
    title: 'Nada por aqui ainda',
    description: 'Os registros aparecerão aqui quando estiverem disponíveis.'
  },
  search: {
    icon: SearchX,
    title: 'Nenhum resultado encontrado',
    description: 'Revise os filtros ou tente uma busca diferente.'
  },
  loading: {
    icon: LoaderCircle,
    title: 'Carregando informações',
    description: 'Isso deve levar apenas alguns instantes.'
  },
  error: {
    icon: TriangleAlert,
    title: 'Não foi possível carregar',
    description: 'Tente novamente. Se o problema continuar, verifique a conexão.'
  }
};

export const StatePanel = ({
  type = 'empty',
  title,
  description,
  action,
  compact = false,
  className = ''
}) => {
  const config = STATE_DEFAULTS[type] || STATE_DEFAULTS.empty;
  const Icon = config.icon;
  const isLoading = type === 'loading';

  return (
    <div
      className={`state-panel state-${type} ${compact ? 'state-compact' : ''} ${className}`.trim()}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' || isLoading ? 'polite' : undefined}
    >
      <span className="state-panel-icon" aria-hidden="true">
        <Icon size={compact ? 18 : 22} className={isLoading ? 'state-spinner' : ''} />
      </span>
      <div className="state-panel-copy">
        <strong>{title || config.title}</strong>
        {(description || config.description) && <p>{description || config.description}</p>}
      </div>
      {action && <div className="state-panel-action">{action}</div>}
    </div>
  );
};
