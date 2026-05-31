import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Card, Spin, Empty, Tag } from 'antd';
import { ArrowLeft, Calendar, FileText, MessageSquare, Layout } from 'lucide-react';
import api from '../../services/api';

const { Title, Text } = Typography;

interface ArticleDetailData {
  id: number;
  title: string;
  content: string;
  bulletPoints: { experience: string; insight: string; question: string };
  skeleton: { title: string; sections: Array<{ title: string; purpose: string; guidingQuestions: string[] }> } | null;
  mentorFeedback: { items: Array<{ quote: string; problemType: string; diagnosis: string; rewrite: string; priority: string }>; summary: string } | null;
  createdAt: string;
}

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/articles/${id}`);
        setArticle(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Spin size="large" tip="加载文章中..." />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Empty description="文章不存在" className="py-20" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/warehouse')}
          className="mb-6 flex items-center gap-2"
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          返回仓库
        </Button>

        {/* Header */}
        <div className="mb-6">
          <Title level={2} className="text-slate-900 mb-2">{article.title}</Title>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-4 h-4" />
            <Text type="secondary">
              创建于 {new Date(article.createdAt).toLocaleString('zh-CN')}
            </Text>
          </div>
        </div>

        {/* Content Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="font-semibold">正文</span>
            </div>
          }
          className="mb-6 rounded-2xl shadow-sm"
        >
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-800">{article.content}</pre>
        </Card>

        {/* Skeleton Card */}
        {article.skeleton && (
          <Card
            title={
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-purple-500" />
                <span className="font-semibold">文章骨架</span>
              </div>
            }
            className="mb-6 rounded-2xl shadow-sm"
          >
            <Text strong className="text-lg text-slate-900">{article.skeleton.title}</Text>
            {article.skeleton.sections.map((s, i) => (
              <div key={i} className="mt-4 p-4 bg-slate-50 rounded-xl">
                <Text strong className="text-slate-800">{s.title}</Text>
                <p className="text-slate-600 text-sm mt-1">{s.purpose}</p>
              </div>
            ))}
          </Card>
        )}

        {/* Mentor Feedback Card */}
        {article.mentorFeedback && (
          <Card
            title={
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold">导师反馈</span>
              </div>
            }
            className="mb-6 rounded-2xl shadow-sm"
          >
            <div className="p-4 bg-emerald-50 rounded-xl mb-4">
              <Text className="text-emerald-800">{article.mentorFeedback.summary}</Text>
            </div>
            {article.mentorFeedback.items.map((item, i) => (
              <div key={i} className="mb-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Tag color={item.priority === 'P0' ? 'red' : item.priority === 'P1' ? 'orange' : 'blue'}>
                    {item.priority}
                  </Tag>
                  <Tag>{item.problemType}</Tag>
                </div>
                <blockquote className="border-l-4 border-slate-300 pl-3 text-slate-600 mb-2 text-sm">
                  {item.quote}
                </blockquote>
                <p className="text-emerald-700 text-sm">{item.rewrite}</p>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
