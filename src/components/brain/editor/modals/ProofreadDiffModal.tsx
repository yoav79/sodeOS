'use client';

import React, { useEffect } from 'react';
import InlineMarkdownDiff from '../InlineMarkdownDiff';

interface ProofreadDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseText: string;
  compareText: string;
  onApply: () => void;
}

export default function ProofreadDiffModal({
  isOpen,
  onClose,
  baseText,
  compareText,
  onApply,
}: ProofreadDiffModalProps) {
  // Listen for Escape key to close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proofread-modal-title"
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col text-slate-900 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-violet-600 text-lg">✨</span>
            <h3 id="proofread-modal-title" className="text-sm font-bold text-slate-900">
              Revisión de Ortografía y Gramática
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Body (Scrolling Content) */}
        <div className="p-6 overflow-y-auto flex-1">
          <InlineMarkdownDiff
            baseText={baseText}
            compareText={compareText}
            baseLabel="Texto actual"
            compareLabel="Revisión propuesta por la IA"
            sourceType="agentProposal"
            canEdit={false} // Disable internal edit actions
          />
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-xs shadow-violet-500/10 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Aplicar corrección
          </button>
        </div>
      </div>
    </div>
  );
}
