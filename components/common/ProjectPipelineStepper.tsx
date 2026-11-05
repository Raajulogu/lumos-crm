'use client'

// components/common/ProjectPipelineStepper.tsx
// Visual interactive 5-stage pipeline stepper for project lifecycle tracking.
// Supports 1-click status advances, progress line animation, and reminder cessation indicator.

import { useState } from 'react'
import { Check, Clock, CheckCircle2 } from 'lucide-react'
import { cn, getStatusLabel } from '@/lib/utils'
import type { ProjectStatus } from '@/lib/types'

interface PipelineStep {
  key: ProjectStatus
  label: string
  subtitle: string
  stepNumber: number
}

const PIPELINE_STEPS: PipelineStep[] = [
  { key: 'new', label: 'New', subtitle: 'Brief Onboarded', stepNumber: 1 },
  { key: 'in_progress', label: 'In Progress', subtitle: 'Active Work', stepNumber: 2 },
  { key: 'under_review', label: 'Under Review', subtitle: 'Internal QA / Review', stepNumber: 3 },
  { key: 'completed', label: 'Completed', subtitle: 'Deliverables Ready', stepNumber: 4 },
  { key: 'delivered', label: 'Delivered', subtitle: 'Client Handoff', stepNumber: 5 },
]

interface ProjectPipelineStepperProps {
  currentStatus: ProjectStatus
  onStatusChange: (status: ProjectStatus) => void
  disabled?: boolean
  className?: string
}

export function ProjectPipelineStepper({
  currentStatus,
  onStatusChange,
  disabled = false,
  className,
}: ProjectPipelineStepperProps) {
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null)

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === currentStatus)
  const isDelivered = currentStatus === 'delivered'

  function handleClick(stepKey: ProjectStatus) {
    if (disabled || stepKey === currentStatus) return

    onStatusChange(stepKey)

    if (stepKey === 'delivered') {
      setFeedbackNotice(
        '🎉 Marked Delivered! Automated deadline reminder emails are now ceased.',
      )
    } else if (stepKey === 'under_review') {
      setFeedbackNotice(
        '📋 Moved to Under Review. Team notified for quality inspection.',
      )
    } else {
      setFeedbackNotice(
        `Status updated to "${getStatusLabel(stepKey)}". Live CRM pipeline refreshed.`,
      )
    }

    setTimeout(() => {
      setFeedbackNotice(null)
    }, 4500)
  }

  // Progress percentage (0% to 100%)
  const progressPct = currentIndex >= 0 ? (currentIndex / (PIPELINE_STEPS.length - 1)) * 100 : 0

  return (
    <div className={cn('w-full', className)}>
      {/* Feedback Toast Notice */}
      {feedbackNotice && (
        <div className="mb-3 p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-600 flex-shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-brand-600 hover:text-brand-800 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connected Desktop / Tablet Stepper Track */}
      <div className="relative pt-2 pb-1">
        {/* Progress Track Background */}
        <div className="hidden sm:block absolute top-6 left-8 right-8 h-1 bg-slate-200 rounded-full z-0" />

        {/* Active Progress Fill */}
        <div
          className="hidden sm:block absolute top-6 left-8 h-1 bg-brand-600 rounded-full transition-all duration-300 z-0"
          style={{ width: `calc(${progressPct}% - 16px)` }}
        />

        {/* Step Circles & Titles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCompleted = isDelivered || idx < currentIndex
            const isCurrent = step.key === currentStatus

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => handleClick(step.key)}
                disabled={disabled}
                className={cn(
                  'group p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between',
                  'sm:flex-col sm:items-center sm:text-center sm:p-2.5',
                  isCurrent
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md ring-2 ring-brand-400 ring-offset-2'
                    : isCompleted
                    ? 'bg-brand-50 border-brand-200 text-brand-900 hover:bg-brand-100 hover:border-brand-300'
                    : 'bg-white border-border text-text-secondary hover:bg-surface hover:text-text-primary hover:border-slate-300',
                  disabled && 'opacity-60 cursor-not-allowed',
                )}
              >
                {/* Step Circle Indicator */}
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-all',
                    isCurrent
                      ? 'bg-white text-brand-700 shadow-xs'
                      : isCompleted
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-text-muted group-hover:bg-slate-200 group-hover:text-text-primary',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <span>{step.stepNumber}</span>
                  )}
                </div>

                {/* Step Labels */}
                <div>
                  <p
                    className={cn(
                      'text-xs font-bold leading-tight',
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-brand-900'
                        : 'text-text-primary',
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'text-[10px] mt-0.5 leading-snug line-clamp-1',
                      isCurrent
                        ? 'text-white/85'
                        : isCompleted
                        ? 'text-brand-700'
                        : 'text-text-muted',
                    )}
                  >
                    {step.subtitle}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reminder Engine Policy Status Callout */}
      <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-text-muted flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isDelivered ? (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Automated Reminders Stopped (Project Delivered)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-text-secondary">
              <Clock className="h-3.5 w-3.5 text-brand-600" />
              Automated Reminders Active (Daily checks at 3d, 2d, 1d before deadline)
            </span>
          )}
        </div>
        <span className="text-[11px] text-text-muted">
          Click any step above to advance project
        </span>
      </div>
    </div>
  )
}
