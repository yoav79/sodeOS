'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { BrainQueryOutputMode, BrainQuerySource } from '@/lib/ai/brain-query/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: BrainQuerySource[];
  warnings?: string[];
  error?: string;
}

interface EditorBrainQueryTabProps {
  brainId: string;
}

export default function EditorBrainQueryTab({ brainId }: EditorBrainQueryTabProps) {
  const [queryText, setQueryText] = useState('');
  const [outputMode, setOutputMode] = useState<BrainQueryOutputMode>('answer');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages or loading state
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async () => {
    const trimmedQuery = queryText.trim();
    if (!trimmedQuery || loading) return;

    // 1. Add user message
    const userMsgId = Math.random().toString(36).substring(7);
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmedQuery,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQueryText('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/brain/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brainId,
          query: trimmedQuery,
          outputMode,
        }),
      });

      const assistantMsgId = Math.random().toString(36).substring(7);

      if (!response.ok) {
        let errorMsg = 'Error en el servidor de IA.';
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          // ignore
        }
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            error: `${response.status} ${response.statusText}: ${errorMsg}`,
          },
        ]);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: data.answer,
            sources: data.sources,
            warnings: data.warnings,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            error: data.error || 'Error desconocido al procesar la consulta.',
          },
        ]);
      }
    } catch (err: unknown) {
      console.error('Error submitting query:', err);
      const errMsg = err instanceof Error ? err.message : 'Error de red al conectar con el servidor.';
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: '',
          error: errMsg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col min-h-0 text-slate-700 bg-slate-50/10">
      {/* Messages area (Scrollable) */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center border border-violet-100/60 shadow-sm">
              <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.913-6.204C19.757 13.682 21 11.97 21 10.023 21 6.697 18.03 4 14.375 4c-2.42 0-4.526 1.183-5.743 2.973A4.5 4.5 0 003.5 11.5c0 1.956.84 3.714 2.188 4.904l-.875 5.096L9.813 15.904z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-700">Consulta del Cerebro</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Haz preguntas de solo lectura sobre todos los documentos y archivos de este espacio de trabajo.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={handleClearChat}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors p-1 hover:bg-slate-100 rounded-md"
              >
                Limpiar historial
              </button>
            </div>
            
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-violet-600 text-white rounded-2xl rounded-tr-xs px-3 py-2 text-xs shadow-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[92%] bg-white text-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs shadow-2xs border border-slate-100 space-y-3 leading-relaxed">
                      {msg.error ? (
                        <div className="text-red-600 flex gap-1.5 items-start">
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <span className="font-bold">Error:</span> {msg.error}
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">{msg.content}</div>
                      )}

                      {/* Warnings */}
                      {msg.warnings && msg.warnings.length > 0 && (
                        <div className="p-2 bg-amber-50/50 border border-amber-100 rounded-lg text-[10px] text-amber-700 space-y-0.5">
                          <span className="font-semibold block">Aviso:</span>
                          {msg.warnings.map((w, idx) => (
                            <p key={idx}>{w}</p>
                          ))}
                        </div>
                      )}

                      {/* Sources list */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Fuentes consultadas:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.sources.map((s, idx) => {
                              const typeLabel = s.type === 'document' ? '📄' : '📎';
                              const nameLabel = s.type === 'attachment_text'
                                ? (s.filename || s.title || 'Archivo')
                                : (s.title || s.filename || 'Documento');
                              const label = `${typeLabel} ${nameLabel}${s.chunkIndex !== undefined ? ` (Parte ${s.chunkIndex})` : ''}`;
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center text-[10px] bg-slate-50 border border-slate-200/50 rounded-md px-1.5 py-0.5 text-slate-500 font-medium"
                                  title={nameLabel}
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-start items-center gap-2 text-slate-400 py-2">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[11px] font-medium text-slate-500">Buscando en el cerebro...</span>
          </div>
        )}
      </div>

      {/* Form area (Fixed Bottom) */}
      <div className="shrink-0 p-4 border-t border-slate-100 bg-white space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pregunta al Cerebro
          </label>
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ej: ¿Cuál es la política para reembolsos de gastos?"
            rows={3}
            disabled={loading}
            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white placeholder-slate-400 disabled:bg-slate-50 resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <select
              value={outputMode}
              onChange={(e) => setOutputMode(e.target.value as BrainQueryOutputMode)}
              disabled={loading}
              className="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-slate-600 font-medium"
            >
              <option value="answer">Respuesta directa</option>
              <option value="summary">Resumen estructurado</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !queryText.trim()}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0 shadow-xs"
          >
            <span>Preguntar</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
