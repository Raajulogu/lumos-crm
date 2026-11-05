'use client'

// components/ui/Tabs.tsx
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-0 border-b border-border overflow-x-auto scrollbar-hide',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap',
            'border-b-2 -mb-px transition-colors duration-150',
            activeTab === tab.id
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-strong',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-xs font-semibold',
                activeTab === tab.id
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-surface text-text-muted',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

