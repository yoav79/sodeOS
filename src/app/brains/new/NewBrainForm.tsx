'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBrainForm() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; description?: string }>({});

  const validate = () => {
    const errors: { name?: string; description?: string } = {};
    if (!name.trim()) {
      errors.name = 'El nombre del cerebro es obligatorio.';
    } else if (name.trim().length > 100) {
      errors.name = 'El nombre del cerebro no puede superar los 100 caracteres.';
    }

    if (description.trim().length > 500) {
      errors.description = 'La descripción no puede superar los 500 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/brains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          visibility,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al crear el cerebro.');
      }

      router.push(`/brains/${data.brain.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión con el servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Nombre del Cerebro <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Cerebro de Operaciones, Finanzas, Onboarding"
          disabled={loading}
          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
            fieldErrors.name ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
          }`}
        />
        {fieldErrors.name && (
          <p className="mt-1.5 text-xs text-red-600 font-semibold">{fieldErrors.name}</p>
        )}
      </div>

      {/* Description Textarea */}
      <div>
        <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Descripción <span className="text-slate-400 font-medium">(Opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe de qué trata este cerebro de conocimiento..."
          disabled={loading}
          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none ${
            fieldErrors.description ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
          }`}
        />
        <div className="flex justify-between items-center mt-1">
          {fieldErrors.description ? (
            <p className="text-xs text-red-600 font-semibold">{fieldErrors.description}</p>
          ) : (
            <span />
          )}
          <span className={`text-[10px] font-bold ${description.length > 500 ? 'text-red-500' : 'text-slate-400'}`}>
            {description.length} / 500
          </span>
        </div>
      </div>

      {/* Visibility Select */}
      <div>
        <label htmlFor="visibility" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Visibilidad
        </label>
        <select
          id="visibility"
          name="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        >
          <option value="private">Privado (solo yo)</option>
          <option value="invited_only">Solo invitados</option>
          <option value="company">Toda la empresa</option>
        </select>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          {visibility === 'private' && 'Solo tú tendrás acceso a ver y editar este cerebro de conocimiento.'}
          {visibility === 'invited_only' && 'Los usuarios deberán ser agregados explícitamente por invitaciones.'}
          {visibility === 'company' && 'Cualquier colaborador registrado en la empresa podrá ver y buscar este cerebro.'}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-6">
        <button
          type="button"
          onClick={() => router.push('/brains')}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creando...</span>
            </>
          ) : (
            <span>Crear Cerebro</span>
          )}
        </button>
      </div>
    </form>
  );
}
