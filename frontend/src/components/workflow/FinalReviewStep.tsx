import { Button, Card } from 'antd';
import { CheckCircle, FileText } from 'lucide-react';

interface FinalReviewStepProps {
  draft: string;
  onConfirm: () => void;
}

export function FinalReviewStep({ draft, onConfirm }: FinalReviewStepProps) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">终审定稿</h2>
        <p className="text-sm text-slate-500">确认文章内容无误后即可定稿</p>
      </div>

      <Card className="rounded-2xl shadow-sm border-slate-200">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <FileText className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-slate-700">最终文稿</span>
        </div>
        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-800">{draft}</pre>
      </Card>

      <div className="mt-6">
        <Button type="primary" size="large" onClick={onConfirm} className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          确认定稿
        </Button>
      </div>
    </div>
  );
}
