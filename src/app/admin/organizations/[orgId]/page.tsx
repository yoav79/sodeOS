import React from 'react';
import OrganizationDetailClient from './OrganizationDetailClient';

export const dynamic = 'force-dynamic';

interface OrganizationDetailPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { orgId } = await params;
  return <OrganizationDetailClient orgId={orgId} />;
}
