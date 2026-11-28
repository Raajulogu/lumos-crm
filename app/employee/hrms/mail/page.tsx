'use client'

// app/employee/hrms/mail/page.tsx
// HRMS Send Mail — Dispatch work updates or official communication via CRM mail API.

import { useState, useEffect, Suspense } from 'react'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Textarea,
  PageLoader,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { HrmsMailRecord } from '@/lib/types'
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function HrmsSendMailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HrmsSendMailContent />
    </Suspense>
  )
}

function HrmsSendMailContent() {
  const { currentUser } = useAuth()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [sentHistory, setSentHistory] = useState<HrmsMailRecord[]>([])

  useEffect(() => {
    api.hrms.getSentMail().then(setSentHistory).catch(() => {})
  }, [])

  async function handleSendMail(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Recipient email, subject, and message body are required.')
      return
    }

    setIsSending(true)
    try {
      const htmlContent = `<p>${body
        .trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')}</p><p style="margin-top:16px;color:#64748b;font-size:12px;">Sent via Lumos CRM by ${
        currentUser.fullName || 'Team Member'
      }</p>`

      const rec = await api.hrms.sendMail({
        to: to.trim(),
        subject: subject.trim(),
        html: htmlContent,
      })
      setSentHistory((prev) => [rec, ...prev])
      setSuccessMsg(
        rec.status === 'sent'
          ? `Email successfully dispatched to ${rec.to}.`
          : `Email logged for dispatch to ${rec.to}.`,
      )
      setTo('')
      setSubject('')
      setBody('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="HRMS — Send Mail"
        description="Send official updates, HR notices, or deliverable links directly from the CRM."
        breadcrumbs={[
          { label: 'HRMS' },
          { label: 'Send Mail' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="lg">
            <CardHeader
              title="Compose Email"
              description="Fill recipient, subject, and message"
            />

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-success-light text-success-dark text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-danger-light text-danger-dark text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendMail} className="space-y-4">
              <div>
                <Input
                  label="To (Recipient Email)"
                  type="email"
                  placeholder="admin@markcrm.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  required
                />
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <span className="text-text-muted">Quick select:</span>
                  <button
                    type="button"
                    onClick={() => setTo('admin@markcrm.com')}
                    className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium cursor-pointer"
                  >
                    Agency Admin
                  </button>
                </div>
              </div>

              <Input
                label="Subject"
                placeholder="e.g. Daily EOD Status Update / Permission Follow-up"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <Textarea
                label="Message"
                placeholder="Write your email content here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                required
              />

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" isLoading={isSending}>
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div>
          <Card padding="md">
            <CardHeader
              title="Sent Mail Log"
              description="Recent emails sent from your portal"
            />
            {sentHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <Mail className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p>No emails sent yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
                {sentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-border bg-surface text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text-primary truncate">
                        {item.subject}
                      </span>
                      <Badge
                        variant={item.status === 'sent' ? 'green' : 'blue'}
                        size="sm"
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-text-muted truncate">To: {item.to}</p>
                    <p className="text-[10px] text-text-muted">
                      {formatDateTime(item.sentAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ContentWrapper>
  )
}

