import { ArticleList } from '../components/warehouse/ArticleList';
import { FileText, Search } from 'lucide-react';

export function WarehousePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg-secondary)]">
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-400)] to-[var(--brand-600)] flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">文章仓库</h1>
              <p className="text-sm text-[var(--text-secondary)]">管理和查看你创作的所有文章</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="animate-fade-in-up stagger-1">
          <ArticleList />
        </div>
      </div>
    </div>
  );
}
