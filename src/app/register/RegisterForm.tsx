'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    const cleanName = name.trim();
    if (!cleanName) {
      setError('El nombre completo es requerido.');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError('El nombre debe tener entre 2 y 80 caracteres.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('El correo electrónico es requerido.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('El formato del correo electrónico es inválido.');
      return;
    }

    if (!password) {
      setError('La contraseña es requerida.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!confirmPassword) {
      setError('La confirmación de la contraseña es requerida.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!accessCode) {
      setError('El código de acceso de registro es requerido.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          confirmPassword,
          accessCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(data.error || 'Datos de registro inválidos.');
        } else if (res.status === 401) {
          throw new Error('El código de acceso de registro es incorrecto.');
        } else if (res.status === 409) {
          throw new Error('El correo electrónico ya está registrado.');
        } else if (res.status === 503) {
          throw new Error('El auto-registro está deshabilitado temporalmente en este servidor.');
        } else {
          throw new Error(data.error || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
        }
      }

      // Success
      setSuccess(true);
      // Clean sensitive inputs from state immediately
      setPassword('');
      setConfirmPassword('');
      setAccessCode('');
      setName('');
      setEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno del servidor al procesar el registro.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 space-y-6 relative z-10 text-center">
        <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">¡Registro Exitoso!</h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
          Cuenta creada con éxito. Inicia sesión y espera a que un propietario te agregue a un cerebro.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10 justify-center items-center"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 space-y-6 relative z-10">
      <div className="text-center space-y-2">
        <div className="lg:hidden inline-flex p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Crear una Cuenta</h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Regístrate usando tu código de acceso corporativo
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Nombre Completo
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan.perez@empresa.com"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mín. 8 caracteres"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Confirmar
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Misma contraseña"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="accessCode" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Código de Acceso
          </label>
          <input
            id="accessCode"
            type="password"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Código corporativo"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Registrarse'
          )}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
