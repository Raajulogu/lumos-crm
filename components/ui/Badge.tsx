// components/ui/Badge.tsx
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'cyan'
  | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface text-text-secondary border border-border',
  blue:    'bg-brand-100 text-brand-700',
  green:   'bg-success-light text-success-dark',
  amber:   'bg-warning-light text-warning-dark',
  red:     'bg-danger-light text-danger-dark',
  purple:  'bg-purple-light text-purple-dark',
  cyan:    'bg-info-light text-info-dark',
  gray:    'bg-slate-100 text-slate-600',
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-0.5 text-xs',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            variant === 'green' && 'bg-success-dark',
            variant === 'amber' && 'bg-warning-dark',
            variant === 'red'   && 'bg-danger-dark',
            variant === 'blue'  && 'bg-brand-600',
            variant === 'purple' && 'bg-purple-dark',
            variant === 'cyan'  && 'bg-info-dark',
            (variant === 'default' || variant === 'gray') && 'bg-text-muted',
          )}
        />
      )}
      {children}
    </span>
  )
}

