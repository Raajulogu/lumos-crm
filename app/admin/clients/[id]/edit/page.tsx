'use client'

// app/admin/clients/[id]/edit/page.tsx
// Edit Client Details Page — opened from Company Details Edit button.

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Button, PageLoader, CardSkeleton } from '@/components/ui'
import { ClientForm } from '@/components/forms/ClientForm'
import { api } from '@/lib/api'
import type { Client } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

export default function EditClientPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditClientContent />
    </Suspense>
  )
}

function EditClientContent() {
  const params = useParams()
  const clientId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    let mounted = true
    api.clients
      .getById(clientId)
      .then((detail) => {
        if (!mounted) return
        setClient(detail?.client || (detail as unknown as Client) || null)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [clientId])

  if (loading) {
    return (
      <ContentWrapper narrow>
        <CardSkeleton rows={6} />
      </ContentWrapper>
    )
  }

  if (!client) {
    return (
      <ContentWrapper narrow>
        <Card padding="lg" className="text-center py-12">
          <p className="text-base font-semibold text-text-primary">Client Not Found</p>
          <p className="text-sm text-text-muted mt-1">
            Unable to load this client account for editing.
          </p>
          <Link href="/admin/clients" className="inline-block mt-4">
            <Button variant="primary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Return to Clients
            </Button>
          </Link>
        </Card>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper narrow>
      <PageHeader
        title={`Edit ${client.companyName}`}
        description="Update company contact information, office address, and onboarding notes."
        breadcrumbs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: client.companyName, href: `/admin/clients/${client.id}` },
          { label: 'Edit Details' },
        ]}
        action={
          <Link href={`/admin/clients/${client.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Profile</span>
            </Button>
          </Link>
        }
      />

      <ClientForm mode="edit" initialClient={client} />
    </ContentWrapper>
  )
}

