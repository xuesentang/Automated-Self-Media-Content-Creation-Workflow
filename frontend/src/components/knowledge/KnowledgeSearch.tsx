import { useState } from 'react';
import { Input, List, Typography, Tag } from 'antd';
import { Search, BookOpen } from 'lucide-react';
import api from '../../services/api';

const { Text, Paragraph } = Typography;
const { Search: AntSearch } = Input;

interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  category: string;
  score: number;
  matchType: string;
  sourceType: string;
}

interface KnowledgeSearchProps {
  onResultClick?: (result: SearchResult) => void;
}

export function KnowledgeSearch({ onResultClick }: KnowledgeSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.post('/knowledge/search', { query, topK: 5 });
      setResults(res.data.results || []);
    } finally {
      setSearching(false);
    }
  };

  const matchTypeColors: Record<string, string> = {
    title: 'blue',
    content: 'green',
    synonym: 'orange',
  };

  return (
    <div>
      <AntSearch
        placeholder="搜索知识库文章…"
        onSearch={handleSearch}
        loading={searching}
        enterButton={<><Search className="w-4 h-4 inline" /> 搜索</>}
        className="rounded-xl"
      />
      <List
        className="mt-4"
        dataSource={results}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer hover:bg-slate-50 rounded-xl transition-colors px-4"
            onClick={() => onResultClick?.(item)}
          >
            <div className="w-full">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <Text strong className="text-slate-900">{item.title}</Text>
                <Tag color={matchTypeColors[item.matchType] || 'default'}>
                  {item.matchType === 'title' ? '标题命中' : item.matchType === 'synonym' ? '同义词' : '正文匹配'}
                </Tag>
                <Tag color={item.sourceType === 'user' ? 'purple' : 'default'}>
                  {item.sourceType === 'user' ? '用户素材' : '系统'}
                </Tag>
              </div>
              <Paragraph ellipsis={{ rows: 2 }} className="text-sm text-slate-600 mt-1 mb-0">
                {item.snippet}
              </Paragraph>
              <Text type="secondary" className="text-xs">{item.source} · {item.category}</Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
