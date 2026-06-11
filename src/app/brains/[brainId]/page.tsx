import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import BrainEditorClient from '@/components/brain/BrainEditorClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface BrainEditorPageProps {
  params: Promise<{ brainId: string }>;
}

export default async function BrainEditorPage({ params }: BrainEditorPageProps) {
  const { brainId } = await params;

  // 1. Auth — redirect to login if no session
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // 2. Brain existence — 404 if not found
  const brain = await db.brain.findUnique({
    where: { id: brainId },
    select: { id: true, name: true, description: true },
  });

  if (!brain) {
    notFound();
  }

  // 3. Authorization — friendly 403 screen if no membership
  let membership;
  try {
    membership = await verifyBrainAccess(currentUser.id, brain.id, 'reader');
  } catch (err) {
    if (err instanceof AuthError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="max-w-md w-full mx-4 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/50 p-8 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-500 border border-amber-200 rounded-2xl">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Acceso Denegado</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              No tienes permiso para acceder al cerebro <span className="font-semibold text-slate-700">&ldquo;{brain.name}&rdquo;</span>. Contacta al administrador para solicitar acceso.
            </p>
            <Link
              href="/dashboard"
              className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/10"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      );
    }
    // Unexpected error — re-throw
    throw err;
  }

  // 4. Render the shared editor
  return (
    <BrainEditorClient
      brainId={brain.id}
      brainName={brain.name}
      currentUserRole={membership.role}
    />
  );
}
