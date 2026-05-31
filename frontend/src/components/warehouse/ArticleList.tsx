import { useEffect, useState } from 'react';
import { Button, Popconfirm, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FileText, Calendar, Trash2, Eye, Sparkles } from 'lucide-react';


interface ArticleSummary {
  id: number;
  title: string;
  createdAt: string;
  bulletPoints: { experience: string; insight: string; question: string };
}

export function ArticleList() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/articles', { params: { page: 1, pageSize: 50 } });
      setArticles(res.data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/articles', { params: { page: 1, pageSize: 50 } });
        if (!cancelled) setArticles(res.data.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: number) => {
    await api.delete(`/articles/${id}`);
    message.success('文章已删除');
    fetchArticles();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" tip="加载文章中..." />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-[var(--slate-100)] flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-[var(--slate-400)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">还没有文章</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">去创作你的第一篇文章吧</p>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/workflow')}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          开始创作
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article, index) => (
        <div
          key={article.id}
          className={`
            group bg-white rounded-2xl border border-[var(--border-light)] p-6
            hover:shadow-lg hover:-translate-y-1 hover:border-[var(--brand-200)]
            transition-all duration-300 cursor-pointer
            animate-fade-in-up
          `}
          style={{ animationDelay: `${index * 0.05}s` }}
          onClick={() => navigate(`/warehouse/${article.id}`)}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[var(--success-50)] text-[var(--success-600)] text-xs font-medium">
                已完成
              </span>
            </div>
            <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
              <Popconfirm
                title="确定删除这篇文章？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(article.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="删除"
                cancelText="取消"
              >
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-[var(--error-50)] hover:text-[var(--error-500)] transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Popconfirm>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--brand-600)] transition-colors">
            {article.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
            {article.bulletPoints?.insight || '暂无摘要'}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.createdAt).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--brand-600)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3.5 h-3.5" />
              查看详情
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
