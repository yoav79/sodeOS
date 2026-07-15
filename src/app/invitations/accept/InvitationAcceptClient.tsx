'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InvitationAcceptClientProps {
  token: string;
}

export default function InvitationAcceptClient({ token }: InvitationAcceptClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const acceptCalled = useRef(false);

  useEffect(() => {
    if (acceptCalled.current) return;
    acceptCalled.current = true;

    async function acceptInvitation() {
      try {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            const redirectTarget = `/invitations/accept?token=${encodeURIComponent(token)}`;
            router.push(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
            return;
          }

          if (res.status === 403) {
            setErrorMessage(
              data.error || 'El correo de tu sesión no coincide con el destinatario de la invitación.'
            );
          } else if (res.status === 404) {
            setErrorMessage('La invitación no existe o el enlace no es válido.');
          } else if (res.status === 410) {
            setErrorMessage('La invitación ha expirado.');
          } else if (res.status === 409) {
            setErrorMessage(data.error || 'Conflicto al procesar la aceptación de la invitación.');
          } else {
            setErrorMessage('No se pudo aceptar la invitación. Intenta nuevamente.');
          }
          setStatus('error');
          return;
        }

        // Success
        setStatus('success');
        setTimeout(() => {
          router.push(`/brains/${data.brainId}`);
        }, 1500);

      } catch (err: unknown) {
        console.error('Error accepting invitation:', err);
        setErrorMessage('No se pudo aceptar la invitación. Intenta nuevamente.');
        setStatus('error');
      }
    }

    acceptInvitation();
  }, [token, router]);

  if (status === 'processing') {
    return (
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Procesando invitación</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Espera un momento mientras configuramos tu acceso al cerebro.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 text-center space-y-6">
        <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">¡Invitación Aceptada!</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          ¡Invitación aceptada correctamente! Redirigiendo...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 text-center space-y-6">
      <div className="inline-flex p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Error</h2>
      <p className="text-sm text-red-600 leading-relaxed font-medium">
        {errorMessage}
      </p>
      <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors inline-flex justify-center items-center"
        >
          Ir al Panel Principal
        </Link>
      </div>
    </div>
  );
}
