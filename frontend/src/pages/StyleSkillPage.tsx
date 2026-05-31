import { useState, useEffect } from 'react';
import { Button, message, Spin } from 'antd';
import api from '../services/api';
import { Wand2, Check, Copy, Sparkles, FileCheck, Palette } from 'lucide-react';




interface ArticleSummary {
  id: number;
  title: string;
  createdAt: string;
}

export function StyleSkillPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [stylePrompt, setStylePrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/articles', { params: { page: 1, pageSize: 50 } });
        setArticles(res.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      message.warning('请至少选择1篇文章');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/style-skill/generate', { articleIds: selectedIds });
      setStylePrompt(res.data.stylePrompt || '');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(stylePrompt || '');
    message.success('已复制到剪贴板');
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg-secondary)]">
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">风格 Skill</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                选择历史文章，AI将分析你的写作风格并生成 System Prompt
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Article Selection */}
          <div className="lg:col-span-2 animate-fade-in-up stagger-1">
            <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[var(--brand-600)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">选择分析素材</h2>
                </div>
                <span className="text-sm text-[var(--text-tertiary)]">
                  已选择 {selectedIds.length} 篇
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Spin size="large" tip="加载文章中..." />
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--slate-100)] flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-8 h-8 text-[var(--slate-400)]" />
                  </div>
                  <p className="text-[var(--text-secondary)]">文章仓库中还没有文章，先去创作吧。</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {articles.map((article) => {
                      const isSelected = selectedIds.includes(article.id);
                      return (
                        <div
                          key={article.id}
                          onClick={() => toggleSelection(article.id)}
                          className={`
                            relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                            ${isSelected
                              ? 'border-[var(--brand-500)] bg-[var(--brand-50)] shadow-md'
                              : 'border-[var(--border-light)] bg-white hover:border-[var(--brand-200)] hover:shadow-sm'
                            }
                          `}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--brand-500)] flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <h3 className={`font-medium mb-2 pr-8 ${isSelected ? 'text-[var(--brand-700)]' : 'text-[var(--text-primary)]'}`}>
                            {article.title}
                          </h3>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {new Date(article.createdAt).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={selectedIds.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    生成我的风格 Skill
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right: Result */}
          <div className="animate-fade-in-up stagger-2">
            {stylePrompt ? (
              <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-[var(--brand-600)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">生成结果</h2>
                </div>
                <div className="bg-[var(--slate-800)] rounded-xl p-4 mb-4 overflow-auto max-h-[500px]">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--text-inverse)] leading-relaxed">
                    {stylePrompt}
                  </pre>
                </div>
                <Button
                  type="primary"
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  一键复制
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-[var(--brand-600)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">生成结果</h2>
                </div>
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--slate-100)] flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-[var(--slate-400)]" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    选择文章后点击生成按钮<br />AI将分析你的写作风格
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
