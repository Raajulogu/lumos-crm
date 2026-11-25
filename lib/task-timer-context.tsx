// lib/task-timer-context.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { TaskStatus, TaskPunch } from '@/lib/types'
import { Modal, Button, Textarea } from '@/components/ui'
import { CheckCircle2, Clock, Pause, Play, AlertCircle, Check } from 'lucide-react'

export interface ActiveTaskPunch {
  punchId: string
  taskId: string
  taskTitle: string
  projectId: string
  projectName?: string
  startTime: string
}

interface TaskTimerContextType {
  activePunch: ActiveTaskPunch | null
  elapsedSeconds: number
  isRunning: boolean
  startTaskTimer: (task: {
    id: string
    title: string
    projectId: string
    projectName?: string
  }) => Promise<void>
  openStopModal: () => void
  closeStopModal: () => void
  stopTaskTimer: (data: { statusAtStop: TaskStatus; notes?: string }) => Promise<TaskPunch | null>
}

const TaskTimerContext = createContext<TaskTimerContextType>({
  activePunch: null,
  elapsedSeconds: 0,
  isRunning: false,
  startTaskTimer: async () => {},
  openStopModal: () => {},
  closeStopModal: () => {},
  stopTaskTimer: async () => null,
})

const STORAGE_KEY = 'crm_active_task_punch'

export function TaskTimerProvider({ children }: { children: React.ReactNode }) {
  const [activePunch, setActivePunch] = useState<ActiveTaskPunch | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)
  const [statusAtStop, setStatusAtStop] = useState<TaskStatus>('in_progress')
  const [stopNotes, setStopNotes] = useState('')
  const [isStopping, setIsStopping] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: ActiveTaskPunch = JSON.parse(stored)
        if (parsed && parsed.startTime) {
          const startedAt = new Date(parsed.startTime).getTime()
          const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
          setActivePunch(parsed)
          setElapsedSeconds(diff)
        }
      }
    } catch {}
  }, [])

  // Timer ticker
  useEffect(() => {
    if (!activePunch) {
      setElapsedSeconds(0)
      return
    }

    const interval = setInterval(() => {
      const startedAt = new Date(activePunch.startTime).getTime()
      const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setElapsedSeconds(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [activePunch])

  const startTaskTimer = useCallback(
    async (task: {
      id: string
      title: string
      projectId: string
      projectName?: string
    }) => {
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
    [activePunch],
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

  const stopTaskTimer = useCallback(
    async (payload: { statusAtStop: TaskStatus; notes?: string }) => {
      if (!activePunch) return null

      setIsStopping(true)
      try {
        const finished = await api.tasks.punchOut(
          activePunch.punchId,
          activePunch.taskId,
          activePunch.projectId,
          payload,
          elapsedSeconds,
        )

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
              detail: { punch: finished, taskId: activePunch.taskId },
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

  function formatTime(totalSec: number) {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <TaskTimerContext.Provider
      value={{
        activePunch,
        elapsedSeconds,
        isRunning: !!activePunch,
        startTaskTimer,
        openStopModal,
        closeStopModal,
        stopTaskTimer,
      }}
    >
      {children}

      {/* Global Task Stop & Status Modal */}
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
                Active Task Session
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
    </TaskTimerContext.Provider>
  )
}

export function useTaskTimer() {
  return useContext(TaskTimerContext)
}
