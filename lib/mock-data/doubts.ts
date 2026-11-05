// lib/mock-data/doubts.ts
import type { Doubt } from '../types'

export const mockDoubts: Doubt[] = [
  {
    id: 'dbt-1',
    projectId: 'proj-1',
    raisedById: 'emp-1', // Priya Sharma
    subject: 'Client not responding to keyword approval sheet',
    description:
      'I sent the keyword research sheet to Rajan Pillai on Oct 25 but have not received approval yet. The on-page content updates are blocked until they approve the target clusters. Should I proceed with the top 20 keywords based on our research, or wait?',
    priority: 'urgent',
    status: 'open',
    createdAt: '2026-11-02T11:30:00Z',
  },
  {
    id: 'dbt-2',
    projectId: 'proj-2',
    raisedById: 'emp-2', // Arjun Mehta
    subject: 'Top food influencer requesting ₹5,000 budget increase',
    description:
      'Chef Vignesh (180k food followers on Instagram) is ready to shoot the FreshBite tasting reel, but is asking for ₹20,000 instead of our ₹15,000 offer. His engagement rate is 6.2%. Can we approve the ₹5,000 buffer from campaign ad spend?',
    priority: 'urgent',
    status: 'open',
    createdAt: '2026-11-04T15:20:00Z',
  },
  {
    id: 'dbt-3',
    projectId: 'proj-4',
    raisedById: 'emp-2', // Arjun Mehta
    subject: 'Meta Ad Account daily threshold limit hit',
    description:
      'The client’s newly created Meta Business Manager has a fresh ad account spend ceiling of ₹4,000/day. We need to spend ₹8,000/day to hit the weekend cloud kitchen order volume. Client needs to pay their first billing invoice to unlock the higher limit.',
    priority: 'normal',
    status: 'resolved',
    adminReply:
      'I called Rohit from UrbanSpice. He settled the pending ₹4,000 invoice with his card. Meta has now increased their daily spending cap to ₹25,000. You can scale the ads now.',
    adminRepliedAt: '2026-11-03T11:00:00Z',
    createdAt: '2026-11-02T16:00:00Z',
    resolvedAt: '2026-11-03T11:30:00Z',
  },
  {
    id: 'dbt-4',
    projectId: 'proj-5',
    raisedById: 'emp-5', // Sneha Reddy
    subject: 'Figma brand styleguide missing primary hex colors',
    description:
      'The client said they will add me as editor to their existing Figma file but I still do not have access. I need to reference their old design system before starting the new screens.',
    priority: 'normal',
    status: 'open',
    adminReply:
      'I followed up with Ananya directly. She shared the Figma link on WhatsApp. Check your email invite or open the shared link in project notes.',
    adminRepliedAt: '2026-11-03T09:15:00Z',
    createdAt: '2026-11-01T14:00:00Z',
  },
]
