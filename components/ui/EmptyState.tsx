// components/ui/EmptyState.tsx
import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateActionObject {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateActionObject | React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 text-text-muted opacity-50">{icon}</div>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === 'object' && 'label' in (action as EmptyStateActionObject) ? (
            <Button onClick={(action as EmptyStateActionObject).onClick} variant="primary">
              {(action as EmptyStateActionObject).label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
