import React from 'react';
import TiptapSandbox from '@/components/brain/editor/rich-text/TiptapSandbox';

export const metadata = {
  title: 'Tiptap Sandbox - Dev Only',
};

export default function TiptapDevPage() {
  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Entorno de Desarrollo: Tiptap Sandbox</h1>
          <p className="text-xs text-slate-500 font-medium">
            Esta es una página temporal de prueba aislada para validar el editor interactivo y asegurarse de que
            la carga del editor, estilos, scripts y el proceso de compilación de Next.js funcionan correctamente.
          </p>
        </div>

        <TiptapSandbox />

        <div className="text-[10px] text-slate-400 text-center font-medium mt-4">
          Cerebro Empresarial • Entorno Aislado de Pruebas
        </div>
      </div>
    </div>
  );
}
