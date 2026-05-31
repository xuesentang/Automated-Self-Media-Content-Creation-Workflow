import { Check, Circle, Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
  current: number;
}

const steps = [
  { title: '结构化输入', desc: '输入你的经历和想法' },
  { title: '骨架审核', desc: '确认文章结构' },
  { title: '核心写作', desc: '撰写文章初稿' },
  { title: '导师反馈', desc: '获取AI导师建议' },
  { title: '终审定稿', desc: '最终审核确认' },
  { title: '完成', desc: '保存或发布' },
];

export function ProgressIndicator({ current }: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
        创作流程
      </h3>
      <div className="space-y-6">
        {steps.map((step, idx) => {
          const isCompleted = idx < current;
          const isActive = idx === current;
          const isPending = idx > current;

          return (
            <div
              key={idx}
              className={`
                flex items-start gap-4 transition-all duration-200
                ${isPending ? 'opacity-50' : ''}
              `}
            >
              {/* Step Icon */}
              <div className="relative flex-shrink-0">
                {isCompleted ? (
                  <div className="w-10 h-10 rounded-full bg-[var(--success-500)] flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                ) : isActive ? (
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-600)] flex items-center justify-center animate-pulse-glow">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--slate-200)] flex items-center justify-center">
                    <Circle className="w-4 h-4 text-[var(--slate-400)]" />
                  </div>
                )}
              </div>

              {/* Step Text */}
              <div className="min-w-0 pt-1">
                <p
                  className={`
                    text-base font-semibold leading-tight
                    ${isActive ? 'text-[var(--brand-700)]' : isCompleted ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}
                  `}
                >
                  {step.title}
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
