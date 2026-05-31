import { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Send, ArrowLeft, Lightbulb, FileEdit, Clock, ChevronDown } from 'lucide-react';
import type { Skeleton } from '../../state/appMachine.types';

interface WritingStepProps {
  skeleton: Skeleton;
  initialDraft: string;
  onSubmit: (draft: string) => void;
  onBackToSkeleton: () => void;
}

export function WritingStep({ skeleton, initialDraft, onSubmit, onBackToSkeleton }: WritingStepProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      setWordCount(editor.getText().length);
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(initialDraft || '<p>开始写作…</p>');
    }
  }, [editor, initialDraft]);

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedSections.size === skeleton.sections.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(skeleton.sections.map((_, idx) => idx)));
    }
  };

  const handleSubmit = () => {
    const text = editor?.getText() || '';
    if (text.trim().length < 50) {
      message.warning('初稿至少需要50字，请继续写作');
      return;
    }
    onSubmit(text);
  };

  return (
    <div className="animate-fade-in-up px-4 py-4">
      {/* 文章骨架 - 可折叠 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-800 text-sm">文章骨架</span>
            <span className="text-xs text-slate-400">点击展开引导问题</span>
          </div>
          <button
            onClick={toggleAll}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {expandedSections.size === skeleton.sections.length ? '全部收起' : '全部展开'}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {skeleton.sections.map((section, idx) => (
            <div
              key={idx}
              className={`skeleton-item ${expandedSections.has(idx) ? 'expanded' : ''}`}
            >
              <div
                className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSection(idx)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{section.title}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 expand-icon" />
              </div>
              <div className="guide-content px-5 pb-3">
                <div className="bg-slate-50 rounded-lg p-3 ml-7">
                  <p className="text-xs font-medium text-slate-700 mb-2">引导问题：</p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {section.guidingQuestions.map((q, qIdx) => (
                      <li key={qIdx} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 写作编辑器 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-800 text-sm">写作编辑器</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>自动保存</span>
          </div>
        </div>
        <div className="p-5">
          <EditorContent editor={editor} />
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            <span>{wordCount}</span> 字
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onBackToSkeleton}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回修改骨架
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              提交初稿，请导师审阅
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
