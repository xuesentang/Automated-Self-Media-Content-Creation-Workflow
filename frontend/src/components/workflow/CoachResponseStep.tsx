import { useEffect } from 'react';
import { Button, Card, Typography, Space, Tag, message } from 'antd';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Send, CheckCircle, ArrowLeft, ArrowRight, MessageSquare, AlertTriangle, Lightbulb } from 'lucide-react';
import type { MentorFeedback } from '../../state/appMachine.types';

const { Title, Text } = Typography;

interface CoachResponseStepProps {
  draft: string;
  feedback: MentorFeedback;
  onConfirm: () => void;
  onBackToSkeleton: () => void;
  onBackToWriting: () => void;
  onSubmitRevision: (draft: string) => void;
}

export function CoachResponseStep({
  draft,
  feedback,
  onConfirm,
  onBackToSkeleton,
  onBackToWriting,
  onSubmitRevision,
}: CoachResponseStepProps) {
  const priorityConfig: Record<string, { color: string; bg: string; icon: any }> = {
    P0: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
    P1: { color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
    P2: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Lightbulb },
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(draft || '<p>开始修改…</p>');
    }
  }, [editor, draft]);

  const handleSubmitRevision = () => {
    const text = editor?.getText() || '';
    if (text.trim().length < 50) {
      message.warning('修改后至少需要50字');
      return;
    }
    onSubmitRevision(text);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">导师反馈</h2>
        <p className="text-sm text-slate-500">查看导师建议，对照修改文稿</p>
      </div>

      <div className="flex gap-6">
        {/* Left: Feedback Panel */}
        <div className="w-96 flex-shrink-0 space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">

          {/* Global Summary */}
          <Card size="small" className="rounded-xl bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <Text strong className="text-emerald-800">全局总结</Text>
            </div>
            <Text className="text-sm text-emerald-700">{feedback.summary}</Text>
          </Card>

          {/* Feedback Items */}
          {feedback.items.map((item, idx) => {
            const config = priorityConfig[item.priority] || priorityConfig.P2;
            const Icon = config.icon;
            return (
              <Card key={idx} size="small" className="rounded-xl hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <Tag color={item.priority === 'P0' ? 'red' : item.priority === 'P1' ? 'orange' : 'blue'}>
                    {item.priority}
                  </Tag>
                  <Tag>{item.problemType}</Tag>
                </div>

                <div className="mb-2">
                  <Text type="secondary" className="text-xs">段落引用：</Text>
                  <blockquote className="border-l-4 border-slate-300 pl-3 mt-1 text-slate-600 text-sm bg-slate-50 py-2 rounded-r-lg">
                    {item.quote}
                  </blockquote>
                </div>

                <div className="mb-2">
                  <Text strong className="text-sm text-slate-700">问题诊断：</Text>
                  <p className="text-sm text-slate-600">{item.diagnosis}</p>
                </div>

                <div className="mb-2">
                  <Text strong className="text-sm text-emerald-600">重写建议：</Text>
                  <p className="text-emerald-700 text-sm bg-emerald-50 p-2 rounded-lg mt-1">{item.rewrite}</p>
                </div>

                <div>
                  <Text type="secondary" className="text-xs">为什么更好：{item.whyBetter}</Text>
                </div>
              </Card>
            );
          })}

          {/* Next Step */}
          <Card size="small" className="rounded-xl bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <Text strong className="text-blue-800">下一步建议</Text>
            </div>
            <Text className="text-sm text-blue-700">{feedback.nextStep}</Text>
          </Card>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <Text type="secondary" className="mb-2">对照反馈修改文稿：</Text>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <EditorContent editor={editor} />
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <Space>
              <Button type="primary" onClick={handleSubmitRevision} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                提交修改，重新审阅
              </Button>
              <Button onClick={onConfirm} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                确认，进入终审
              </Button>
              <Button onClick={onBackToSkeleton} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                重审骨架
              </Button>
            </Space>
            <Button type="link" onClick={onBackToWriting} className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              回到写作页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
