// lib/mock-data/notes.ts
import type { Note } from '../types'

export const mockNotes: Note[] = [
  {
    id: 'note-1',
    projectId: 'proj-1',
    authorId: 'admin',
    authorType: 'admin',
    authorName: 'Admin',
    content: 'Client confirmed the scope in the kickoff call. They want focus on product category pages first — specifically sarees and dress materials.',
    createdAt: '2026-10-02T10:30:00Z',
  },
  {
    id: 'note-2',
    projectId: 'proj-1',
    authorId: 'emp-1',
    authorType: 'employee',
    authorName: 'Priya Sharma',
    content: 'Completed initial site audit. Found 23 broken internal links and 8 pages with duplicate meta titles. Will fix these first before keyword mapping.',
    createdAt: '2026-10-10T14:00:00Z',
  },
  {
    id: 'note-3',
    projectId: 'proj-1',
    authorId: 'emp-1',
    authorType: 'employee',
    authorName: 'Priya Sharma',
    content: 'Keyword research done — shortlisted 150 keywords across 4 clusters. Sent to client for review on Oct 25.',
    createdAt: '2026-10-25T17:00:00Z',
  },
  {
    id: 'note-4',
    projectId: 'proj-4',
    authorId: 'admin',
    authorType: 'admin',
    authorName: 'Admin',
    content: 'Client wants a WhatsApp chat widget added to the homepage. I told her we can include it as a small add-on. Sneha, please factor this in.',
    createdAt: '2026-10-20T11:00:00Z',
  },
]

