// components/layout/ContentWrapper.tsx
// Use this to wrap the main content area of any page.
// Provides consistent horizontal padding and max-width.

import { cn } from '@/lib/utils'

interface ContentWrapperProps {
  children: React.ReactNode
  className?: string
  narrow?: boolean   // narrower content (forms, detail pages)
}

export function ContentWrapper({ children, className, narrow = false }: ContentWrapperProps) {
  return (
    <div
      className={cn(
        'w-full px-4 py-5 md:px-6 md:py-6',
        narrow ? 'max-w-3xl mx-auto' : 'max-w-screen-xl mx-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

