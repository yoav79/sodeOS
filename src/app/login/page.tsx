import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginForm from './LoginForm';

function normalizeRedirectPath(value?: string | null): string {
  if (!value) return '/dashboard';
  if (!value.startsWith('/')) return '/dashboard';
  if (value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const currentUser = await getCurrentUser();
  const safeRedirect = normalizeRedirectPath(redirectParam);

  if (currentUser) {
    redirect(safeRedirect);
  }


  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Left Column - Dark Blue Gradient, Brand info (Visible on Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Soft decorative radial gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M6.5 6.5l11 11M17.5 6.5l-11 11" opacity="0.4" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              <circle cx="12" cy="5" r="1.75" fill="currentColor" />
              <circle cx="12" cy="19" r="1.75" fill="currentColor" />
              <circle cx="5" cy="12" r="1.75" fill="currentColor" />
              <circle cx="19" cy="12" r="1.75" fill="currentColor" />
              <circle cx="6.5" cy="6.5" r="1.75" fill="currentColor" />
              <circle cx="17.5" cy="17.5" r="1.75" fill="currentColor" />
              <circle cx="17.5" cy="6.5" r="1.75" fill="currentColor" />
              <circle cx="6.5" cy="17.5" r="1.75" fill="currentColor" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">Cerebro Empresarial</span>
        </div>

        {/* Center content */}
        <div className="space-y-8 relative z-10 max-w-lg my-auto">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              El conocimiento de tu empresa, organizado, vivo y accesible
            </h1>
            <p className="text-lg text-slate-300">
              Centraliza la documentación, procesos y guías de tu organización en una única fuente de verdad estructurada y segura.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg border border-blue-500/20 shrink-0">
                <span className="font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-semibold text-white">Organiza</h4>
                <p className="text-sm text-slate-400">Estructura la información en árboles de nodos con categorías y estados controlados.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg border border-blue-500/20 shrink-0">
                <span className="font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-semibold text-white">Colabora</h4>
                <p className="text-sm text-slate-400">Control de accesos basado en jerarquía de roles (Reader, Editor, Owner) por Brain.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg border border-blue-500/20 shrink-0">
                <span className="font-bold text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-semibold text-white">Vive</h4>
                <p className="text-sm text-slate-400">Historial completo de versiones de cada nodo para auditar y conservar cada cambio.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-xs text-slate-500 relative z-10">
          © {new Date().getFullYear()} Cerebro Empresarial. Todos los derechos reservados.
        </div>
      </div>

      {/* Right Column - Clear Background + LoginForm Card Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Soft background glow decoration */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <LoginForm redirect={safeRedirect} />
      </div>
    </div>
  );
}
