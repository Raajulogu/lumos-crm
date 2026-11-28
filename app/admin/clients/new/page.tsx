'use client'

// app/admin/clients/new/page.tsx
// Add New Client Form — reuses shared ClientForm component.

import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui'
import { ClientForm } from '@/components/forms/ClientForm'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  return (
    <ContentWrapper narrow>
      <PageHeader
        title="Add New Client"
        description="Onboard a new digital marketing client or business account."
        breadcrumbs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: 'New Client' },
        ]}
        action={
          <Link href="/admin/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        }
      />

      <ClientForm mode="create" />
    </ContentWrapper>
  )
}
