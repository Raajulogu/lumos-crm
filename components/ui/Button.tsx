'use client'

// components/ui/Button.tsx
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        // Base
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
        'transition-all duration-150 cursor-pointer select-none',
        'active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        // Variants
        variant === 'primary' &&
          'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
        variant === 'secondary' &&
          'bg-white text-text-primary border border-border hover:bg-surface shadow-sm',
        variant === 'outline' &&
          'bg-transparent text-brand-600 border border-brand-600 hover:bg-brand-50',
        variant === 'ghost' &&
          'bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary',
        variant === 'danger' &&
          'bg-danger text-white hover:bg-danger-dark shadow-sm',
        // Sizes
        size === 'sm'   && 'h-8 px-3 text-xs',
        size === 'md'   && 'h-10 px-4 text-sm',
        size === 'lg'   && 'h-12 px-6 text-base',
        size === 'icon' && 'h-9 w-9 p-0',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

