import { useState, useEffect } from 'react';
import { Button, List, Typography, Empty, Alert, Popconfirm } from 'antd';
import { Plus, Trash2, Upload, FileText } from 'lucide-react';
import api from '../../services/api';

const { Text, Paragraph } = Typography;

interface UserArticle {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export function UserArticlesPanel() {
  const [articles, setArticles] = useState<UserArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/knowledge/articles');
      setArticles(res.data || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArticles(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    let failed: string[] = [];

    for (const file of files) {
      try {
        const title = file.name.replace(/\.[^/.]+$/, '');
        const content = await file.text();
        await api.post('/knowledge/articles', { title, content: content.trim() });
      } catch (e: any) {
        failed.push(`${file.name}: ${e.message || '上传失败'}`);
      }
    }

    if (failed.length > 0) {
      setError(failed.join('；'));
    }

    await loadArticles();
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/knowledge/articles/${id}`);
      await loadArticles();
    } catch (e: any) {
      setError(e.message || '删除失败');
    }
  };

  if (loading && articles.length === 0) {
    return (
      <div className="text-center py-12">
        <Text type="secondary">加载中…</Text>
      </div>
    );
  }

  return (
    <div>
      {/* 上传区 */}
      <div className="mb-6">
        <input
          type="file"
          accept=".md,.txt,.markdown"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="knowledge-file-upload"
        />
        <label htmlFor="knowledge-file-upload">
          <div className={uploading
            ? "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer border-blue-300 bg-blue-50 pointer-events-none"
            : "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
          }>
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-blue-400 animate-bounce" />
                <Text className="text-blue-600 font-medium">上传中…</Text>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Plus className="w-6 h-6 text-slate-400" />
                <Text className="text-slate-600 font-medium">点击上传文件</Text>
                <Text type="secondary" className="text-xs">支持 .md / .txt / .markdown，可多选</Text>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          className="mb-4 rounded-xl"
        />
      )}

      {/* 已上传列表 */}
      {articles.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <Empty description="还没有上传任何素材" />
        </div>
      ) : (
        <List
          dataSource={articles}
          renderItem={(item) => (
            <List.Item
              className="rounded-xl hover:bg-slate-50 transition-colors"
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定删除此素材？"
                  description="删除后将无法从知识库中检索到此内容。"
                  onConfirm={() => handleDelete(item.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<Trash2 className="w-4 h-4" />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<span className="font-medium text-slate-900">{item.title}</span>}
                description={
                  <div>
                    <Paragraph ellipsis={{ rows: 2 }} className="text-sm text-slate-600 mb-1">
                      {item.content}
                    </Paragraph>
                    <Text type="secondary" className="text-xs">
                      {new Date(item.created_at).toLocaleString('zh-CN')}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
