import type { ReactNode } from 'react';

const STATUS_VARIANTS = {
  ativo: 'success',
  atendido: 'success',
  entregue: 'success',
  particular: 'success',
  confirmado: 'info',
  convenio: 'info',
  'convênio': 'info',
  'em produção': 'info',
  encaixe: 'warning',
  falta: 'warning',
  'aguardando laboratório': 'warning',
  'aguardando pagamento': 'danger',
  clinico: 'danger',
  'clínico': 'danger',
  cancelado: 'danger',
  administrativo: 'warning',
  inativo: 'neutral',
  'pronto para retirada': 'ready'
} as const;

type StatusVariantKey = keyof typeof STATUS_VARIANTS;

type StatusBadgeProps = {
  status?: ReactNode;
  label?: ReactNode;
  className?: string;
};

export const StatusBadge = ({ status, label, className = '' }: StatusBadgeProps) => {
  const normalizedStatus = String(status || '').trim().toLocaleLowerCase('pt-BR') as StatusVariantKey;
  const variant = STATUS_VARIANTS[normalizedStatus] || 'neutral';

  return (
    <span className={`status-badge status-${variant} ${className}`.trim()}>
      {label || status}
    </span>
  );
};
