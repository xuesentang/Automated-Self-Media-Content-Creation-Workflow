import { useEffect, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface StreamingPanelProps {
  message: string;
  content: string;
}

export function StreamingPanel({ message, content }: StreamingPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="flex flex-col items-center py-12 animate-fade-in">
      {/* Status Badge */}
      <div className="flex items-center gap-3 mb-8 px-5 py-2.5 rounded-full bg-[var(--brand-50)] border border-[var(--brand-200)]">
        <Loader2 className="w-4 h-4 text-[var(--brand-600)] animate-spin" />
        <span className="text-sm font-medium text-[var(--brand-700)]">{message}</span>
      </div>

      {content ? (
        <div className="w-full max-w-3xl animate-fade-in-up">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand-400)] to-purple-400 rounded-2xl opacity-20 blur-lg" />

            {/* Content Container */}
            <div
              ref={containerRef}
              className="relative bg-[var(--slate-800)] rounded-2xl p-6 max-h-[500px] overflow-y-auto shadow-xl"
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--slate-700)]">
                <Sparkles className="w-4 h-4 text-[var(--brand-400)]" />
                <span className="text-xs font-medium text-[var(--slate-400)] uppercase tracking-wider">
                  AI 实时生成
                </span>
              </div>
              <pre className="font-mono text-sm text-[var(--text-inverse)] leading-relaxed whitespace-pre-wrap break-words">
                {content}
                <span className="inline-block w-2 h-4 bg-[var(--brand-400)] animate-pulse ml-1 align-middle rounded-sm" />
              </pre>
            </div>
          </div>

          <p className="mt-4 text-xs text-[var(--text-tertiary)] text-center">
            AI 正在实时生成，内容将持续更新...
          </p>
        </div>
      ) : (
        <div className="w-full max-w-3xl animate-fade-in">
          <div className="bg-white rounded-2xl border border-[var(--border-light)] p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-50)] flex items-center justify-center mx-auto mb-3">
              <Loader2 className="w-6 h-6 text-[var(--brand-600)] animate-spin" />
            </div>
            <p className="text-[var(--text-secondary)]">正在连接 AI 服务...</p>
          </div>
        </div>
      )}
    </div>
  );
}
