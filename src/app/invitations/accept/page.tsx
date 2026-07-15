import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import InvitationAcceptClient from './InvitationAcceptClient';

export default async function InvitationAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token || typeof token !== 'string') {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center p-8 font-sans">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 text-center space-y-6">
          <div className="inline-flex p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Enlace Inválido</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            El enlace de invitación no es válido.
          </p>
        </div>
      </div>
    );
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    const redirectTarget = `/invitations/accept?token=${encodeURIComponent(token)}`;
    redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-8 font-sans">
      <InvitationAcceptClient token={token} />
    </div>
  );
}
