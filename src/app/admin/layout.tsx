import React from 'react';
import { redirect } from 'next/navigation';
import { verifySysadmin, AuthError } from '@/lib/auth';
import Link from 'next/link';
import AdminNavigation from '@/components/admin/AdminNavigation';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // 1. Proteger toda la sección administrativa globalmente
    await verifySysadmin();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login');
    }
    // Redirigir a login para cualquier otro fallo de autenticación
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar de Administración */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Cabecera del Panel Admin */}
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-md">Sode OS</span>
              <span className="text-[10px] text-indigo-600 block font-bold uppercase tracking-wider -mt-1">Console Admin</span>
            </div>
          </div>

          {/* Enlaces de Navegación del Admin */}
          <AdminNavigation />
        </div>

        {/* Footer del Sidebar — Opción de Regresar al Dashboard regular */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs transition shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la App
          </Link>
        </div>
      </aside>

      {/* Contenido Principal de la Consola */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-full p-8 md:p-10">
        {children}
      </main>
    </div>
  );
}
