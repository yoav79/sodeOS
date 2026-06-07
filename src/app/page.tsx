import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
