// lib/mock-data/followups.ts
import type { FollowUp } from '../types'

export const mockFollowUps: FollowUp[] = [
  {
    id: 'fu-1',
    projectId: 'proj-3',
    clientId: 'cli-3',
    scheduledAt: '2026-11-06T10:00:00Z',
    assignedToId: 'admin',
    assignedToName: 'Rajesh Sharma',
    notes: 'Suresh asked for a callback after reviewing the Q4 Google Ads lead gen proposal. Confirm budget approval & start date.',
    status: 'pending',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'fu-2',
    projectId: 'proj-1',
    clientId: 'cli-1',
    scheduledAt: '2026-11-07T11:30:00Z',
    assignedToId: 'emp-1', // Priya Sharma
    assignedToName: 'Priya Sharma',
    notes: 'Call Rajan Pillai to review the shortlisted keyword clusters and get sign-off for on-page meta tags.',
    status: 'pending',
    createdAt: '2026-11-02T12:00:00Z',
  },
  {
    id: 'fu-3',
    projectId: 'proj-2',
    clientId: 'cli-2',
    scheduledAt: '2026-11-06T15:00:00Z',
    assignedToId: 'emp-2', // Arjun Mehta
    assignedToName: 'Arjun Mehta',
    notes: 'Call Meena Krishnan regarding Chef Vignesh reel concept script and get brand asset logo approvals.',
    status: 'pending',
    createdAt: '2026-11-04T16:00:00Z',
  },
  {
    id: 'fu-4',
    projectId: 'proj-4',
    clientId: 'cli-7',
    scheduledAt: '2026-11-08T12:00:00Z',
    assignedToId: 'emp-2', // Arjun Mehta
    assignedToName: 'Arjun Mehta',
    notes: 'Review weekend cloud kitchen order volume numbers and ROAS with Rohit Nambiar.',
    status: 'pending',
    createdAt: '2026-11-03T10:00:00Z',
  },
  {
    id: 'fu-5',
    projectId: 'proj-7',
    clientId: 'cli-6',
    scheduledAt: '2026-10-30T10:00:00Z',
    assignedToId: 'admin',
    assignedToName: 'Rajesh Sharma',
    notes: 'Check in with Dr. Sandeep Verma regarding October patient review metrics on Google Maps.',
    status: 'done',
    createdAt: '2026-10-25T10:00:00Z',
  },
]
