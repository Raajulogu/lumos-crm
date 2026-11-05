'use client'

// components/ui/Toggle.tsx
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-3 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) onChange(!checked)
          }
        }}
        className={cn(
          'relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          size === 'sm' && 'h-5 w-9',
          size === 'md' && 'h-6 w-11',
          checked ? 'bg-brand-600' : 'bg-border-strong',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm',
            'transform transition-transform duration-200 ease-in-out',
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-5 w-5',
            checked
              ? size === 'sm' ? 'translate-x-4' : 'translate-x-5'
              : 'translate-x-0',
          )}
        />
      </span>
      {label && (
        <span className="text-sm text-text-primary">{label}</span>
      )}
    </label>
  )
}

