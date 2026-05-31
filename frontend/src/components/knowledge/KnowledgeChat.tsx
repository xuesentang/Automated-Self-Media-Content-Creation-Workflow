import { useState } from 'react';
import { Input, Typography, Spin } from 'antd';
import { Send, User, Bot } from 'lucide-react';
import api from '../../services/api';

const { Text, Paragraph } = Typography;
const { Search } = Input;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; snippet: string; matchType: string }[];
}

export function KnowledgeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (question: string) => {
    if (!question.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await api.post('/knowledge/ask', { question });
      const { answer, sources } = res.data;
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: answer,
        sources,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4" style={{ maxHeight: '60vh' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-tr-sm'
                : 'bg-slate-100 text-slate-800 rounded-tl-sm'
            }`}>
              <Paragraph className="mb-0 whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </Paragraph>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200/50">
                  <Text type="secondary" className="text-xs">
                    参考：{msg.sources.map(s => s.title).join('、')}
                  </Text>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <Spin size="small" tip="思考中…" />
            </div>
          </div>
        )}
      </div>
      <Search
        placeholder="向知识库提问…"
        onSearch={handleAsk}
        loading={loading}
        enterButton={<><Send className="w-4 h-4 inline" /> 提问</>}
        className="rounded-xl"
      />
    </div>
  );
}
