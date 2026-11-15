import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => {
  return (
    <div
      className={`animate-pulse bg-[#303030]/80 ${rounded} ${className}`}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-[#262626] rounded-2xl border border-[#414141] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-16" rounded="rounded-lg" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[#414141] bg-[#262626]/50 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#263e2d] border border-[#3d6545] text-[#8DBB91] flex items-center justify-center mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[#ECECEC] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#A3A3A3] max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

export const Alert = ({
  type = 'info',
  title,
  message,
  children,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-sky-950/40',
      border: 'border-sky-800/60',
      text: 'text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/60',
      text: 'text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    error: {
      bg: 'bg-red-950/40',
      border: 'border-red-800/60',
      text: 'text-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/60',
      text: 'text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
  };

  const current = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${current.bg} ${current.border} ${className}`}
      role="alert"
    >
      {current.icon}
      <div className="flex-1 text-sm leading-relaxed">
        {title && <h4 className={`font-semibold mb-0.5 ${current.text}`}>{title}</h4>}
        <div className={current.text}>{children || message}</div>
      </div>
    </div>
  );
};

