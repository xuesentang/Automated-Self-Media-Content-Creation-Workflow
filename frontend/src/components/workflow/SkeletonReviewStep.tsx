import { useState } from 'react';
import { Button, Card, Typography, Modal, Input } from 'antd';
import { CheckCircle, Edit3, ArrowLeft, Layout } from 'lucide-react';
import type { Skeleton, SkeletonSection } from '../../state/appMachine.types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface SkeletonReviewStepProps {
  skeleton: Skeleton;
  onConfirm: () => void;
  onEdit: (skeleton: Skeleton) => void;
  onBack: () => void;
}

export function SkeletonReviewStep({ skeleton, onConfirm, onEdit, onBack }: SkeletonReviewStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(skeleton.title);
  const [editedSections, setEditedSections] = useState<SkeletonSection[]>(
    skeleton.sections.map(s => ({ ...s, guidingQuestions: [...s.guidingQuestions] }))
  );

  const handleOpenEdit = () => {
    setEditedTitle(skeleton.title);
    setEditedSections(skeleton.sections.map(s => ({ ...s, guidingQuestions: [...s.guidingQuestions] })));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const validSections = editedSections.filter(s => s.title.trim() !== '');
    onEdit({ title: editedTitle, sections: validSections });
    setIsEditing(false);
  };

  const updateSectionTitle = (idx: number, value: string) => {
    setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, title: value } : s));
  };

  const updateSectionPurpose = (idx: number, value: string) => {
    setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, purpose: value } : s));
  };

  const updateGuidingQuestion = (secIdx: number, qIdx: number, value: string) => {
    setEditedSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      const newQ = [...s.guidingQuestions];
      newQ[qIdx] = value;
      return { ...s, guidingQuestions: newQ };
    }));
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">审核文章骨架</h2>
        <p className="text-sm text-slate-500">
          确认骨架逻辑是否合理。你可以直接修改，或打回重新填写bullet points。
        </p>
      </div>

      {/* Title Card */}
      <Card className="mb-6 rounded-2xl shadow-sm border-blue-200 bg-blue-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Layout className="w-5 h-5 text-blue-500" />
          <Text strong className="text-blue-700">文章标题</Text>
        </div>
        <Title level={4} className="mb-0 text-slate-900">{skeleton.title}</Title>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {skeleton.sections.map((section, idx) => (
          <Card key={idx} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">
                {idx + 1}
              </span>
              <Text strong className="text-slate-900">{section.title}</Text>
            </div>
            <p className="text-slate-600 text-sm mb-3">{section.purpose}</p>
            <div className="bg-slate-50 rounded-xl p-3">
              <Text type="secondary" className="text-xs font-medium">引导问题：</Text>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {section.guidingQuestions.map((q, qIdx) => (
                  <li key={qIdx} className="text-sm text-slate-600">{q}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button type="primary" size="large" onClick={onConfirm} className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          确认骨架，进入写作
        </Button>
        <Button size="large" onClick={handleOpenEdit} className="flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          修改部分内容
        </Button>
        <Button size="large" danger onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          打回，重新填写
        </Button>
      </div>

      {/* Edit Modal */}
      <Modal
        title="编辑文章骨架"
        open={isEditing}
        onOk={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
        width={720}
        okText="保存修改"
        cancelText="取消"
      >
        <div className="mb-4">
          <Text strong className="text-slate-700">文章标题</Text>
          <Input
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>
        <div className="space-y-4">
          {editedSections.map((section, idx) => (
            <Card key={idx} size="small" className="rounded-xl" title={`段落 ${idx + 1}`}>
              <div className="mb-3">
                <Text type="secondary" className="text-xs">标题</Text>
                <Input
                  value={section.title}
                  onChange={e => updateSectionTitle(idx, e.target.value)}
                  className="mt-1 rounded-lg"
                />
              </div>
              <div className="mb-3">
                <Text type="secondary" className="text-xs">本段解决什么问题</Text>
                <TextArea
                  rows={2}
                  value={section.purpose}
                  onChange={e => updateSectionPurpose(idx, e.target.value)}
                  className="mt-1 rounded-lg"
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">引导问题</Text>
                {section.guidingQuestions.map((q, qIdx) => (
                  <Input
                    key={qIdx}
                    value={q}
                    onChange={e => updateGuidingQuestion(idx, qIdx, e.target.value)}
                    className="mt-1 rounded-lg"
                    placeholder={`引导问题 ${qIdx + 1}`}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  );
}
