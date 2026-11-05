'use client'

// components/common/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined
  const endItem =
    itemsPerPage && totalItems
      ? Math.min(currentPage * itemsPerPage, totalItems)
      : undefined

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1 text-sm text-text-secondary',
        className,
      )}
    >
      {totalItems !== undefined && startItem !== undefined && endItem !== undefined && (
        <p className="text-xs text-text-muted text-center sm:text-left">
          Showing <span className="font-medium text-text-primary">{startItem}</span> to{' '}
          <span className="font-medium text-text-primary">{endItem}</span> of{' '}
          <span className="font-medium text-text-primary">{totalItems}</span> results
        </p>
      )}

      <div className="flex items-center gap-1.5 self-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <span className="px-3 text-xs font-medium text-text-primary">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

