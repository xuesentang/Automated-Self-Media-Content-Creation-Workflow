import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from 'antd';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--error-50)] border border-[var(--error-500)]/20">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--error-500)]/10 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-[var(--error-500)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--error-600)]">出错了</p>
          <p className="text-sm text-[var(--error-500)]/80 mt-0.5">{message}</p>
        </div>
        {onRetry && (
          <Button
            type="primary"
            danger
            size="small"
            onClick={onRetry}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            重试
          </Button>
        )}
      </div>
    </div>
  );
}
