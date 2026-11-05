'use client'

// components/common/FilterBar.tsx
import { cn } from '@/lib/utils'

interface FilterOption {
  id: string
  label: string
  count?: number
}

interface FilterBarProps {
  options: FilterOption[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function FilterBar({
  options,
  activeId,
  onChange,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = activeId === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150',
              isActive
                ? 'bg-brand-600 text-white'
                : 'bg-white text-text-secondary border border-border hover:bg-surface',
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-surface text-text-muted',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

