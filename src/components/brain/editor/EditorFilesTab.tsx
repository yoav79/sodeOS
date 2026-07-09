'use client';

import React from 'react';
import NodeAttachments from './NodeAttachments';

interface EditorFilesTabProps {
  brainId: string | null;
  nodeId: string | null;
  canEdit: boolean;
}

export default function EditorFilesTab({ brainId, nodeId, canEdit }: EditorFilesTabProps) {
  if (!brainId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-600">Cerebro no disponible</h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-relaxed">
            Selecciona un cerebro para ver sus archivos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NodeAttachments brainId={brainId} nodeId={nodeId} canEdit={canEdit} />
    </div>
  );
}
