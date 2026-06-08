import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import NewBrainForm from './NewBrainForm';

export const dynamic = 'force-dynamic';

export default async function NewBrainPage() {
  // Require session
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Visual navigation back link */}
      <div className="w-full max-w-xl mb-4 flex justify-start">
        <Link
          href="/brains"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a mis Cerebros
        </Link>
      </div>

      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-100/50 p-8 sm:p-10">
        {/* Title & Subtitle */}
        <div className="border-b border-slate-100 pb-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Crear un Nuevo Cerebro</h1>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Define el nombre, descripción y nivel de acceso para iniciar tu nuevo espacio de conocimiento jerárquico.
          </p>
        </div>

        {/* Client Form */}
        <NewBrainForm />
      </div>
    </div>
  );
}
