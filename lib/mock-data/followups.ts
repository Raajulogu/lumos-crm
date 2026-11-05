// lib/mock-data/followups.ts
import type { FollowUp } from '../types'

export const mockFollowUps: FollowUp[] = [
  {
    id: 'fu-1',
    projectId: 'proj-3',
    clientId: 'cli-3',
    scheduledAt: '2026-11-05T10:00:00Z',
    assignedToId: 'admin',
    assignedToName: 'Admin',
    notes: 'Suresh asked us to call after reviewing the campaign proposal. Confirm ad budget and campaign start date.',
    status: 'pending',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'fu-2',
    projectId: 'proj-1',
    clientId: 'cli-1',
    scheduledAt: '2026-11-07T11:00:00Z',
    assignedToId: 'emp-1',
    assignedToName: 'Priya Sharma',
    notes: 'Follow up with Rajan to get keyword approval. Have been waiting since Oct 25.',
    status: 'pending',
    createdAt: '2026-11-02T12:00:00Z',
  },
  {
    id: 'fu-3',
    projectId: 'proj-2',
    clientId: 'cli-2',
    scheduledAt: '2026-10-28T09:00:00Z',
    assignedToId: 'admin',
    assignedToName: 'Admin',
    notes: 'Check in with Meena on campaign performance — October numbers should be in.',
    status: 'done',
    createdAt: '2026-10-20T10:00:00Z',
  },
]

