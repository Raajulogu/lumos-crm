'use client'

// components/common/FollowUpEvaluationModal.tsx
// Reusable modal for employees to mark a call follow-up complete and submit quality evaluation.

import { useState } from 'react'
import { Modal, Button, Textarea } from '@/components/ui'
import { api } from '@/lib/api'
import type { FollowUp, FollowUpEvaluation } from '@/lib/types'
import { Star, CheckCircle2, AlertCircle } from 'lucide-react'

interface FollowUpEvaluationModalProps {
  followUp: FollowUp | null
  clientCompanyName?: string
  employeeName?: string
  isOpen: boolean
  onClose: () => void
  onSubmitted: (followupId: string, evaluation: FollowUpEvaluation) => void
}

export function FollowUpEvaluationModal({
  followUp,
  clientCompanyName,
  employeeName,
  isOpen,
  onClose,
  onSubmitted,
}: FollowUpEvaluationModalProps) {
  const [rating, setRating] = useState<number>(followUp?.evaluation?.rating || 5)
  const [properlyCompleted, setProperlyCompleted] = useState<boolean>(
    followUp?.evaluation?.properlyCompleted ?? true,
  )
  const [comments, setComments] = useState<string>(followUp?.evaluation?.comments || '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!followUp) return
    if (!comments.trim()) {
      setError('Please summarize the call outcome or evaluation notes.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const evaluation = await api.followups.submitEvaluation(followUp.id, {
        rating,
        properlyCompleted,
        comments: comments.trim(),
        projectId: followUp.projectId,
        employeeName,
      })
      if (followUp.status !== 'done') {
        await api.followups.updateStatus(followUp.id, 'done').catch(() => {})
      }
      onSubmitted(followUp.id, evaluation)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title="Complete & Evaluate Follow-up"
      description={
        clientCompanyName
          ? `Confirm call completion quality for ${clientCompanyName}`
          : 'Confirm call completion & quality feedback'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-text-primary mb-2">
            Was the assigned follow-up properly completed? <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setProperlyCompleted(true)}
              className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                properlyCompleted
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                  : 'border-border bg-white text-text-secondary hover:bg-surface'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold">Yes, Properly Done</p>
                <p className="text-[10px] opacity-80">Client spoken with / updated</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProperlyCompleted(false)}
              className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                !properlyCompleted
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                  : 'border-border bg-white text-text-secondary hover:bg-surface'
              }`}
            >
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold">Partial / No Answer</p>
                <p className="text-[10px] opacity-80">Needs another check-in</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-text-primary mb-1.5">
            Call Quality & Response Rating (1–5)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  star <= rating
                    ? 'bg-amber-50 border-amber-300 text-amber-500'
                    : 'bg-white border-border text-slate-300 hover:text-amber-400'
                }`}
                aria-label={`Rate ${star} out of 5`}
              >
                <Star className={`h-4 w-4 ${star <= rating ? 'fill-amber-400' : ''}`} />
              </button>
            ))}
            <span className="ml-2 font-semibold text-text-primary">{rating} / 5</span>
          </div>
        </div>

        <Textarea
          label="Call Outcome & Evaluation Comments"
          placeholder="e.g. Discussed Q4 ad creatives with client, approved budget increase, client requested weekly report..."
          value={comments}
          onChange={(e) => {
            setComments(e.target.value)
            setError('')
          }}
          error={error}
          rows={3}
          required
        />

        <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            Save Completion & Evaluation
          </Button>
        </div>
      </form>
    </Modal>
  )
}

