import React from 'react';
import db from '@/lib/db';
import TreeDemoClient from './TreeDemoClient';

export const dynamic = 'force-dynamic';


export default async function TreeDemoPage() {
  // Safe server-side check: retrieve the first available brain
  // This is the least fragile option since it doesn't depend on hardcoded IDs
  // and will dynamically work with whatever is populated by seed.ts.
  const firstBrain = await db.brain.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!firstBrain) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md text-center flex flex-col gap-4 shadow-xl">
          <div className="text-red-500 text-3xl">⚠️</div>
          <h1 className="text-lg font-bold">No se encontraron Cerebros</h1>
          <p className="text-sm text-zinc-400">
            La base de datos local está vacía. Asegúrate de ejecutar el seed de datos usando:
          </p>
          <code className="bg-zinc-950 p-2 rounded text-xs text-zinc-300 border border-zinc-800 font-mono">
            npm run prisma:seed
          </code>
        </div>
      </div>
    );
  }

  return (
    <TreeDemoClient
      brainId={firstBrain.id}
      brainName={firstBrain.name}
    />
  );
}
