// lib/mock-data/doubts.ts
import type { Doubt } from '../types'

export const mockDoubts: Doubt[] = [
  {
    id: 'dbt-1',
    projectId: 'proj-1',
    raisedById: 'emp-1',
    subject: 'Client not responding to keyword approval',
    description:
      'I sent the keyword research sheet to the client on Oct 25 but have not received approval yet. The on-page work is blocked until they approve. Should I proceed with the top 20 keywords based on our research, or wait?',
    priority: 'urgent',
    status: 'open',
    createdAt: '2026-11-02T11:30:00Z',
  },
  {
    id: 'dbt-2',
    projectId: 'proj-4',
    raisedById: 'emp-5',
    subject: 'Figma access not granted yet',
    description:
      'The client said they will add me as editor to their existing Figma file but I still do not have access. I need to reference their old design system before starting the new screens.',
    priority: 'normal',
    status: 'open',
    adminReply:
      'I have followed up with Ananya directly. She will add you by EOD today. If not done by 6 PM, let me know.',
    adminRepliedAt: '2026-11-03T09:15:00Z',
    createdAt: '2026-11-01T14:00:00Z',
  },
  {
    id: 'dbt-3',
    projectId: 'proj-5',
    raisedById: 'emp-4',
    subject: 'Mailchimp plan limits — need upgrade',
    description:
      'The client\'s current Mailchimp free plan allows only 500 contacts. Their list has 1,200 contacts. We need to either advise them to upgrade or trim the list. What should I tell them?',
    priority: 'normal',
    status: 'resolved',
    adminReply:
      'Tell them to upgrade to Mailchimp Essentials (~$13/month). I will send them an email explaining the ROI. You can proceed with the template design in the meantime.',
    adminRepliedAt: '2026-10-28T10:00:00Z',
    createdAt: '2026-10-27T16:00:00Z',
    resolvedAt: '2026-10-29T09:00:00Z',
  },
]

