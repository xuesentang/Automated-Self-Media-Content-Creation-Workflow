import { useState } from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { Settings, Wand2, Lightbulb } from 'lucide-react';
import type { BulletPoints } from '../../state/appMachine.types';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface InputStepProps {
  bulletPoints: BulletPoints;
  onSubmit: (bulletPoints: BulletPoints) => void;
  onFillExample: () => void;
}

export function InputStep({ bulletPoints, onSubmit, onFillExample }: InputStepProps) {
  const [form] = Form.useForm<BulletPoints>();
  const [styleExpanded, setStyleExpanded] = useState(false);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">开始创作：结构化输入</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          以下字段均为可选，填写任意一项即可基于其内容生成文章骨架。越具体，骨架越精确。
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={bulletPoints}
        onFinish={onSubmit}
        className="space-y-5"
      >
        <Form.Item
          label={<span className="text-sm font-medium text-[var(--text-primary)]">我的实操经历/具体案例</span>}
          name="experience"
        >
          <TextArea
            rows={4}
            placeholder="描述你真实的操作经历，越具体越好。例如：我跟着AI编程工具Cursor用自然语言做了一个博客网站，中间遇到最大的困难是..."
            showCount
            className="rounded-xl"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-medium text-[var(--text-primary)]">我的个人感悟</span>}
          name="insight"
        >
          <TextArea
            rows={4}
            placeholder="你在这个过程中产生的感悟、发现或反思。例如：很多人以为AI编程就是'说一句话就能出完整产品'，实际上..."
            showCount
            className="rounded-xl"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-medium text-[var(--text-primary)]">我的待解疑问</span>}
          name="question"
        >
          <TextArea
            rows={3}
            placeholder="你还没想明白、希望在文章中探讨的问题。例如：如果编程的门槛被AI抹平了，那未来区分好开发者的标准是什么？"
            showCount
            className="rounded-xl"
          />
        </Form.Item>

        {styleExpanded && (
          <Form.Item
            label={<span className="text-sm font-medium text-[var(--text-primary)]">写作风格偏好（可选）</span>}
            name="stylePrompt"
          >
            <TextArea
              rows={4}
              placeholder="描述你期望的文章风格，将同时影响骨架生成和导师审阅。例如：用犀利直接的口吻写作，拒绝温和的过渡语，每句话都要有力度..."
              showCount
              className="rounded-xl"
            />
          </Form.Item>
        )}

        <Form.Item className="pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="primary" htmlType="submit" size="large" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              生成文章骨架
            </Button>
            <Button type="link" onClick={onFillExample} className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              用示例体验
            </Button>
            <Button
              type="link"
              onClick={() => setStyleExpanded(!styleExpanded)}
              className="flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              {styleExpanded ? '收起风格设置' : '写作风格偏好'}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
}
