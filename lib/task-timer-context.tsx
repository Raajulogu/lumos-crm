// lib/task-timer-context.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { TaskStatus, TaskPunch } from '@/lib/types'
import { Modal, Button, Textarea } from '@/components/ui'
import { Clock, AlertTriangle, Check } from 'lucide-react'

// Maximum 8 hours (28,800 seconds) allowed per continuous task work session
export const MAX_TASK_DURATION_SECONDS = 8 * 60 * 60

export interface ActiveTaskPunch {
  punchId: string
  taskId: string
  taskTitle: string
  projectId: string
  projectName?: string
  startTime: string
}

export interface PendingAutoCloseTask {
  punchId: string
  taskId: string
  taskTitle: string
  projectId: string
  projectName?: string
  startTime: string
  autoStoppedAt: string
  durationSeconds: number
}

interface TaskTimerContextType {
  activePunch: ActiveTaskPunch | null
  elapsedSeconds: number
  remainingSeconds: number
  isRunning: boolean
  pendingAutoClose: PendingAutoCloseTask | null
  startTaskTimer: (task: {
    id: string
    title: string
    projectId: string
    projectName?: string
  }) => Promise<void>
  openStopModal: () => void
  closeStopModal: () => void
  stopTaskTimer: (data: { statusAtStop: TaskStatus; notes?: string }) => Promise<TaskPunch | null>
  openAutoCloseModal: () => void
}

const TaskTimerContext = createContext<TaskTimerContextType>({
  activePunch: null,
  elapsedSeconds: 0,
  remainingSeconds: MAX_TASK_DURATION_SECONDS,
  isRunning: false,
  pendingAutoClose: null,
  startTaskTimer: async () => {},
  openStopModal: () => {},
  closeStopModal: () => {},
  stopTaskTimer: async () => null,
  openAutoCloseModal: () => {},
})

const STORAGE_KEY = 'crm_active_task_punch'
const PENDING_AUTO_CLOSE_KEY = 'crm_pending_auto_close_task'

export function TaskTimerProvider({ children }: { children: React.ReactNode }) {
  const [activePunch, setActivePunch] = useState<ActiveTaskPunch | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)
  const [statusAtStop, setStatusAtStop] = useState<TaskStatus>('in_progress')
  const [stopNotes, setStopNotes] = useState('')
  const [isStopping, setIsStopping] = useState(false)

  // 8-hour Auto-Close state & update prompt
  const [pendingAutoClose, setPendingAutoClose] = useState<PendingAutoCloseTask | null>(null)
  const [isAutoCloseModalOpen, setIsAutoCloseModalOpen] = useState(false)
  const [autoCloseStatus, setAutoCloseStatus] = useState<TaskStatus>('in_progress')
  const [autoCloseUpdateText, setAutoCloseUpdateText] = useState('')
  const [autoCloseError, setAutoCloseError] = useState('')
  const [isSubmittingAutoUpdate, setIsSubmittingAutoUpdate] = useState(false)

  const autoPunchLockRef = useRef(false)

  const triggerAutoPunchOut = useCallback(async (punch: ActiveTaskPunch) => {
    if (autoPunchLockRef.current) return
    autoPunchLockRef.current = true

    const startMs = new Date(punch.startTime).getTime()
    const cappedStopIso = new Date(
      (isNaN(startMs) ? Date.now() - MAX_TASK_DURATION_SECONDS * 1000 : startMs) +
        MAX_TASK_DURATION_SECONDS * 1000,
    ).toISOString()

    try {
      await api.tasks
        .punchOut(
          punch.punchId,
          punch.taskId,
          punch.projectId,
          {
            statusAtStop: 'in_progress',
            notes: 'Auto-punched at 8-hour work session limit. Waiting for employee update.',
            autoPunched: true,
          },
          MAX_TASK_DURATION_SECONDS,
        )
        .catch(() => null)
    } finally {
      const pending: PendingAutoCloseTask = {
        punchId: punch.punchId,
        taskId: punch.taskId,
        taskTitle: punch.taskTitle,
        projectId: punch.projectId,
        projectName: punch.projectName,
        startTime: punch.startTime,
        autoStoppedAt: cappedStopIso,
        durationSeconds: MAX_TASK_DURATION_SECONDS,
      }

      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(PENDING_AUTO_CLOSE_KEY, JSON.stringify(pending))
      } catch {}

      setActivePunch(null)
      setElapsedSeconds(0)
      setIsStopModalOpen(false)
      setPendingAutoClose(pending)
      setAutoCloseStatus('in_progress')
      setIsAutoCloseModalOpen(true)
      autoPunchLockRef.current = false

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('crm_punch_stopped', {
            detail: { taskId: punch.taskId, autoPunched: true },
          }),
        )
      }
    }
  }, [])

  // Restore saved punch & pending auto-close update on mount (deferred cleanly)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = setTimeout(() => {
      try {
        const pendingRaw = localStorage.getItem(PENDING_AUTO_CLOSE_KEY)
        if (pendingRaw) {
          const parsedPending: PendingAutoCloseTask = JSON.parse(pendingRaw)
          if (parsedPending?.taskId) {
            setPendingAutoClose(parsedPending)
            setIsAutoCloseModalOpen(true)
          }
        }

        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed: ActiveTaskPunch = JSON.parse(stored)
          if (parsed && parsed.startTime) {
            const startedAt = new Date(parsed.startTime).getTime()
            const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
            if (diff >= MAX_TASK_DURATION_SECONDS) {
              triggerAutoPunchOut(parsed)
            } else {
              setActivePunch(parsed)
              setElapsedSeconds(diff)
            }
          }
        }
      } catch {}
    }, 0)

    return () => clearTimeout(timer)
  }, [triggerAutoPunchOut])

  // Live timer ticker + 8-hour auto-punch watcher + visibility sync
  useEffect(() => {
    if (!activePunch) return

    const tick = () => {
      const startedAt = new Date(activePunch.startTime).getTime()
      const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      if (diff >= MAX_TASK_DURATION_SECONDS) {
        triggerAutoPunchOut(activePunch)
        return
      }
      setElapsedSeconds(diff)
    }

    const interval = setInterval(tick, 1000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [activePunch, triggerAutoPunchOut])

  const startTaskTimer = useCallback(
    async (task: {
      id: string
      title: string
      projectId: string
      projectName?: string
    }) => {
      // If there's a pending auto-close update, prompt employee to submit update first
      if (pendingAutoClose) {
        setIsAutoCloseModalOpen(true)
        return
      }

      // If same task is already running, no-op
      if (activePunch && activePunch.taskId === task.id) return

      // If another task is running, automatically open stop modal for that one first
      if (activePunch) {
        setIsStopModalOpen(true)
        return
      }

      const punch = await api.tasks.punchIn(task.id, task.projectId, task.title)
      const newActive: ActiveTaskPunch = {
        punchId: punch.id,
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: task.projectName,
        startTime: punch.startTime || new Date().toISOString(),
      }

      setActivePunch(newActive)
      setElapsedSeconds(0)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newActive))
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm_punch_started', { detail: newActive }))
      }
    },
    [activePunch, pendingAutoClose],
  )

  const openStopModal = useCallback(() => {
    if (activePunch) {
      setIsStopModalOpen(true)
    }
  }, [activePunch])

  const closeStopModal = useCallback(() => {
    setIsStopModalOpen(false)
    setStopNotes('')
  }, [])

  const openAutoCloseModal = useCallback(() => {
    if (pendingAutoClose) {
      setIsAutoCloseModalOpen(true)
    }
  }, [pendingAutoClose])

  const stopTaskTimer = useCallback(
    async (payload: { statusAtStop: TaskStatus; notes?: string }) => {
      if (!activePunch) return null

      setIsStopping(true)
      const effectiveSeconds = Math.min(elapsedSeconds, MAX_TASK_DURATION_SECONDS)
      try {
        const finished = await api.tasks.punchOut(
          activePunch.punchId,
          activePunch.taskId,
          activePunch.projectId,
          payload,
          effectiveSeconds,
        )

        const stoppedTaskId = activePunch.taskId
        setActivePunch(null)
        setElapsedSeconds(0)
        setIsStopModalOpen(false)
        setStopNotes('')

        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('crm_punch_stopped', {
              detail: { punch: finished, taskId: stoppedTaskId },
            }),
          )
        }

        return finished
      } finally {
        setIsStopping(false)
      }
    },
    [activePunch, elapsedSeconds],
  )

  async function handleSubmitAutoCloseUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingAutoClose) return
    if (!autoCloseUpdateText.trim()) {
      setAutoCloseError('Please enter a brief work update before continuing.')
      return
    }

    setAutoCloseError('')
    setIsSubmittingAutoUpdate(true)
    try {
      await api.tasks.autoUpdate(pendingAutoClose.taskId, pendingAutoClose.projectId, {
        updateText: autoCloseUpdateText.trim(),
        statusAtStop: autoCloseStatus,
        punchId: pendingAutoClose.punchId,
      })

      const taskId = pendingAutoClose.taskId
      setPendingAutoClose(null)
      setAutoCloseUpdateText('')
      setIsAutoCloseModalOpen(false)
      try {
        localStorage.removeItem(PENDING_AUTO_CLOSE_KEY)
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('crm_punch_stopped', {
            detail: { taskId, updateSubmitted: true },
          }),
        )
      }
    } finally {
      setIsSubmittingAutoUpdate(false)
    }
  }

  function formatTime(totalSec: number) {
    const clamped = Math.max(0, totalSec)
    const hrs = Math.floor(clamped / 3600)
    const mins = Math.floor((clamped % 3600) / 60)
    const secs = clamped % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const remainingSeconds = Math.max(0, MAX_TASK_DURATION_SECONDS - elapsedSeconds)

  return (
    <TaskTimerContext.Provider
      value={{
        activePunch,
        elapsedSeconds,
        remainingSeconds,
        isRunning: !!activePunch,
        pendingAutoClose,
        startTaskTimer,
        openStopModal,
        closeStopModal,
        stopTaskTimer,
        openAutoCloseModal,
      }}
    >
      {children}

      {/* Global Task Stop & Status Modal (Manual Stop Anytime within 8h) */}
      {isStopModalOpen && activePunch && (
        <Modal
          isOpen={isStopModalOpen}
          onClose={() => {
            if (!isStopping) closeStopModal()
          }}
          title="Stop Timer & Log Work Session"
          size="md"
        >
          <div className="space-y-4">
            {/* Session Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Active Task Session (8-Hour Cap)
              </p>
              <h4 className="font-bold text-sm text-text-primary mt-0.5">
                {activePunch.taskTitle}
              </h4>
              {activePunch.projectName && (
                <p className="text-xs text-brand-600 mt-0.5">{activePunch.projectName}</p>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-text-muted">Recorded Duration:</span>
                <span className="font-mono text-base font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
                <span>Remaining before 8h auto-punch:</span>
                <span className="font-mono font-semibold text-text-secondary">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            {/* Status at Stop prompt */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                What is the current status of this task now? <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'in_progress', label: 'In Progress', desc: 'Still working on it' },
                  { id: 'review', label: 'Ready for Review', desc: 'Needs QA / admin review' },
                  { id: 'completed', label: 'Completed', desc: 'Finished successfully' },
                  { id: 'blocked', label: 'Blocked / Doubts', desc: 'Waiting for info' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusAtStop(opt.id as TaskStatus)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      statusAtStop === opt.id
                        ? 'border-brand-600 bg-brand-50/70 ring-1 ring-brand-500'
                        : 'border-border hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">
                        {opt.label}
                      </span>
                      {statusAtStop === opt.id && (
                        <Check className="h-3.5 w-3.5 text-brand-600" />
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Work log notes */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Work Log Summary / Notes <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="e.g. Conducted keyword research, drafted high intent cluster, optimized h1/h2 tags..."
                value={stopNotes}
                onChange={(e) => setStopNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeStopModal}
                disabled={isStopping}
              >
                Keep Working
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isStopping}
                onClick={() =>
                  stopTaskTimer({
                    statusAtStop,
                    notes: stopNotes.trim() || undefined,
                  })
                }
              >
                Stop Timer & Save Work Log
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8-Hour Auto-Punch Update Modal */}
      {isAutoCloseModalOpen && pendingAutoClose && (
        <Modal
          isOpen={isAutoCloseModalOpen}
          onClose={() => {
            if (!isSubmittingAutoUpdate) setIsAutoCloseModalOpen(false)
          }}
          title="Task Auto-Punched at 8-Hour Limit"
          description="Maximum continuous task duration (08:00:00) was reached. Please provide your work update."
          size="md"
        >
          <form onSubmit={handleSubmitAutoCloseUpdate} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-warning-light/60 border border-warning/40 text-warning-dark text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">8-Hour Auto-Stop Triggered</p>
                <p className="mt-0.5 leading-relaxed">
                  Your timer for <strong>{pendingAutoClose.taskTitle}</strong> automatically
                  punched out at the 8-hour mark (<strong>08:00:00</strong>) so your hours stay
                  accurate. Please share what was completed and update the task status below.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <p className="text-text-muted">Task Deliverable</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {pendingAutoClose.taskTitle}
                </p>
                {pendingAutoClose.projectName && (
                  <p className="text-[11px] text-brand-600 mt-0.5">{pendingAutoClose.projectName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-text-muted">Auto-Punched Time</p>
                <p className="font-mono font-bold text-brand-700 text-sm mt-0.5 flex items-center justify-end gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>08:00:00 (480m)</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Task Status After This Session <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'in_progress', label: 'In Progress', desc: 'Will continue later' },
                  { id: 'review', label: 'Ready for Review', desc: 'Ready for QA / admin' },
                  { id: 'completed', label: 'Completed', desc: 'Work finished' },
                  { id: 'blocked', label: 'Blocked / Doubts', desc: 'Needs input' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAutoCloseStatus(opt.id as TaskStatus)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      autoCloseStatus === opt.id
                        ? 'border-brand-600 bg-brand-50/70 ring-1 ring-brand-500'
                        : 'border-border hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-semibold text-text-primary block">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-text-muted">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Textarea
                label="What did you accomplish in this 8-hour work block?"
                placeholder="Summarize completed deliverables, blockers, or pending items for management..."
                value={autoCloseUpdateText}
                onChange={(e) => {
                  setAutoCloseUpdateText(e.target.value)
                  setAutoCloseError('')
                }}
                error={autoCloseError}
                rows={3}
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAutoCloseModalOpen(false)}
                disabled={isSubmittingAutoUpdate}
              >
                Remind Me Later
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingAutoUpdate}
              >
                Submit Update & Save
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </TaskTimerContext.Provider>
  )
}

export function useTaskTimer() {
  return useContext(TaskTimerContext)
}
