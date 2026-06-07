import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// The dashboard already lists all accessible brains with navigation links.
// Redirecting here avoids duplicating that UI at this stage of development.
// When a dedicated brains management view is needed, this page can be expanded.
export default async function BrainsIndexPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  redirect('/dashboard');
}
