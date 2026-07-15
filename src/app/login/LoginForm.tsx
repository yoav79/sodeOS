'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LoginFormProps {
  redirect?: string;
}

export default function LoginForm({ redirect }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Credenciales inválidas.');
      }

      // Successful login
      router.push(redirect || '/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100 space-y-6 relative z-10">
      <div className="text-center space-y-2">
        <div className="lg:hidden inline-flex p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar Sesión</h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          El conocimiento de tu empresa, organizado, vivo y accesible
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="demo@cerebroempresarial.com"
            disabled={loading}
            className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Contraseña
            </label>
            <span
              className="text-xs text-slate-400 cursor-not-allowed hover:text-slate-500 transition-colors"
              title="No disponible en el MVP"
            >
              ¿Olvidaste tu contraseña?
            </span>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 bg-white border-slate-200 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 select-none cursor-pointer">
            Recordarme
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      <div className="relative flex items-center justify-center my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <span className="relative px-3 bg-white text-xs text-slate-400 uppercase tracking-wider">
          O continuar con
        </span>
      </div>

      <button
        type="button"
        disabled
        className="w-full py-3 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
        title="Inicio de sesión SSO deshabilitado en el MVP"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 10h3l-4 4-4-4h3V8h2v4z" />
        </svg>
        Iniciar sesión con SSO (No disponible)
      </button>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
