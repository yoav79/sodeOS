import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const safeUser = {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    avatarUrl: currentUser.avatarUrl,
    createdAt: currentUser.createdAt.toISOString(),
    updatedAt: currentUser.updatedAt.toISOString(),
  };

  return <ProfileClient user={safeUser} />;
}
