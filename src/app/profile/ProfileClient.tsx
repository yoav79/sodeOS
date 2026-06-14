'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  company: string | null;
  department: string | null;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileClientProps {
  user: SafeUser;
}

export default function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const router = useRouter();

  // User info state
  const [user, setUser] = useState<SafeUser>(initialUser);

  // Profile Form State
  const [name, setName] = useState(initialUser.name);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl || '');
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [company, setCompany] = useState(initialUser.company || '');
  const [department, setDepartment] = useState(initialUser.department || '');
  const [jobTitle, setJobTitle] = useState(initialUser.jobTitle || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Avatar Image Load Fail State
  const [imageError, setImageError] = useState(false);

  // Initials generator
  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    // Frontend Validations
    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError('El nombre es requerido.');
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setProfileError('El nombre debe tener entre 2 y 80 caracteres.');
      return;
    }

    let trimmedAvatar = avatarUrl.trim();
    if (trimmedAvatar !== '') {
      if (trimmedAvatar.length > 500) {
        setProfileError('El avatarUrl no puede exceder los 500 caracteres.');
        return;
      }
      try {
        const parsedUrl = new URL(trimmedAvatar);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          setProfileError('El avatarUrl debe ser una URL válida (http o https).');
          return;
        }
      } catch {
        setProfileError('El avatarUrl debe ser una URL válida.');
        return;
      }
    } else {
      trimmedAvatar = '';
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone !== '') {
      if (trimmedPhone.length > 32) {
        setProfileError('El teléfono no puede exceder los 32 caracteres.');
        return;
      }
      const phoneRegex = /^[+0-9\s\-()]*$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setProfileError('El teléfono contiene caracteres no válidos (solo números, +, -, (), espacios).');
        return;
      }
    }

    const trimmedCompany = company.trim();
    if (trimmedCompany.length > 100) {
      setProfileError('La empresa no puede exceder los 100 caracteres.');
      return;
    }

    const trimmedDept = department.trim();
    if (trimmedDept.length > 100) {
      setProfileError('El departamento no puede exceder los 100 caracteres.');
      return;
    }

    const trimmedJob = jobTitle.trim();
    if (trimmedJob.length > 100) {
      setProfileError('El cargo no puede exceder los 100 caracteres.');
      return;
    }

    setSavingProfile(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          avatarUrl: trimmedAvatar || null,
          phone: trimmedPhone || null,
          company: trimmedCompany || null,
          department: trimmedDept || null,
          jobTitle: trimmedJob || null,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push('/login');
        router.refresh();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el perfil.');
      }

      setProfileSuccess('¡Perfil actualizado con éxito!');
      setUser(data.user);
      setName(data.user.name);
      setAvatarUrl(data.user.avatarUrl || '');
      setPhone(data.user.phone || '');
      setCompany(data.user.company || '');
      setDepartment(data.user.department || '');
      setJobTitle(data.user.jobTitle || '');
      setImageError(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado.';
      setProfileError(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    // Frontend Validations
    if (!currentPassword) {
      setPasswordError('La contraseña actual es requerida.');
      return;
    }
    if (!newPassword) {
      setPasswordError('La nueva contraseña es requerida.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword.length > 128) {
      setPasswordError('La nueva contraseña no puede exceder los 128 caracteres.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('La nueva contraseña no puede ser igual a la contraseña actual.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación de la contraseña no coincide.');
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        // Safe redirect on session expire
        router.push('/login');
        router.refresh();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña.');
      }

      setPasswordSuccess('¡Contraseña actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado.';
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const formattedDate = new Date(user.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-md">Cerebro</span>
              <span className="text-xs text-slate-400 block font-semibold -mt-1 uppercase tracking-wider">Empresarial</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Configuración de Perfil</h1>
          <p className="text-sm text-slate-500 mt-1">Administra tus datos personales, avatar y seguridad de la cuenta.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Side: Avatar Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vista previa</span>
              
              {/* Avatar Circle */}
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-700 font-extrabold text-3xl shadow-inner shadow-blue-500/5 relative">
                {avatarUrl && !imageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  getInitials(name || user.name)
                )}
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-800 truncate max-w-[200px]">{user.name}</h3>
                <p className="text-xs text-slate-400 truncate max-w-[200px]">{user.email}</p>
              </div>

              <div className="w-full pt-4 border-t border-slate-100 text-left space-y-1 text-xs text-slate-400">
                <span className="block font-semibold uppercase tracking-wider text-[10px]">Miembro desde</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Forms */}
          <div className="md:col-span-2 space-y-8">
            {/* Section 1: Basic Info Form */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Datos de la Cuenta</h2>
                <p className="text-xs text-slate-500 mt-0.5">Actualiza tu información básica de identificación.</p>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                {profileSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {profileSuccess}
                  </div>
                )}
                {profileError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {profileError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Correo Electrónico (Solo Lectura)
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={user.email}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-sm outline-none cursor-not-allowed"
                    title="El correo electrónico no puede ser modificado por seguridad."
                  />
                </div>

                <div>
                  <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Nombre Completo
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={savingProfile}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors"
                    placeholder="Escribe tu nombre"
                  />
                </div>

                <div>
                  <label htmlFor="profile-avatar" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    URL de Avatar (Imagen Externa)
                  </label>
                  <input
                    id="profile-avatar"
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setImageError(false);
                    }}
                    disabled={savingProfile}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                    placeholder="https://ejemplo.com/tu-foto.jpg"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Introduce una URL pública directa a tu imagen (JPEG, PNG o SVG).</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Teléfono de contacto
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={savingProfile}
                      maxLength={32}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-company" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Empresa
                    </label>
                    <input
                      id="profile-company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={savingProfile}
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                      placeholder="Nombre de la empresa"
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-department" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Departamento / Área
                    </label>
                    <input
                      id="profile-department"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={savingProfile}
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                      placeholder="Ej: Operaciones, I+D..."
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-jobtitle" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Cargo o Puesto
                    </label>
                    <input
                      id="profile-jobtitle"
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={savingProfile}
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                      placeholder="Ej: Director, Analista..."
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Change Password Form */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Seguridad</h2>
                <p className="text-xs text-slate-500 mt-0.5">Actualiza tu contraseña periódicamente para mayor seguridad.</p>
              </div>
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                {passwordSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {passwordError}
                  </div>
                )}

                <div>
                  <label htmlFor="current-pass" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    id="current-pass"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={savingPassword}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Nueva Contraseña
                    </label>
                    <input
                      id="new-pass"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={savingPassword}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-pass" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      id="confirm-pass"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={savingPassword}
                      placeholder="Repite la contraseña"
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-900 outline-none transition-colors placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2"
                  >
                    {savingPassword ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Actualizando...
                      </>
                    ) : (
                      'Actualizar Contraseña'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
