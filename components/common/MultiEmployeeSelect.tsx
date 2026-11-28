'use client'

// components/common/MultiEmployeeSelect.tsx
// Reusable multi-select dropdown for assigning one or multiple employees to a task.

import { useState, useRef, useEffect } from 'react'
import { Users, Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Employee } from '@/lib/types'

interface MultiEmployeeSelectProps {
  employees: Employee[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  compact?: boolean
  disabled?: boolean
  className?: string
}

export function MultiEmployeeSelect({
  employees,
  selectedIds,
  onChange,
  placeholder = 'Assign staff...',
  compact = false,
  disabled = false,
  className,
}: MultiEmployeeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id))

  function toggleEmployee(empId: string) {
    if (selectedIds.includes(empId)) {
      onChange(selectedIds.filter((id) => id !== empId))
    } else {
      onChange([...selectedIds, empId])
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-1.5 rounded-lg border border-border bg-white text-left transition-colors cursor-pointer',
          'hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-brand-500',
          compact ? 'min-h-8 px-2 py-1 text-xs' : 'min-h-10 px-3 py-1.5 text-xs',
          disabled && 'opacity-50 pointer-events-none',
        )}
        aria-expanded={isOpen}
        aria-label="Assign staff members"
      >
        <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
          {selectedEmployees.length === 0 ? (
            <span className="text-text-muted flex items-center gap-1.5 truncate">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{placeholder}</span>
            </span>
          ) : (
            <>
              {selectedEmployees.slice(0, compact ? 2 : 3).map((emp) => (
                <span
                  key={emp.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 text-[11px] font-medium max-w-[120px] truncate"
                >
                  <span className="truncate">{emp.fullName}</span>
                </span>
              ))}
              {selectedEmployees.length > (compact ? 2 : 3) && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  +{selectedEmployees.length - (compact ? 2 : 3)}
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-xl border border-border bg-white shadow-lg p-1.5 z-50 text-xs">
          <div className="flex items-center justify-between px-2 py-1 border-b border-border mb-1">
            <span className="text-[11px] font-semibold text-text-muted">
              Select Staff ({selectedIds.length})
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-danger hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {employees.length === 0 ? (
            <p className="py-3 text-center text-text-muted text-[11px]">No employees available</p>
          ) : (
            employees.map((emp) => {
              const checked = selectedIds.includes(emp.id)
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggleEmployee(emp.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer',
                    checked
                      ? 'bg-brand-50 text-brand-900 font-medium'
                      : 'text-text-secondary hover:bg-surface',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{emp.fullName}</p>
                    <p className="truncate text-[10px] text-text-muted">{emp.designation}</p>
                  </div>
                  <span
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                      checked
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-border-strong bg-white',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

