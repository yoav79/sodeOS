'use client';

import React from 'react';
import EditorAgentTab from './EditorAgentTab';
import EditorBrainQueryTab from './EditorBrainQueryTab';

interface EditorAITabProps {
  brainId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  contentMarkdown: string;
  canApply: boolean;
  isEditing?: boolean;
  onInsertAIProposal?: (proposal: string) => void;
  onReplaceWithAIProposal?: (proposal: string) => void;
  onCompareAIProposal?: (finalMarkdown: string, mode?: 'replace' | 'append') => void;
}

export default function EditorAITab({
  brainId,
  nodeId,
  nodeTitle,
  contentMarkdown,
  canApply,
  isEditing = false,
  onInsertAIProposal,
  onReplaceWithAIProposal,
  onCompareAIProposal,
}: EditorAITabProps) {
  // If user is actively editing and has write permissions, render the full content modifier agent.
  if (isEditing && canApply && nodeId && nodeTitle && brainId) {
    return (
      <EditorAgentTab
        brainId={brainId}
        nodeId={nodeId}
        selectedNodeTitle={nodeTitle}
        contentMarkdown={contentMarkdown}
        canEdit={canApply}
        onInsertAIProposal={onInsertAIProposal}
        onReplaceWithAIProposal={onReplaceWithAIProposal}
        onCompareAIProposal={onCompareAIProposal}
      />
    );
  }

  // Otherwise, if we have a brainId, render the read-only brain query tool.
  if (brainId) {
    return <EditorBrainQueryTab brainId={brainId} />;
  }

  // Empty state if no brainId is available
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
        <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.913-6.204C19.757 13.682 21 11.97 21 10.023 21 6.697 18.03 4 14.375 4c-2.42 0-4.526 1.183-5.743 2.973A4.5 4.5 0 003.5 11.5c0 1.956.84 3.714 2.188 4.904l-.875 5.096L9.813 15.904z" />
        </svg>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-600">Espacio de trabajo no cargado</h3>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-relaxed">
          Por favor, selecciona un cerebro válido para acceder a las herramientas de IA.
        </p>
      </div>
    </div>
  );
}
