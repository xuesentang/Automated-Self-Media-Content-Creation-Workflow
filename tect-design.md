# AI深度创作引擎 MVP 技术实现文档（融合方案）

## 文档说明

本文档融合了三份独立技术方案的最优部分：

| 来源 | 融合内容 |
|------|---------|
| Plan 2 (Claude) | 架构骨架：状态机PRD逻辑、API语义化设计、数据流序列、组件职责定义、目录结构 |
| Plan 1 (DeepSeek) | 后端实现：Agent提示词完整文本、LLM调用封装、SSE路由代码、fetchSSE健壮处理、action函数提取模式 |
| Plan 3 (GLM) | 前端组件：全部TSX代码、usePersistedMachine Hook、知识库closed/open状态管理、通用组件 |

> 技术栈已锁定：React 19 + Vite + TypeScript + XState v5 + Ant Design 5 + Tailwind CSS + TipTap + Axios + FastAPI + SQLite。不讨论选型。

---

## 一、项目目录结构

### 1.1 前端（frontend/）

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── state/
│   │   ├── appMachine.ts         # XState状态机完整定义
│   │   ├── appMachine.types.ts   # context/event TypeScript类型
│   │   └── storage.ts            # localStorage持久化读写
│   ├── hooks/
│   │   └── usePersistedMachine.ts # 状态持久化Hook（来源：Plan 3）
│   ├── services/
│   │   ├── api.ts                # Axios实例（baseURL: '/api'）+ 拦截器
│   │   └── sse.ts                # fetchSSE封装（来源：Plan 1 残行处理）
│   ├── pages/
│   │   ├── WorkflowPage.tsx      # /workflow
│   │   ├── WarehousePage.tsx     # /warehouse
│   │   └── StyleSkillPage.tsx    # /style-skill
│   ├── components/
│   │   ├── workflow/
│   │   │   ├── InputStep.tsx
│   │   │   ├── SkeletonReviewStep.tsx
│   │   │   ├── WritingStep.tsx
│   │   │   ├── CoachResponseStep.tsx
│   │   │   ├── FinalReviewStep.tsx
│   │   │   ├── FormattingStep.tsx
│   │   │   └── CompletedStep.tsx
│   │   ├── knowledge/
│   │   │   ├── KnowledgeDrawer.tsx
│   │   │   ├── KnowledgeSearch.tsx
│   │   │   └── KnowledgeChat.tsx
│   │   ├── warehouse/
│   │   │   ├── ArticleList.tsx
│   │   │   └── ArticleDetail.tsx
│   │   └── common/
│   │       ├── LoadingOverlay.tsx
│   │       ├── ErrorBanner.tsx
│   │       └── ProgressIndicator.tsx
│   └── styles/
│       ├── index.css
│       └── tiptap.css
```

### 1.2 后端（backend/）

```
backend/
├── main.py                    # FastAPI入口 + CORS + 路由注册（来源：Plan 1）
├── config.py                  # 配置常量
├── requirements.txt
├── database.py                # 数据库连接
├── models.py                  # SQLAlchemy ORM模型（来源：Plan 1）
├── schemas.py                 # Pydantic请求模型
├── routers/
│   ├── skeleton.py            # POST /api/skeleton/generate (SSE)
│   ├── mentor.py              # POST /api/mentor/review (SSE)
│   ├── format.py              # POST /api/format/adapt (SSE)
│   ├── knowledge.py           # 知识库搜索 + 提问
│   ├── articles.py            # 文章CRUD
│   └── style_skill.py         # 风格Skill
├── services/
│   ├── llm.py                 # LLM调用封装（来源：Plan 1）
│   ├── knowledge_service.py   # 知识库加载/检索/RAG
│   └── prompt_templates.py    # 全部Agent提示词（来源：Plan 1）
└── data/
    └── app.db                 # SQLite（gitignore）
```

---

## 二、XState 完整状态机

### 2.1 类型定义

```typescript
// src/state/appMachine.types.ts

export interface BulletPoints {
  experience: string;
  insight: string;
  question: string;
}

export interface SkeletonSection {
  title: string;
  purpose: string;
  guidingQuestions: string[];
}

export type Skeleton = {
  title: string;
  sections: SkeletonSection[];
};

export interface MentorFeedbackItem {
  quote: string;
  problemType: string;
  diagnosis: string;
  rewrite: string;
  whyBetter: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface MentorFeedback {
  items: MentorFeedbackItem[];
  summary: string;
  nextStep: string;
}

export interface FormatPreview {
  platform: string;
  title: string;
  content: string;
  notes: string;
}

// 字段融合：Plan 1 的 round/topIssueType + Plan 2 的 feedbackSummary
export interface ProgressEntry {
  round: number;
  timestamp: string;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  topIssueType: string;
  feedbackSummary: string;
}

export interface WorkflowContext {
  bulletPoints: BulletPoints;
  skeleton: Skeleton | null;
  draft: string;  // 纯文本，非HTML。TipTap编辑器仅用于写作态，提交时用editor.getText()提取纯文本
  mentorFeedback: MentorFeedback | null;
  finalArticle: FormatPreview[] | null;
  errorMessage: string | null;
  sseBuffer: string;  // 预留流式渲染展示，MVP未启用（始终为空串）
  progressLog: ProgressEntry[];
  coachRound: number;  // 来源：Plan 3
}

// 来源：Plan 2 命名规范 — 区分不同卡点的CONFIRM
export type WorkflowEvent =
  | { type: 'SUBMIT'; bulletPoints: BulletPoints }
  | { type: 'CONFIRM_SKELETON' }
  | { type: 'EDIT_SKELETON'; skeleton: Skeleton }
  | { type: 'BACK_TO_INPUT' }
  | { type: 'SUBMIT_DRAFT'; draft: string }
  | { type: 'CONFIRM_COACH' }
  | { type: 'BACK_TO_SKELETON' }
  | { type: 'BACK_TO_WRITING' }
  | { type: 'CONFIRM_FINAL' }
  | { type: 'OPEN_KNOWLEDGE' }
  | { type: 'CLOSE_KNOWLEDGE' }
  | { type: 'RETRY' }
  | { type: 'RESET' };
```

### 2.2 状态机代码

```typescript
// src/state/appMachine.ts

import { createMachine, assign } from 'xstate';
import type {
  WorkflowContext, WorkflowEvent, Skeleton,
  MentorFeedback, FormatPreview, ProgressEntry
} from './appMachine.types';

// ════════════════════════════════════
// Action 函数（来源：Plan 1 提取模式）
// ════════════════════════════════════

const clearAll = assign<WorkflowContext>({
  bulletPoints: { experience: '', insight: '', question: '' },
  skeleton: null, draft: '', mentorFeedback: null,
  finalArticle: null, errorMessage: null,
  coachRound: 0, progressLog: [], sseBuffer: '',
});

const clearDraftAndFeedback = assign<WorkflowContext>({
  draft: '', mentorFeedback: null, errorMessage: null,
});

const clearFeedback = assign<WorkflowContext>({
  mentorFeedback: null, errorMessage: null,
});

const clearError = assign<WorkflowContext>({ errorMessage: null });

const logProgress = assign<WorkflowContext>({
  progressLog: ({ context }) => {
    if (!context.mentorFeedback) return context.progressLog;
    const items = context.mentorFeedback.items;
    const entry: ProgressEntry = {
      round: context.coachRound + 1,
      timestamp: new Date().toISOString(),
      p0Count: items.filter(i => i.priority === 'P0').length,
      p1Count: items.filter(i => i.priority === 'P1').length,
      p2Count: items.filter(i => i.priority === 'P2').length,
      topIssueType: items[0]?.problemType ?? '无',
      feedbackSummary: context.mentorFeedback.summary,
    };
    return [...context.progressLog, entry];
  },
  coachRound: ({ context }) => context.coachRound + 1,
});

// ════════════════════════════════════
// Guard
// ════════════════════════════════════

const validateBulletPoints = ({ context }: { context: WorkflowContext }) =>
  context.bulletPoints.experience.length >= 20 &&
  context.bulletPoints.insight.length >= 20 &&
  context.bulletPoints.question.length >= 20;

// ════════════════════════════════════
// 状态机
// ════════════════════════════════════

export const appMachine = createMachine({
  id: 'deepArticleApp',
  types: {} as { context: WorkflowContext; events: WorkflowEvent },
  context: {
    bulletPoints: { experience: '', insight: '', question: '' },
    skeleton: null, draft: '', mentorFeedback: null,
    finalArticle: null, errorMessage: null, sseBuffer: '',
    progressLog: [], coachRound: 0,
  },
  type: 'parallel',

  states: {
    workflow: {
      initial: 'input',
      states: {
        input: {
          on: {
            SUBMIT: {
              target: 'architecting',
              guard: validateBulletPoints,
              actions: assign({
                bulletPoints: ({ event }) => (event as any).bulletPoints,
                errorMessage: null,
              }),
            },
            RETRY: { target: 'architecting', actions: clearError },
            // 注：RETRY不经过validateBulletPoints guard，
            // 实际中只有architecting失败后才可见（此时bulletPoints有效），安全
          },
        },

        architecting: {
          invoke: {
            src: 'generateSkeleton',
            onDone: {
              target: 'skeletonReview',
              actions: assign({
                skeleton: ({ event }) => (event as any).output as Skeleton,
                sseBuffer: '', errorMessage: null,
              }),
            },
            onError: {
              target: 'input',
              actions: assign({
                errorMessage: '骨架生成失败，请重试',
                sseBuffer: '',
              }),
            },
          },
        },

        skeletonReview: {
          on: {
            CONFIRM_SKELETON: { target: 'writing', actions: clearError },
            BACK_TO_INPUT: { target: 'input', actions: clearAll },
            EDIT_SKELETON: {
              actions: assign({
                skeleton: ({ event }) => (event as { skeleton: Skeleton }).skeleton,
              }),
            },
          },
        },

        writing: {
          on: {
            SUBMIT_DRAFT: {
              target: 'coaching',
              actions: assign({
                draft: ({ event }) => (event as { draft: string }).draft,
                errorMessage: null,
              }),
            },
            RETRY: { target: 'coaching', actions: clearFeedback },
            BACK_TO_SKELETON: { target: 'skeletonReview', actions: clearError },
          },
        },

        coaching: {
          invoke: {
            src: 'getMentorFeedback',
            onDone: {
              target: 'coachResponse',
              actions: [
                assign({
                  mentorFeedback: ({ event }) => (event as any).output as MentorFeedback,
                  sseBuffer: '', errorMessage: null,
                }),
                logProgress,
              ],
            },
            onError: {
              target: 'writing',
              actions: assign({
                errorMessage: '导师审阅失败，请重试',
                sseBuffer: '',
              }),
            },
          },
        },

        coachResponse: {
          on: {
            CONFIRM_COACH: { target: 'finalReview', actions: clearError },
            BACK_TO_SKELETON: {
              target: 'skeletonReview',
              actions: clearDraftAndFeedback,
            },
            BACK_TO_WRITING: {
              target: 'writing',
              actions: clearFeedback,
            },
          },
        },

        // 终审即终点，无反回溯
        finalReview: {
          on: {
            CONFIRM_FINAL: { target: 'formatting', actions: clearError },
            RETRY: { target: 'formatting', actions: clearError },
          },
        },

        formatting: {
          invoke: {
            src: 'adaptFormat',
            onDone: {
              target: 'completed',
              actions: assign({
                finalArticle: ({ event }) => (event as any).output as FormatPreview[],
                sseBuffer: '', errorMessage: null,
              }),
            },
            onError: {
              target: 'finalReview',
              actions: assign({
                errorMessage: '格式适配失败，请重试',
                sseBuffer: '',
              }),
            },
          },
        },

        // 注：文章保存由 CompletedStep 组件手动触发（用户点击"保存文章"按钮），
        // 调用 POST /api/articles，不经过状态机 invoke。RESET 在新文章时清空上下文。
        completed: {
          on: { RESET: { target: 'input', actions: clearAll } },
        },
      },
    },

    // 知识库并行状态（KnowledgeDrawer自行管理搜索和结果）
    knowledgeBase: {
      initial: 'closed',
      states: {
        closed: { on: { OPEN_KNOWLEDGE: 'open' } },
        open: {
          on: { CLOSE_KNOWLEDGE: 'closed' },
        },
      },
    },
  },
});

export type AppMachine = typeof appMachine;
```

### 2.3 状态持久化 Hook + Services 注册

```typescript
// src/hooks/usePersistedMachine.ts

import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import type { AppMachine } from '../state/appMachine';
import { fetchSSE } from '../services/sse';
import api from '../services/api';

const STORAGE_KEY = 'deep_article_app_state';

// services 实现在此集中注册，透传给 useMachine
const machineServices = {
  generateSkeleton: ({ context }: any) =>
    fetchSSE('/api/skeleton/generate', context.bulletPoints),
  getMentorFeedback: ({ context }: any) =>
    fetchSSE('/api/mentor/review', {
      draft: context.draft,
      skeleton: context.skeleton,
      // previousFeedback: context.mentorFeedback  // 后续迭代启用多轮去重
    }),
  adaptFormat: ({ context }: any) =>
    fetchSSE('/api/format/adapt', {
      draft: context.draft,
      title: context.skeleton?.title ?? '',
    }),
};
// 注：知识库搜索由 KnowledgeDrawer 组件内部直接调用 api.post('/knowledge/search')，
// 不经过状态机 invoke。状态机只管理 drawer 的 open/closed。

export function usePersistedMachine(machine: AppMachine) {
  const [state, send, actorRef] = useMachine(machine, {
    state: (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : undefined;
      } catch { return undefined; }
    })(),
    services: machineServices,  // ← 关键：注册服务，否则 invoke 运行时抛异常
  });

  useEffect(() => {
    const sub = actorRef.subscribe((snapshot) => {
      try {
        const data = JSON.stringify({
          context: snapshot.context,
          value: snapshot.value,
        });
        // localStorage 约5-10MB限制，超限时提示用户
        if (data.length > 4 * 1024 * 1024) {
          console.warn(`[usePersistedMachine] 状态数据接近存储上限(${(data.length / 1024 / 1024).toFixed(1)}MB)，可能丢失`);
        }
        localStorage.setItem(STORAGE_KEY, data);
      } catch (e) {
        console.error('[usePersistedMachine] localStorage写入失败，状态可能丢失:', e);
      }
    });
    return () => sub.unsubscribe();
  }, [actorRef]);

  const saveSnapshot = () => {
    const s = actorRef.getSnapshot();
    const ts = new Date().toISOString();
    try {
      localStorage.setItem(`${STORAGE_KEY}_snapshot_${ts}`, JSON.stringify({
        context: s.context, value: s.value, timestamp: ts,
      }));
    } catch {}
  };

  return [state, send, saveSnapshot] as const;
}
```

### 2.4 状态转移图

```
[input] ──SUBMIT──▶ [architecting] ──done──▶ [skeletonReview]
     ▲                    │  error                │
     │                    ▼                       │ CONFIRM/EDIT_SKELETON
     │                 [input]                    ▼
     │            (显示ErrorBanner,           [writing] ◀──────────┐
     │             用户点RETRY)                    │                 │
     │                                     SUBMIT_DRAFT    BACK_TO_WRITING
     │                                            │                 │
     │                                            ▼                 │
     │                                     [coaching] ──done──▶ [coachResponse]
     │                                        │  error              │
     │                                        ▼                     │ CONFIRM_COACH
     │                                     [writing]                ▼
     │                                      (可点RETRY)       [finalReview] ◀─────────┐
     │                                                            │ CONFIRM_FINAL      │
     │                                                            ▼                    │
     │                                                       [formatting] ──done──▶ [completed]
     │                                                            │  error              │
     │                                                            ▼                │ RESET
     │                                                       [finalReview] ───────┘ (开始新文章)
     │                                                        (可点RETRY)               │
     └──────────────────────────────────────────────────────────────────────────────────┘

KnowledgeBase (parallel):
  [closed] ◀──OPEN/CLOSE──▶ [open]     (搜索由组件自行管理)

---

## 三、组件树设计

### 3.1 组件职责总览

| 组件 | Props | 触发事件 |
|------|-------|---------|
| **WorkflowPage** | usePersistedMachine | 无 |
| **InputStep** | bulletPoints, onSubmit, onFillExample | SUBMIT（onFillExample填入示例数据后用户可直接提交或修改后提交） |
| **ArchitectingStep** | context | 无（自动，WorkflowPage 中直接用 LoadingOverlay） |
| **SkeletonReviewStep** | skeleton, onConfirm, onEdit, onBack | CONFIRM_SKELETON, EDIT_SKELETON, BACK_TO_INPUT |
| **WritingStep** | skeleton, initialDraft, onSubmit, onBackToSkeleton | SUBMIT_DRAFT（提交时通过 editor.getText() 提取纯文本） |
| **CoachingStep** | context | 无（自动，WorkflowPage 中直接用 LoadingOverlay） |
| **CoachResponseStep** | draft, feedback, onConfirm, onBackToSkeleton, onBackToWriting | CONFIRM_COACH, BACK_TO_SKELETON, BACK_TO_WRITING |
| **FinalReviewStep** | draft, onConfirm | CONFIRM_FINAL（无回溯） |
| **FormattingStep** | platformFormats | 无（completed 状态下展示多平台预览） |
| **CompletedStep** | context, onNewArticle, onGoToWarehouse, onSave | RESET（保存由组件内部调用 api.post） |
| **KnowledgeDrawer** | open, onClose | OPEN_KNOWLEDGE, CLOSE_KNOWLEDGE（搜索由组件自行处理） |
| **ArticleList** | 无（内部管理） | 无（组件内部路由跳转） |
| **ArticleDetail** | 无（从URL读取id） | 无（组件内部路由跳转） |
| **WarehousePage** | 无 | 无 |
| **StyleSkillPage** | 无 | 无 |
| **LoadingOverlay** | message | 无 |
| **ErrorBanner** | message, onRetry | 无 |
| **ProgressIndicator** | current | 无 |

### 3.2 WorkflowPage

```typescript
// src/pages/WorkflowPage.tsx

import { usePersistedMachine } from '../hooks/usePersistedMachine';
import { appMachine } from '../state/appMachine';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { ProgressIndicator } from '../components/common/ProgressIndicator';
import { KnowledgeDrawer } from '../components/knowledge/KnowledgeDrawer';
import { InputStep } from '../components/workflow/InputStep';
import { SkeletonReviewStep } from '../components/workflow/SkeletonReviewStep';
import { WritingStep } from '../components/workflow/WritingStep';
import { CoachResponseStep } from '../components/workflow/CoachResponseStep';
import { FinalReviewStep } from '../components/workflow/FinalReviewStep';
import { FormattingStep } from '../components/workflow/FormattingStep';
import { CompletedStep } from '../components/workflow/CompletedStep';
import { Button } from 'antd';

const STEP_MAP: Record<string, number> = {
  input: 0, architecting: 0,
  skeletonReview: 1,
  writing: 2, coaching: 2,
  coachResponse: 3,
  finalReview: 4,
  formatting: 5,
  completed: 6,
};

export function WorkflowPage() {
  const navigate = useNavigate();
  const [state, send] = usePersistedMachine(appMachine);
  const wf = (state.value as any).workflow as string;
  const kbOpen = (state.value as any).knowledgeBase !== 'closed';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
        <ProgressIndicator current={STEP_MAP[wf] ?? 0} />
        <Button onClick={() => send({ type: 'OPEN_KNOWLEDGE' })}>知识库</Button>
      </div>

      {state.context.errorMessage && (
        <ErrorBanner message={state.context.errorMessage} onRetry={() => send({ type: 'RETRY' })} />
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {wf === 'input' && (
          <InputStep bulletPoints={state.context.bulletPoints}
            onSubmit={(bp) => send({ type: 'SUBMIT', bulletPoints: bp })}
            onFillExample={() => send({
              type: 'SUBMIT',
              bulletPoints: {
                experience: '我跟着AI编程工具Cursor用自然语言做了一个博客网站，整个过程只用了3天。中间遇到最大的困难是AI生成的代码出了bug，但我看不懂代码，只能反复描述问题让AI自己修复。最后发现，把问题拆解成小步骤再描述给AI，比一次性描述完整需求效果好得多。',
                insight: '很多人以为AI编程就是"说一句话就能出完整产品"，实际上AI编程的核心能力不是写代码，而是精确描述问题。谁更会把大问题拆成小问题、把模糊需求翻译成具体指令，谁就能用AI做出更好的产品。编程知识不再是门槛，拆解和沟通能力才是。',
                question: '如果编程的门槛被AI抹平了，那未来区分好开发者和普通开发者的标准是什么？不会写代码但擅长用AI的人，能不能做出比传统程序员更好的产品？',
              },
              } as any)}
          />
        )}
        {wf === 'architecting' && <LoadingOverlay message="AI架构师正在生成文章骨架..." />}
        {wf === 'skeletonReview' && (
          <SkeletonReviewStep skeleton={state.context.skeleton!}
            onConfirm={() => send({ type: 'CONFIRM_SKELETON' })}
            onEdit={(s) => send({ type: 'EDIT_SKELETON', skeleton: s })}
            onBack={() => send({ type: 'BACK_TO_INPUT' })} />
        )}
        {wf === 'writing' && (
          <WritingStep skeleton={state.context.skeleton!}
            initialDraft={state.context.draft}
            onSubmit={(draft) => send({ type: 'SUBMIT_DRAFT', draft })}
            onBackToSkeleton={() => send({ type: 'BACK_TO_SKELETON' })} />
        )}
        {wf === 'coaching' && <LoadingOverlay message="DanKoe导师正在审阅..." />}
        {wf === 'coachResponse' && (
          <CoachResponseStep draft={state.context.draft}
            feedback={state.context.mentorFeedback!}
            onConfirm={() => send({ type: 'CONFIRM_COACH' })}
            onBackToSkeleton={() => send({ type: 'BACK_TO_SKELETON' })}
            onBackToWriting={() => send({ type: 'BACK_TO_WRITING' })} />
        )}
        {wf === 'finalReview' && (
          <FinalReviewStep draft={state.context.draft}
            onConfirm={() => send({ type: 'CONFIRM_FINAL' })} />
        )}
        {wf === 'formatting' && <LoadingOverlay message="正在适配各平台格式..." />}
        {wf === 'completed' && (
          <>
            <FormattingStep platformFormats={state.context.finalArticle} />
            <CompletedStep
              context={state.context}
              onGoToWarehouse={() => navigate('/warehouse')}
              onNewArticle={() => send({ type: 'RESET' })}
              onSave={async () => {
                const res = await api.post('/articles', {
                  title: state.context.skeleton?.title ?? '未命名',
                  content: state.context.draft,
                  bulletPoints: state.context.bulletPoints,
                  skeleton: state.context.skeleton,
                  mentorFeedback: state.context.mentorFeedback,
                  formatPreviews: state.context.finalArticle,
                  progressLog: state.context.progressLog,
                });
                return res.data.id;
              }}
            />
          </>
        )}
      </div>

      <KnowledgeDrawer open={kbOpen}
        onClose={() => send({ type: 'CLOSE_KNOWLEDGE' })} />
    </div>
  );
}
```

### 3.3 完整组件TSX代码

以下为全部组件修正后的实现。修正要点已在各组件前标注。

#### InputStep.tsx

```typescript
import { Form, Input, Button, Typography } from 'antd';
import type { BulletPoints } from '../state/appMachine.types';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface InputStepProps {
  bulletPoints: BulletPoints;
  onSubmit: (bulletPoints: BulletPoints) => void;
  onFillExample: () => void;
}

export function InputStep({ bulletPoints, onSubmit, onFillExample }: InputStepProps) {
  const [form] = Form.useForm<BulletPoints>();

  return (
    <div>
      <Title level={3}>开始创作：结构化输入</Title>
      <Text type="secondary">
        填写以下三个字段，每个至少20字。AI不会替你写，但会基于你的输入生成文章骨架。
      </Text>

      <Form
        form={form}
        layout="vertical"
        initialValues={bulletPoints}
        onFinish={onSubmit}
        className="mt-6"
      >
        <Form.Item
          label="我的实操经历/具体案例"
          name="experience"
          rules={[
            { required: true, message: '请填写实操经历' },
            { min: 20, message: '至少20字，请详细描述你的经历' },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="描述你真实的操作经历，越具体越好。例如：我跟着AI编程工具Cursor用自然语言做了一个博客网站，中间遇到最大的困难是..."
            showCount
            minLength={20}
          />
        </Form.Item>

        <Form.Item
          label="我的反常识洞察"
          name="insight"
          rules={[
            { required: true, message: '请填写反常识洞察' },
            { min: 20, message: '至少20字，请详细阐述你的洞察' },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="你发现的不符合常识的观点或规律。例如：很多人以为AI编程就是'说一句话就能出完整产品'，实际上..."
            showCount
            minLength={20}
          />
        </Form.Item>

        <Form.Item
          label="我的待解疑问"
          name="question"
          rules={[
            { required: true, message: '请填写待解疑问' },
            { min: 20, message: '至少20字，请详细描述你的疑问' },
          ]}
        >
          <TextArea
            rows={3}
            placeholder="你还没想明白、希望在文章中探讨的问题。例如：如果编程的门槛被AI抹平了，那未来区分好开发者的标准是什么？"
            showCount
            minLength={20}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large">
            生成文章骨架
          </Button>
          <Button type="link" onClick={onFillExample} style={{ marginLeft: 12 }}>
            用示例体验
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
```

#### SkeletonReviewStep.tsx

修正：`skeleton.map()` → `skeleton.sections.map()`（Skeleton是对象不是数组）；`section.heading` → `section.title`；`../../types` → `../state/appMachine.types`；显示骨架标题；补全编辑弹窗（Plan 3导入了Modal但未使用）。

```typescript
import { useState } from 'react';
import { Button, Card, Typography, Space, Modal, Input } from 'antd';
import type { Skeleton, SkeletonSection } from '../state/appMachine.types';

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
    onEdit({ title: editedTitle, sections: editedSections });
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
    <div>
      <Title level={3}>审核文章骨架</Title>
      <Text type="secondary">
        确认骨架逻辑是否合理。你可以直接修改，或打回重新填写bullet points。
      </Text>

      <Card className="mt-4 mb-6" style={{ backgroundColor: '#f6f8fa' }}>
        <Title level={4} style={{ marginBottom: 0 }}>{skeleton.title}</Title>
      </Card>

      <div className="space-y-4">
        {skeleton.sections.map((section, idx) => (
          <Card key={idx} title={section.title}>
            <Text type="secondary">{section.purpose}</Text>
            <div className="mt-3">
              <Text strong>引导问题：</Text>
              <ul className="list-disc list-inside mt-1">
                {section.guidingQuestions.map((q, qIdx) => (
                  <li key={qIdx}>{q}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <Space className="mt-6">
        <Button type="primary" onClick={onConfirm}>
          确认骨架，进入写作
        </Button>
        <Button onClick={handleOpenEdit}>
          修改部分内容
        </Button>
        <Button danger onClick={onBack}>
          打回，重新填写bullet points
        </Button>
      </Space>

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
          <Text strong>文章标题</Text>
          <Input
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="space-y-4">
          {editedSections.map((section, idx) => (
            <Card key={idx} size="small" title={`段落 ${idx + 1}`}>
              <div className="mb-3">
                <Text type="secondary">标题</Text>
                <Input
                  value={section.title}
                  onChange={e => updateSectionTitle(idx, e.target.value)}
                />
              </div>
              <div className="mb-3">
                <Text type="secondary">本段解决什么问题</Text>
                <TextArea
                  rows={2}
                  value={section.purpose}
                  onChange={e => updateSectionPurpose(idx, e.target.value)}
                />
              </div>
              <div>
                <Text type="secondary">引导问题</Text>
                {section.guidingQuestions.map((q, qIdx) => (
                  <Input
                    key={qIdx}
                    value={q}
                    onChange={e => updateGuidingQuestion(idx, qIdx, e.target.value)}
                    className="mt-1"
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
```

---

#### WritingStep.tsx

修正：`getHTML()` → `getText()`（纯文本）；`skeleton.map()` → `skeleton.sections.map()`；`section.heading` → `section.title`；`../../types` → `../state/appMachine.types`；移除悬空的 `send()` 调用，替换为 `onBackToSkeleton` prop；`initialDraft` 为纯文本，用 `useEffect` + `setContent` 加载。

```typescript
import { useState, useEffect } from 'react';
import { Button, Card, Typography } from 'antd';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { Skeleton } from '../state/appMachine.types';

const { Title, Text } = Typography;

interface WritingStepProps {
  skeleton: Skeleton;
  initialDraft: string;
  onSubmit: (draft: string) => void;
  onBackToSkeleton: () => void;
}

export function WritingStep({ skeleton, initialDraft, onSubmit, onBackToSkeleton }: WritingStepProps) {
  const [activeSection, setActiveSection] = useState(0);

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
      editor.commands.setContent(initialDraft || '<p>开始写作…</p>');
    }
  }, [editor, initialDraft]);

  const handleSubmit = () => {
    const text = editor?.getText() || '';
    onSubmit(text);
  };

  return (
    <div className="flex gap-6">
      {/* 左侧：引导问题侧边栏 */}
      <div className="w-80 flex-shrink-0">
        <Title level={4}>文章骨架</Title>
        {skeleton.sections.map((section, idx) => (
          <Card
            key={idx}
            size="small"
            className={`mb-3 cursor-pointer ${activeSection === idx ? 'border-blue-500' : ''}`}
            onClick={() => setActiveSection(idx)}
          >
            <Text strong>{section.title}</Text>
            <div className="mt-2">
              <Text type="secondary" className="text-xs">引导问题：</Text>
              <ul className="list-disc list-inside mt-1">
                {section.guidingQuestions.map((q, qIdx) => (
                  <li key={qIdx} className="text-sm text-gray-600">{q}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {/* 右侧：TipTap编辑器 */}
      <div className="flex-1">
        <div className="bg-white border rounded-lg">
          <EditorContent editor={editor} />
        </div>
        <div className="mt-4 flex justify-between">
          <Button onClick={onBackToSkeleton}>返回修改骨架</Button>
          <Button type="primary" onClick={handleSubmit}>
            提交初稿，请导师审阅
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

#### CoachResponseStep.tsx

修正：`../../types` → `../state/appMachine.types`；`feedback.globalSummary` → `feedback.summary`（字符串，不是数组）；`item.paragraphQuote` → `item.quote`；`item.issueType` → `item.problemType`；`feedback.nextStepSuggestion` → `feedback.nextStep`。

```typescript
import { Button, Card, Typography, Space, Tag } from 'antd';
import type { MentorFeedback } from '../state/appMachine.types';

const { Title, Text } = Typography;

interface CoachResponseStepProps {
  draft: string;
  feedback: MentorFeedback;
  onConfirm: () => void;
  onBackToSkeleton: () => void;
  onBackToWriting: () => void;
}

export function CoachResponseStep({
  draft,
  feedback,
  onConfirm,
  onBackToSkeleton,
  onBackToWriting,
}: CoachResponseStepProps) {
  const priorityColor: Record<string, string> = {
    P0: 'red',
    P1: 'orange',
    P2: 'blue',
  };

  return (
    <div>
      <Title level={3}>导师反馈</Title>

      {/* 我的初稿（可折叠） */}
      <Card
        title="我的初稿"
        className="mb-4"
        extra={<Button type="link" size="small" onClick={() => {
          const el = document.getElementById('draft-content');
          if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }}>展开/收起</Button>}
      >
        <pre
          id="draft-content"
          className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto"
          style={{ display: 'none' }}
        >
          {draft}
        </pre>
      </Card>

      {/* 全局总结 */}
      <Card className="mb-4" title="全局总结">
        <Text>{feedback.summary}</Text>
      </Card>

      {/* 逐段反馈 */}
      <div className="space-y-4">
        {feedback.items.map((item, idx) => (
          <Card key={idx}>
            <div className="flex items-center gap-2 mb-2">
              <Tag color={priorityColor[item.priority]}>{item.priority}</Tag>
              <Tag>{item.problemType}</Tag>
            </div>

            <div className="mb-3">
              <Text type="secondary">段落引用：</Text>
              <blockquote className="border-l-4 border-gray-300 pl-3 mt-1 text-gray-600">
                {item.quote}
              </blockquote>
            </div>

            <div className="mb-3">
              <Text strong>问题诊断：</Text>
              <p>{item.diagnosis}</p>
            </div>

            <div className="mb-3">
              <Text strong type="success">重写建议：</Text>
              <p className="text-green-700">{item.rewrite}</p>
            </div>

            <div>
              <Text type="secondary">为什么更好：{item.whyBetter}</Text>
            </div>
          </Card>
        ))}
      </div>

      {/* 下一步建议 */}
      <Card className="mt-4" title="下一步建议">
        <Text>{feedback.nextStep}</Text>
      </Card>

      {/* 操作按钮 */}
      <Space className="mt-6">
        <Button type="primary" onClick={onConfirm}>
          确认，进入终审
        </Button>
        <Button onClick={onBackToWriting}>
          修改文稿
        </Button>
        <Button onClick={onBackToSkeleton}>
          重审骨架
        </Button>
      </Space>
    </div>
  );
}
```

---

#### FinalReviewStep.tsx

修正：移除 `onBackToWriting` prop（终审无反回溯 — PRD规定 `finalReview` 只能 `CONFIRM_FINAL` → `formatting`）；`dangerouslySetInnerHTML` → 纯文本 `<pre>` 展示（draft 已是纯文本）。

```typescript
import { Button, Card, Typography } from 'antd';

const { Title, Text } = Typography;

interface FinalReviewStepProps {
  draft: string;
  onConfirm: () => void;
}

export function FinalReviewStep({ draft, onConfirm }: FinalReviewStepProps) {
  return (
    <div>
      <Title level={3}>终审定稿</Title>
      <Text type="secondary" className="mb-4">
        确认文章内容无误。定稿后将自动适配各平台格式。
      </Text>
      <Card className="mt-4">
        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{draft}</pre>
      </Card>
      <div className="mt-6">
        <Button type="primary" size="large" onClick={onConfirm}>
          确认定稿，开始格式适配
        </Button>
      </div>
    </div>
  );
}
```

---

#### FormattingStep.tsx

修正：`PlatformFormat` → `FormatPreview`；`../../types` → `../state/appMachine.types`；4平台 → 2平台（MVP仅微信公众号+知乎）；删除多余的 `platformNames` 映射（API 直接返回中文平台名）；`isLoading` 分支由 WorkflowPage 的 `formatting` 状态处理，组件内移除；移除未使用的 `Button` 导入。

```typescript
import { Tabs, Card, Typography } from 'antd';
import type { FormatPreview } from '../state/appMachine.types';

const { Title } = Typography;

interface FormattingStepProps {
  platformFormats: FormatPreview[] | null;
}

export function FormattingStep({ platformFormats }: FormattingStepProps) {
  if (!platformFormats) return null;

  return (
    <div className="mb-8">
      <Title level={3}>平台格式预览</Title>
      <Tabs
        items={platformFormats.map((fmt) => ({
          key: fmt.platform,
          label: fmt.platform,
          children: (
            <div>
              <Card title={fmt.title}>
                <div dangerouslySetInnerHTML={{ __html: fmt.content }} />
              </Card>
              <p className="mt-2 text-gray-500 text-sm">{fmt.notes}</p>
            </div>
          ),
        }))}
      />
    </div>
  );
}
```

---

#### CompletedStep.tsx

修正：`onReset` → `onNewArticle`；新增 `onSave` 和 `context` props；添加保存按钮（手动触发 `api.post('/articles', ...)`）；展示导师反馈摘要。

```typescript
import { useState } from 'react';
import { Button, Result, Typography, message } from 'antd';
import type { WorkflowContext as AppContext } from '../state/appMachine.types';

const { Paragraph } = Typography;

interface CompletedStepProps {
  context: AppContext;
  onNewArticle: () => void;
  onGoToWarehouse: () => void;
  onSave: () => Promise<void>;
}

export function CompletedStep({ context, onNewArticle, onGoToWarehouse, onSave }: CompletedStepProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      message.success('文章已保存到仓库');
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Result
      status="success"
      title="文章创作完成！"
      subTitle={
        <div>
          <Paragraph>你的文章已完成格式适配。保存后可在文章仓库中随时查阅。</Paragraph>
          {context.mentorFeedback && (
            <div className="text-left mt-4 p-4 bg-gray-50 rounded">
              <strong>导师反馈摘要：</strong>
              <p className="mt-1 text-sm text-gray-600">{context.mentorFeedback.nextStep}</p>
            </div>
          )}
        </div>
      }
      extra={[
        <Button type="primary" key="save" onClick={handleSave} loading={saving}>
          保存文章到仓库
        </Button>,
        <Button key="warehouse" onClick={onGoToWarehouse}>
          前往文章仓库
        </Button>,
        <Button key="again" onClick={onNewArticle}>
          开始新文章
        </Button>,
      ]}
    />
  );
}
```

---

#### KnowledgeDrawer.tsx / KnowledgeSearch.tsx / KnowledgeChat.tsx

修正：`../../types` → `../state/appMachine.types`；搜索状态/聊天历史移入组件内部自行管理（不通过 props 传入）；KnowledgeSearch 和 KnowledgeChat 为独立内部组件；import api 直接调用后端接口。

```typescript
// KnowledgeSearch.tsx
import { useState } from 'react';
import { Input, List, Typography, Tag } from 'antd';
import api from '../../services/api';

const { Text, Paragraph } = Typography;
const { Search } = Input;

interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  category: string;
  score: number;
  matchType: string;
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
      <Search
        placeholder="搜索知识库文章…"
        onSearch={handleSearch}
        loading={searching}
        enterButton
      />
      <List
        className="mt-4"
        dataSource={results}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => onResultClick?.(item)}
          >
            <div>
              <div className="flex items-center gap-2">
                <Text strong>{item.title}</Text>
                <Tag color={matchTypeColors[item.matchType] || 'default'}>
                  {item.matchType === 'title' ? '标题命中' : item.matchType === 'synonym' ? '同义词' : '正文匹配'}
                </Tag>
              </div>
              <Paragraph ellipsis={{ rows: 2 }} className="text-sm text-gray-600 mt-1 mb-0">
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
```

```typescript
// KnowledgeChat.tsx
import { useState } from 'react';
import { Input, Typography, List, Spin } from 'antd';
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
    <div>
      <div className="mb-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block p-3 rounded-lg max-w-[85%] ${
              msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              <Paragraph className="mb-0 whitespace-pre-wrap">{msg.content}</Paragraph>
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-1 text-left">
                <Text type="secondary" className="text-xs">
                  参考：{msg.sources.map(s => s.title).join('、')}
                </Text>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-center py-4">
            <Spin tip="思考中…" />
          </div>
        )}
      </div>
      <Search
        placeholder="向知识库提问…"
        onSearch={handleAsk}
        loading={loading}
        enterButton="提问"
      />
    </div>
  );
}
```

```typescript
// KnowledgeDrawer.tsx
import { Drawer, Tabs } from 'antd';
import { KnowledgeSearch } from './KnowledgeSearch';
import { KnowledgeChat } from './KnowledgeChat';

interface KnowledgeDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function KnowledgeDrawer({ open, onClose }: KnowledgeDrawerProps) {
  return (
    <Drawer
      title="知识库"
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Tabs
        items={[
          {
            key: 'search',
            label: '搜索',
            children: <KnowledgeSearch />,
          },
          {
            key: 'chat',
            label: '问答',
            children: <KnowledgeChat />,
          },
        ]}
      />
    </Drawer>
  );
}
```

---

#### LoadingOverlay.tsx / ErrorBanner.tsx / ProgressIndicator.tsx

无需修正，Plan 3 代码无误。

```typescript
// LoadingOverlay.tsx
import { Spin, Typography } from 'antd';

const { Text } = Typography;

interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Spin size="large" />
      <Text className="mt-4">{message}</Text>
    </div>
  );
}
```

```typescript
// ErrorBanner.tsx
import { Alert, Button } from 'antd';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <Alert
      message={message}
      type="error"
      showIcon
      action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined}
      className="mx-6 mt-4"
    />
  );
}
```

```typescript
// ProgressIndicator.tsx
import { Steps } from 'antd';

interface ProgressIndicatorProps {
  current: number;
}

const steps = [
  { title: '结构化输入' },
  { title: '骨架审核' },
  { title: '核心写作' },
  { title: '导师反馈' },
  { title: '终审定稿' },
  { title: '格式适配' },
  { title: '完成' },
];

export function ProgressIndicator({ current }: ProgressIndicatorProps) {
  return <Steps current={current} items={steps} className="max-w-2xl" />;
}
```

---

## 四、前后端 API 接口定义

### 4.1 统一响应格式

非SSE：`{ "code": 0, "message": "ok", "data": {} }`
错误码：0=成功, 400=参数错误, 500=服务端错误, 1001=字数不足, 1002=文章不存在

### 4.2 SSE 接口格式（三接口统一）

所有SSE接口（骨架生成、导师审阅、格式适配）使用同一格式：

**后端 → 前端**：`data: {json}\n\n` 流，两种 chunk 类型

| type | 附带字段 | 说明 |
|------|---------|------|
| `chunk` | `{content: "..."}` | 文本片段，前端拼接后实时展示 |
| `done` | `{}` | 流结束，前端将拼接文本 JSON.parse 为目标对象 |
| `error` | `{message: "..."}` | 异常中断 |

**为什么是这个方案**：原始文本流 + 前端拼接 parse，前后端各司其职——后端只管流式输出，前端负责解析和组装。比语义化 chunk（每种类型不同结构）简单，10 天排期下出错少。

#### POST /api/skeleton/generate

Request: `{ "experience": ">=20字", "insight": ">=20字", "question": ">=20字" }`

后端流式输出骨架 JSON 文本，前端拼接后 `JSON.parse` 得到：
```json
{
  "title": "文章标题",
  "sections": [
    { "title": "## H2标题", "purpose": "...", "guidingQuestions": ["..."] }
  ]
}
```

#### POST /api/mentor/review

Request: `{ "draft": "...", "skeleton": { "title": "...", "sections": [...] } }`

后端流式输出反馈 JSON 文本，前端拼接后 `JSON.parse` 得到：
```json
{
  "items": [
    { "quote": "...", "problemType": "...", "diagnosis": "...", "rewrite": "...", "whyBetter": "...", "priority": "P0" }
  ],
  "summary": "3句话全局总结",
  "nextStep": "下一步建议"
}
```

#### POST /api/format/adapt

Request: `{ "draft": "...", "title": "..." }`

MVP 适配平台：**微信公众号 + 知乎**（2个，后续可扩展）。

后端流式输出格式 JSON 文本，前端拼接后 `JSON.parse` 得到：
```json
[
  { "platform": "微信公众号", "title": "...", "content": "...", "notes": "..." },
  { "platform": "知乎", "title": "...", "content": "...", "notes": "..." }
]
```

#### 普通接口

```
POST /api/knowledge/search
  Request:  { "query": "...", "topK": 5 }
  Response: { "results": [{ "title", "snippet", "source", "category", "score", "matchType" }] }
  matchType: "title"(标题命中) | "content"(正文匹配) | "synonym"(同义词扩展)

POST /api/knowledge/ask
  Request:  { "question": "..." }
  Response: { "answer": "...", "sources": [{ "title", "snippet", "matchType" }] }

POST /api/articles
  Request:  { "title", "content"(纯文本), "bulletPoints", "skeleton", "mentorFeedback", "formatPreviews", "progressLog" }
  Response: { "id": 1 }
GET  /api/articles?page=&pageSize=               → { items, total }
GET  /api/articles/{id}                          → 完整Article
DELETE /api/articles/{id}                        → { "code": 0, "message": "删除成功" }
POST /api/style-skill/generate → { articleIds }  → { stylePrompt }
```

---

## 五、前端服务层

### 5.1 Axios 实例

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => {
    if (res.data.code !== 0) {
      return Promise.reject(new Error(res.data.message || '请求失败'));
    }
    return res.data;  // 直接返回 data 字段，省去每次 res.data.data
  },
  (err) => Promise.reject(err),
);

export default api;
```

> **路径约定**：`api.ts` 的 `baseURL` 设为 `/api`，所以 `api.post('/knowledge/search')` 实际请求 `/api/knowledge/search`。`fetchSSE` 使用原生 `fetch`，需写完整路径 `/api/xxx`。

---

## 六、SSE 前端封装

MVP采用方案：**后端发原始文本流 `{'type':'chunk','content':chunk}` + `{'type':'done'}`，fetchSSE 内部拼接完整 JSON 后 parse 为目标类型返回**。这个方案最简单，前后端各司其职——后端只管流式输出文本，前端负责组装和解析。

```typescript
// src/services/sse.ts

/**
 * 通用SSE调用。
 * 后端发送 {'type':'chunk','content':'...'} 流式文本 + {'type':'done'} 结束。
 * 此函数收集所有chunk内容，拼接后 JSON.parse 为目标类型 T。
 * onChunk 回调用于实时更新 UI（如骨架逐段展示）。
 */
export async function fetchSSE<T>(
  path: string,
  body: Record<string, unknown>,
  onChunk?: (text: string) => void,
  timeoutMs: number = 120_000,
): Promise<T> {
  const controller = new AbortController();
  const connectionTimeout = setTimeout(() => controller.abort(), 30_000);

  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(connectionTimeout);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error('Response body is null');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let chunkTimer: ReturnType<typeof setTimeout> | null = null;

  const resetChunkTimer = () => {
    if (chunkTimer) clearTimeout(chunkTimer);
    chunkTimer = setTimeout(() => controller.abort(), timeoutMs);
  };

  while (true) {
    resetChunkTimer();
    const { done, value } = await reader.read();
    if (done) { clearTimeout(chunkTimer!); break; }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // 保留不完整行

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;
      try {
        const chunk = JSON.parse(jsonStr);
        if (chunk.type === 'done') { clearTimeout(chunkTimer!); continue; }
        if (chunk.type === 'error') { clearTimeout(chunkTimer!); throw new Error(chunk.message || 'SSE error'); }
        if (chunk.content) {
          fullText += chunk.content;
          onChunk?.(chunk.content); // 实时回调，给UI做流式渲染
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // 非JSON行忽略
        clearTimeout(chunkTimer!);
        throw e;
      }
    }
  }

  // 拼接完成后解析为目标类型
  try {
    return JSON.parse(fullText) as T;
  } catch {
    // LLM可能输出包裹了markdown代码块或额外文本的JSON，尝试提取
    const extracted = extractJSON(fullText);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch { /* 提取后仍无法解析，继续抛原错误 */ }
    }
    throw new Error(`AI返回了无效的JSON格式，请重试。原始文本前100字符：${fullText.slice(0, 100)}`);
  }
}

/**
 * 从LLM的原始输出中提取JSON。
 * 处理两种情况：
 * 1. markdown代码块包裹：```json ... ``` 或 ``` ... ```
 * 2. JSON前后有额外文本：从第一个 { 或 [ 开始匹配
 * 返回提取到的纯JSON字符串，失败返回null。
 */
function extractJSON(text: string): string | null {
  // 优先匹配markdown代码块
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // 回退：匹配最外层完整JSON（第一个 { 到对应的 }，或 [ 到 ]）
  const firstBrace  = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let start = -1;
  let isObject = true;

  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBrace === -1) { start = firstBracket; isObject = false; }
  else if (firstBracket === -1) { start = firstBrace; isObject = true; }
  else { start = Math.min(firstBrace, firstBracket); isObject = start === firstBrace; }

  const openChar  = isObject ? '{' : '[';
  const closeChar = isObject ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) { depth--; if (depth === 0) return text.slice(start, i + 1).trim(); }
  }

  return null;
}
```

---

## 七、数据流设计

### 7.1 各卡点序列（来源：Plan 2）

**卡点1 → 架构师**：填写 → Form rules → send SUBMIT → guard → architecting → fetchSSE → section chunk → onDone → skeletonReview

**卡点2 → 写作**：渲染骨架 → CONFIRM_SKELETON/EDIT_SKELETON/BACK_TO_INPUT → writing → TipTap → SUBMIT_DRAFT → coaching

**导师 → 卡点3**：fetchSSE({draft, skeleton, previousFeedback}) → feedback/summary/nextAction chunk → onDone → logProgress → coachResponse → CONFIRM_COACH/BACK_TO_SKELETON/BACK_TO_WRITING

**终审 → 完成**：CONFIRM_FINAL → formatting → platform chunk → onDone → completed → 用户查看格式预览 → 点击"保存文章"（组件调用 POST /api/articles）→ 文章存入仓库 → 点击"开始新文章"（RESET）或"去仓库查看"

### 7.2 多轮审视去重（后续迭代）

`previousFeedback` 是 Plan 2 的亮点设计——多轮审视时将前一轮反馈传给导师 Agent 避免重复评价。MVP 阶段标注为后续迭代，届时升级：
- `WorkflowEvent` 增加 `previousFeedback` 字段
- `machineServices.getMentorFeedback` 已预留注释行，去掉注释即可启用。无需改状态机结构。

### 7.3 错误处理

| 错误 | 策略 |
|------|------|
| 字数不足 | guard+Form rules 双重拦截 |
| AI调用失败 | onError → 回退上一步 + ErrorBanner |
| SSE中断 | fetch超时 → onError |
| 网络断开 | 保留context + 提示 |
| 页面刷新 | usePersistedMachine恢复 |

---

## 八、后端实现（来源：Plan 1）

### 8.1 LLM调用

```python
# backend/services/llm.py
from openai import AsyncOpenAI
from config import DEEPSEEK_API_KEY, LLM_BASE_URL, LLM_MODEL

client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=LLM_BASE_URL)

async def stream_llm(system_prompt: str, user_message: str):
    stream = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role":"system","content":system_prompt},{"role":"user","content":user_message}],
        stream=True, temperature=0.7,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta: yield delta

async def call_llm(system_prompt: str, user_message: str) -> str:
    response = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role":"system","content":system_prompt},{"role":"user","content":user_message}],
        temperature=0.7,
    )
    return response.choices[0].message.content
```

### 8.2 请求模型（Pydantic Schema）

```python
# backend/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional

class BulletPointsRequest(BaseModel):
    experience: str = Field(..., min_length=20, description="我的实操经历/具体案例")
    insight: str = Field(..., min_length=20, description="我的反常识洞察")
    question: str = Field(..., min_length=20, description="我的待解疑问")

class SkeletonSectionInput(BaseModel):
    title: str
    purpose: str
    guidingQuestions: List[str]

class SkeletonInput(BaseModel):
    title: str
    sections: List[SkeletonSectionInput]

class MentorReviewRequest(BaseModel):
    draft: str = Field(..., min_length=1, description="纯文本初稿")
    skeleton: SkeletonInput

class FormatAdaptRequest(BaseModel):
    draft: str = Field(..., min_length=1, description="纯文本终稿")
    title: str

class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    topK: int = Field(default=5, ge=1, le=20)

class KnowledgeAskRequest(BaseModel):
    question: str = Field(..., min_length=1)

class ArticleCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str  # 纯文本初稿
    bulletPoints: dict
    skeleton: Optional[dict] = None
    mentorFeedback: Optional[dict] = None
    formatPreviews: Optional[List[dict]] = None
    progressLog: Optional[List[dict]] = None

class StyleSkillRequest(BaseModel):
    articleIds: List[int] = Field(..., min_length=1)
```

### 8.3 SSE路由

三接口结构一致，以骨架生成为例，导师审阅和格式适配结构相同。

```python
# backend/routers/skeleton.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.llm import stream_llm
from services.prompt_templates import ARCHITECT_PROMPT
from schemas import BulletPointsRequest
import json

router = APIRouter(prefix="/api/skeleton", tags=["skeleton"])

@router.post("/generate")
async def generate_skeleton(req: BulletPointsRequest):
    user_message = f"要点：{req.experience}\n洞察：{req.insight}\n疑问：{req.question}"

    async def event_stream():
        try:
            async for chunk in stream_llm(ARCHITECT_PROMPT, user_message):
                yield f"data: {json.dumps({'type':'chunk','content':chunk},ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type':'done'},ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','message':str(e)},ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
        headers={"Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"})
```

```python
# backend/routers/mentor.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.llm import stream_llm
from services.prompt_templates import MENTOR_PROMPT
from schemas import MentorReviewRequest
import json

router = APIRouter(prefix="/api/mentor", tags=["mentor"])

@router.post("/review")
async def review_draft(req: MentorReviewRequest):
    user_message = f"文章骨架：\n{json.dumps(req.skeleton.model_dump(), ensure_ascii=False)}\n\n文章初稿：\n{req.draft}"

    async def event_stream():
        try:
            async for chunk in stream_llm(MENTOR_PROMPT, user_message):
                yield f"data: {json.dumps({'type':'chunk','content':chunk},ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type':'done'},ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','message':str(e)},ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
        headers={"Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"})
```

```python
# backend/routers/format.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.llm import stream_llm
from services.prompt_templates import FORMAT_PROMPT
from schemas import FormatAdaptRequest
import json

router = APIRouter(prefix="/api/format", tags=["format"])

@router.post("/adapt")
async def adapt_format(req: FormatAdaptRequest):
    user_message = f"文章标题：{req.title}\n\n文章正文：\n{req.draft}"

    async def event_stream():
        try:
            async for chunk in stream_llm(FORMAT_PROMPT, user_message):
                yield f"data: {json.dumps({'type':'chunk','content':chunk},ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type':'done'},ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','message':str(e)},ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
        headers={"Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"})
```

### 8.4 Agent提示词

集中在 `backend/services/prompt_templates.py`。以下为四份提示词的完整文本，开发时直接复制为 Python 字符串常量。

#### ARCHITECT_PROMPT

```python
ARCHITECT_PROMPT = """你是一位文章架构师。用户会给你三个要点，你需要生成一个结构清晰的文章骨架。

你的核心原则：
1. 只给骨架，绝对不给正文——哪怕一个完整的句子都不要写
2. 每个段落的引导问题必须帮用户定位到自身经历，不能是"请写一段关于XX的文字"这种开放式指令
3. 骨架结构的逻辑线必须回应用户的三个要点（经历→洞察→疑问），不能遗漏任何一个
4. 段落之间要有递进关系，不能是并列的清单堆砌

引导问题的设计标准：
- 问题指向用户的具体行为/感受/判断，而非抽象概念
- 好的引导问题："你第一次用AI写代码时，犯过什么让你印象深刻的错误？"
- 差的引导问题："请写一段关于AI编程的文字"
- 每个段落配2-3个引导问题，由具体到抽象递进

骨架结构要求：
- 开头段落：从用户的具体经历切入，建立读者共鸣
- 中间段落：展开反常识洞察，用引导问题帮用户挖掘自己的独特视角
- 结尾段落：回应用户的疑问，引导用户给出自己的答案或行动建议
- 推荐4-6个段落，每个段落的H2/H3标题要有观点——读者扫一眼标题就知道这段讲什么

输出格式（严格JSON，不要包裹markdown代码块）：
{
  "title": "文章总标题（有观点，能引发好奇）",
  "sections": [
    {
      "title": "## 有观点的段落标题",
      "purpose": "本段解决什么问题——用一句话说清楚",
      "guidingQuestions": [
        "引导问题1：指向用户的具体行为/经历",
        "引导问题2：由具体到抽象的递进",
        "引导问题3：触发更深层的反思（可选）"
      ]
    }
  ]
}"""
```

#### MENTOR_PROMPT

导师 Agent 的完整系统提示词使用外部文件 `mentor-agent-prompt.md`（项目根目录）。代码中读取该文件作为字符串常量：

```python
# backend/services/prompt_templates.py
from pathlib import Path

_MENTOR_PROMPT_PATH = Path(__file__).parent.parent.parent / "mentor-agent-prompt.md"
MENTOR_PROMPT = _MENTOR_PROMPT_PATH.read_text(encoding="utf-8")
```

如需在 prompt_templates.py 中内联所有提示词，直接将 `mentor-agent-prompt.md` 的完整内容复制为 `MENTOR_PROMPT` 字符串即可。

#### FORMAT_PROMPT

```python
FORMAT_PROMPT = """你是一位平台格式适配专家。用户会给你一篇文章的正文和标题，你需要将其适配为两个平台的发布格式。

MVP 适配平台：微信公众号 + 知乎（共2个）。

适配规则：
1. 微信公众号：
   - 输出适合公众号排版的HTML格式
   - 段落短（手机屏幕3-5行），段落之间留白充足
   - 关键观点用 <strong> 加粗
   - 开头有一个吸引点击的引导语（1-2句，不重复标题）
   - 结尾附带引导互动的话术（如"你怎么看？评论区聊聊"）
2. 知乎：
   - 输出HTML格式（与公众号格式相同）
   - 保留原文的标题层级（H2/H3用h2/h3标签）
   - 段落之间空一行（用<br>）
   - 关键观点用 <strong> 加粗
   - 开头直接进入正文，不需要引导语

输出格式（严格JSON，不要包裹markdown代码块）：
[
  {
    "platform": "微信公众号",
    "title": "适配后的标题（可微调但保留核心观点）",
    "content": "HTML格式正文",
    "notes": "发布提示：建议封面图尺寸900x383，声明原创后发布"
  },
  {
    "platform": "知乎",
    "title": "适配后的标题",
    "content": "HTML格式正文",
    "notes": "发布提示：建议添加2-3个相关话题标签"
  }
]"""
```

#### STYLE_SKILL_PROMPT

```python
STYLE_SKILL_PROMPT = """你是一位写作风格分析师。用户会给你若干篇历史文章，你需要从表达层面系统分析这些文章的共同风格特征，生成一段高质量的 System Prompt——让AI可以根据这段Prompt模仿用户的写作风格。

分析维度（必须逐项分析，不可跳过）：

1. 句式特征：
   - 平均句子长度（偏短句10-15字 / 中等15-25字 / 偏长句25+字）
   - 句式变化模式（长短交替 / 连续短句制造节奏 / 长句铺陈）
   - 断句习惯（多用句号 / 多用逗号连接 / 善用分号）
   - 是否使用排比、反问、设问等修辞句式

2. 用词偏好：
   - 口语化程度（非常口语像聊天 / 适中 / 偏书面正式）
   - 专业术语密度（高频 / 适度 / 极少）
   - 是否有标志性用词或口头禅（反复出现的特定词汇或短语）
   - 比喻/类比的使用频率和风格（科技类比 / 生活类比 / 很少使用）
   - 是否偏好使用成语、俗语、网络流行语

3. 结构特征：
   - 开头方式（直接亮观点 / 讲故事切入 / 提问开头 / 描述场景）
   - 论证方式（举例论证 / 逻辑推理 / 引用外部观点 / 个人经历佐证）
   - 段落长度偏好（短段落1-3句 / 中等 / 长段落）
   - 结尾方式（总结观点 / 行动号召 / 开放式问题 / 戛然而止）

4. 语调节奏：
   - 整体语调（犀利直接 / 温和克制 / 幽默调侃 / 冷静客观）
   - 与读者的关系距离（像朋友聊天 / 像导师指导 / 像同行交流 / 保持距离）
   - 是否频繁使用"你"来直接对话读者
   - 段落之间的过渡方式（生硬跳转 / 平滑过渡 / 无过渡直接切）

5. 信息密度：
   - 信息密度（每句话都承载实质信息 / 适度铺陈 / 偏松散）
   - 一个段落平均传达几个独立观点
   - 是否使用具体数字、案例、名称来增强可信度

输出格式（严格JSON，不要包裹markdown代码块）：
{
  "styleProfile": {
    "sentenceStyle": "句式特征的详细描述（50-100字）",
    "wordChoice": "用词偏好的详细描述（50-100字）",
    "structureStyle": "结构特征的详细描述（50-100字）",
    "toneStyle": "语调节奏的详细描述（50-100字）",
    "densityStyle": "信息密度的详细描述（30-50字）"
  },
  "stylePrompt": "一段完整的System Prompt（200-400字），描述了以上所有风格特征，可以直接用于让另一个AI模仿该用户的写作风格。行文本身也应以该风格写成——用风格本身来展示风格。"
}"""
```

### 8.5 数据库

```python
# backend/models.py
class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)              # 纯文本正文
    bullet_points = Column(JSON, nullable=False)        # 对应API: bulletPoints
    skeleton = Column(JSON, nullable=True)
    mentor_feedback = Column(JSON, nullable=True)       # 对应API: mentorFeedback
    format_previews = Column(JSON, nullable=True)       # 对应API: formatPreviews
    progress_log = Column(JSON, nullable=True)          # 对应API: progressLog
    created_at = Column(DateTime, server_default=func.now())
```

### 8.6 DB ↔ API 字段映射实现

四组需要映射的字段：`bullet_points↔bulletPoints`、`mentor_feedback↔mentorFeedback`、`format_previews↔formatPreviews`、`progress_log↔progressLog`。

使用 Pydantic v2 的 `alias_generator` + `populate_by_name` 实现自动映射：

```python
# backend/schemas.py（追加响应模型）

from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

def to_camel(snake: str) -> str:
    """bullet_points → bulletPoints"""
    parts = snake.split('_')
    return parts[0] + ''.join(p.title() for p in parts[1:])

class ArticleOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,  # 同时接受 snake_case 和 camelCase
        from_attributes=True,   # 允许直接从 ORM 对象构造
    )

    id: int
    title: str
    content: str
    bullet_points: dict
    skeleton: Optional[dict] = None
    mentor_feedback: Optional[dict] = None
    format_previews: Optional[List[dict]] = None
    progress_log: Optional[List[dict]] = None
    created_at: datetime
```

路由中直接将 ORM 对象传入 `ArticleOut.model_validate(article)` 即可输出 camelCase JSON：

```python
# backend/routers/articles.py（序列化示例）
from schemas import ArticleOut

@router.get("/api/articles/{id}")
def get_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    return {"code": 0, "data": ArticleOut.model_validate(article).model_dump(by_alias=True)}
```

> 列表接口同理：`[ArticleOut.model_validate(a).model_dump(by_alias=True) for a in articles]`。

### 8.7 基础配置文件模板

```python
# backend/config.py
import os

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "your-api-key-here")
LLM_BASE_URL = "https://api.deepseek.com"
LLM_MODEL = "deepseek-v4-pro"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/app.db")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
KB_DIR = os.getenv("KB_DIR", "../knowledge-base")
```

```python
# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 8.8 FastAPI入口

```python
# backend/main.py
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS
from database import engine, Base
from routers import skeleton, mentor, format, knowledge, articles, style_skill

app = FastAPI(title="AI深度创作引擎")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, ...)
Base.metadata.create_all(bind=engine)
app.include_router(skeleton.router)  # + mentor, format, knowledge, articles, style_skill
```

### 8.9 非SSE路由

```python
# backend/routers/knowledge.py
from fastapi import APIRouter, Depends
from services.knowledge_service import KnowledgeService
from config import KB_DIR
from schemas import KnowledgeSearchRequest, KnowledgeAskRequest

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

try:
    kb = KnowledgeService(KB_DIR)
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"知识库初始化失败（搜索/问答不可用）: {e}")
    kb = None

@router.post("/search")
async def search(req: KnowledgeSearchRequest):
    if kb is None:
        return {"code": 0, "message": "ok", "data": {"results": []}}
    results = kb.search(req.query, req.topK)
    return {"code": 0, "message": "ok", "data": {"results": results}}

@router.post("/ask")
async def ask(req: KnowledgeAskRequest):
    if kb is None:
        return {"code": 0, "data": {"answer": "知识库当前不可用", "sources": []}}
    result = await kb.ask(req.question)
    return {"code": 0, "message": "ok", "data": result}
```

```python
# backend/routers/articles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import ArticleCreateRequest, ArticleOut

router = APIRouter(prefix="/api/articles", tags=["articles"])

@router.post("")
async def create_article(req: ArticleCreateRequest, db: Session = Depends(get_db)):
    article = Article(
        title=req.title,
        content=req.content,
        bullet_points=req.bulletPoints,
        skeleton=req.skeleton,
        mentor_feedback=req.mentorFeedback,
        format_previews=req.formatPreviews,
        progress_log=req.progressLog,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return {"code": 0, "message": "保存成功", "data": {"id": article.id}}

@router.get("")
async def list_articles(page: int = 1, pageSize: int = 20, db: Session = Depends(get_db)):
    total = db.query(Article).count()
    articles = (
        db.query(Article)
        .order_by(Article.created_at.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )
    return {
        "code": 0,
        "message": "ok",
        "data": {
            "items": [ArticleOut.model_validate(a).model_dump(by_alias=True) for a in articles],
            "total": total,
        },
    }

@router.get("/{id}")
async def get_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    return {"code": 0, "data": ArticleOut.model_validate(article).model_dump(by_alias=True)}

@router.delete("/{id}")
async def delete_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(article)
    db.commit()
    return {"code": 0, "message": "删除成功"}
```

```python
# backend/routers/style_skill.py
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import StyleSkillRequest
from services.llm import call_llm
from services.prompt_templates import STYLE_SKILL_PROMPT

router = APIRouter(prefix="/api/style-skill", tags=["style_skill"])

@router.post("/generate")
async def generate_style_skill(req: StyleSkillRequest, db: Session = Depends(get_db)):
    articles = db.query(Article).filter(Article.id.in_(req.articleIds)).all()
    if not articles:
        raise HTTPException(status_code=400, detail="未找到所选文章，请至少选择1篇")

    articles_text = "\n\n---\n\n".join(
        f"【文章{a.id}】{a.title}\n\n{a.content}" for a in articles
    )
    result = await call_llm(STYLE_SKILL_PROMPT, f"请分析以下文章的风格特征：\n\n{articles_text}")
    # LLM可能返回完整JSON {styleProfile, stylePrompt}，解析后只取stylePrompt
    try:
        parsed = json.loads(result)
        if isinstance(parsed, dict) and 'stylePrompt' in parsed:
            result = parsed['stylePrompt']
    except (json.JSONDecodeError, TypeError):
        pass  # 不是JSON或解析失败，直接用原始字符串
    return {"code": 0, "data": {"stylePrompt": result}}
```

#### WarehousePage.tsx / ArticleList.tsx / ArticleDetail.tsx

Plan 3 未提供仓库相关组件。基于 API 设计补全，包含空状态处理（D4）。

```typescript
// ArticleList.tsx
import { useEffect, useState } from 'react';
import { List, Button, Typography, Empty, Popconfirm, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

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

  useEffect(() => { fetchArticles(); }, []);

  const handleDelete = async (id: number) => {
    await api.delete(`/articles/${id}`);
    message.success('文章已删除');
    fetchArticles();
  };

  if (!loading && articles.length === 0) {
    return (
      <Empty
        description="还没有文章，去创作第一篇吧"
        className="py-20"
      >
        <Button type="primary" onClick={() => navigate('/workflow')}>
          开始创作
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      <Title level={3}>文章仓库</Title>
      <List
        loading={loading}
        dataSource={articles}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => navigate(`/warehouse/${item.id}`)}
            actions={[
              <Popconfirm
                title="确定删除这篇文章？"
                onConfirm={(e) => { e?.stopPropagation(); handleDelete(item.id); }}
                onCancel={(e) => e?.stopPropagation()}
                okText="删除"
                cancelText="取消"
              >
                <Button danger size="small" onClick={(e) => e.stopPropagation()}>
                  删除
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={item.title}
              description={
                <div>
                  <Paragraph ellipsis={{ rows: 1 }} className="text-sm text-gray-600 mb-0">
                    {item.bulletPoints?.insight || '暂无摘要'}
                  </Paragraph>
                  <Text type="secondary" className="text-xs">
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
```

```typescript
// ArticleDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Card, Spin, Empty, Tag } from 'antd';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

interface FormatPreviewItem {
  platform: string;
  title: string;
  content: string;
  notes: string;
}

interface ArticleDetail {
  id: number;
  title: string;
  content: string;
  bulletPoints: { experience: string; insight: string; question: string };
  skeleton: { title: string; sections: Array<{ title: string; purpose: string; guidingQuestions: string[] }> } | null;
  mentorFeedback: { items: Array<{ quote: string; problemType: string; diagnosis: string; rewrite: string; priority: string }>; summary: string } | null;
  formatPreviews: FormatPreviewItem[] | null;
  createdAt: string;
}

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
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

  if (loading) return <Spin className="flex justify-center py-20" />;
  if (!article) return <Empty description="文章不存在" className="py-20" />;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Button onClick={() => navigate('/warehouse')} className="mb-4">
        ← 返回仓库
      </Button>

      <Title level={2}>{article.title}</Title>
      <Text type="secondary">
        创建于 {new Date(article.createdAt).toLocaleString('zh-CN')}
      </Text>

      <Card title="正文" className="mt-6">
        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{article.content}</pre>
      </Card>

      {article.skeleton && (
        <Card title="文章骨架" className="mt-4">
          <Text strong>{article.skeleton.title}</Text>
          {article.skeleton.sections.map((s, i) => (
            <div key={i} className="mt-3">
              <Text strong>{s.title}</Text>
              <p className="text-gray-600 text-sm">{s.purpose}</p>
            </div>
          ))}
        </Card>
      )}

      {article.mentorFeedback && (
        <Card title="导师反馈" className="mt-4">
          <Paragraph>{article.mentorFeedback.summary}</Paragraph>
          {article.mentorFeedback.items.map((item, i) => (
            <div key={i} className="mb-3 p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2 mb-1">
                <Tag color={item.priority === 'P0' ? 'red' : item.priority === 'P1' ? 'orange' : 'blue'}>
                  {item.priority}
                </Tag>
                <Tag>{item.problemType}</Tag>
              </div>
              <blockquote className="border-l-4 border-gray-300 pl-3 text-gray-600 mb-2">
                {item.quote}
              </blockquote>
              <p className="text-green-700">{item.rewrite}</p>
            </div>
          ))}
        </Card>
      )}

      {article.formatPreviews && article.formatPreviews.length > 0 && (
        <Card title="平台格式预览" className="mt-4">
          {article.formatPreviews.map((fmt, i) => (
            <div key={i} className="mb-4">
              <Text strong>{fmt.platform}</Text>
              <Card size="small" className="mt-2">
                <div dangerouslySetInnerHTML={{ __html: fmt.content }} />
              </Card>
              <Text type="secondary" className="text-xs block mt-1">{fmt.notes}</Text>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
```

```typescript
// WarehousePage.tsx
import { ArticleList } from '../components/warehouse/ArticleList';

export function WarehousePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <ArticleList />
    </div>
  );
}
```

```typescript
// StyleSkillPage.tsx
import { useState } from 'react';
import { Button, Checkbox, List, Typography, message, Card, Spin } from 'antd';
import { useEffect } from 'react';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Title level={2}>风格 Skill</Title>
      <Text type="secondary">
        选择若干篇历史文章，AI将分析你的写作风格并生成一段System Prompt，用于其他AI工具中快速生成符合你风格的内容。
      </Text>

      <Card title="选择分析素材" className="mt-6">
        {loading ? (
          <Spin />
        ) : articles.length === 0 ? (
          <Text type="secondary">文章仓库中还没有文章，先去创作吧。</Text>
        ) : (
          <>
            <Checkbox.Group
              value={selectedIds}
              onChange={(values) => setSelectedIds(values as number[])}
              className="w-full"
            >
              <List
                dataSource={articles}
                renderItem={(item) => (
                  <List.Item>
                    <Checkbox value={item.id}>
                      {item.title}
                      <Text type="secondary" className="ml-2 text-xs">
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </Text>
                    </Checkbox>
                  </List.Item>
                )}
              />
            </Checkbox.Group>
            <Button
              type="primary"
              onClick={handleGenerate}
              loading={generating}
              className="mt-4"
              disabled={selectedIds.length === 0}
            >
              生成我的风格Skill
            </Button>
          </>
        )}
      </Card>

      {stylePrompt && (
        <Card title="生成结果" className="mt-6">
          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded overflow-auto max-h-96">
            {stylePrompt}
          </pre>
          <Button type="primary" onClick={handleCopy} className="mt-4">
            一键复制
          </Button>
        </Card>
      )}
    </div>
  );
}
```

---

## 九、知识库实现方案

### 9.1 检索策略设计说明

**为什么MVP用关键词匹配而非向量检索？**

- 知识库约60篇文章、总计约200KB文本。这个规模下，向量数据库的配置和运维成本远超检索质量收益
- 用户搜索意图明确（"vibe coding提示词"、"AI编程工具"），关键词匹配覆盖率足够
- 评审者（尤其工程背景）看到小数据集上堆向量数据库，反而会质疑工程判断力

**检索质量的核心不在向量化，而在以下三点**（当前方案均已实现）：

1. **Chunking策略**：按段落切分，500字一块，尽量保持语义完整——这是RAG pipeline中最容易被忽略但实际最关键的环节
2. **多路加权**：标题命中×10权重 + 正文TF计分 + 同义词扩展——三路信号融合，比单一embedding相似度更可控
3. **结果可解释**：每条搜索结果标注 `matchType`（title/content/synonym），前端可差异化展示，用户知道为什么搜到这个结果

**后续升级的触发条件**：当文章数量达到200+，或用户反馈"搜不到想要的内容"时，将search内部实现替换为embedding+余弦相似度。`_chunk_article`和`search`的外部接口不变，调用方完全无感。

### 9.2 完整实现

```python
# backend/services/knowledge_service.py

import os, re, logging, jieba
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════
# 同义词映射 — 中文AI写作场景
# ═══════════════════════════════════════

SYNONYM_MAP: Dict[str, List[str]] = {
    "提示词": ["prompt", "咒语", "指令"],
    "prompt": ["提示词", "咒语", "指令"],
    "编程": ["写代码", "coding", "开发"],
    "coding": ["编程", "写代码", "开发"],
    "vibe coding": ["氛围编程", "直觉编程", "AI编程"],
    "ai编程": ["vibe coding", "人工智能编程", "AI coding"],
    "部署": ["上线", "deploy", "发布"],
    "调试": ["debug", "排查", "排错"],
    "工具": ["平台", "软件", "应用", "tool"],
    "变现": ["赚钱", "商业化", "盈利", "monetization"],
    "写作": ["创作", "写文章", "输出"],
    "效率": ["速度", "生产力", "productivity"],
}

@dataclass
class Chunk:
    title: str
    source_path: str
    category: str
    content: str
    content_lower: str

@dataclass
class SearchResult:
    title: str
    snippet: str
    source: str
    category: str
    score: float
    matchType: str  # "title" | "content" | "synonym"


class KnowledgeService:
    def __init__(self, kb_dir: str):
        self.chunks: List[Chunk] = []
        self._load_all(kb_dir)

    def _load_all(self, kb_dir: str):
        """启动时扫描知识库目录，按段落切分后构建内存索引"""
        kb_path = Path(kb_dir)
        if not kb_path.exists():
            raise FileNotFoundError(f"知识库目录不存在: {kb_dir}。请检查 KB_DIR 配置。")
        if not kb_path.is_dir():
            raise NotADirectoryError(f"知识库路径不是目录: {kb_dir}")

        article_count = 0
        for category_dir in kb_path.iterdir():
            if not category_dir.is_dir():
                continue
            for md_file in category_dir.glob("*.md"):
                content = md_file.read_text(encoding='utf-8')
                title = self._extract_title(content) or md_file.stem
                for chunk_text in self._chunk_article(content):
                    self.chunks.append(Chunk(
                        title=title,
                        source_path=str(md_file.relative_to(kb_path)),
                        category=category_dir.name,
                        content=chunk_text,
                        content_lower=chunk_text.lower(),
                    ))
                article_count += 1

        logger.info(f"知识库加载完成: {article_count} 篇文章, {len(self.chunks)} 个chunk, 目录: {kb_dir}")
        if article_count == 0:
            logger.warning(f"知识库目录存在但未找到任何 .md 文件: {kb_dir}")

    def _extract_title(self, content: str) -> str:
        match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        return match.group(1).strip() if match else ""

    def _chunk_article(self, content: str, chunk_size: int = 500) -> List[str]:
        """按段落切分，尽量保持语义完整。超过chunk_size的段落作为独立chunk"""
        paragraphs = re.split(r'\n\n+', content)
        chunks, current = [], ''
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if len(current) + len(p) > chunk_size and current:
                chunks.append(current)
                current = p
            else:
                current = (current + '\n\n' + p).strip()
        if current:
            chunks.append(current)
        return chunks or [content]

    def search(self, query: str, top_k: int = 5) -> List[dict]:
        """
        多路加权搜索：
          - 标题命中：+10 分
          - 正文TF：每出现一次 +1 分
          - 同义词匹配：标记 matchType='synonym'
        返回带 matchType 的结果，前端可据此差异化展示
        """
        # jieba 分词：中文按词组切分，英文按空格 + jieba 组合处理
        raw_tokens = query.lower().split() + [t.strip().lower() for t in jieba.lcut(query) if len(t.strip()) > 1]
        query_terms = list(set(raw_tokens))
        expanded_terms = list(set(
            term
            for qt in query_terms
            for term in ([qt] + SYNONYM_MAP.get(qt, []) + SYNONYM_MAP.get(qt.lower(), []))
        ))

        scored: List[tuple] = []

        for chunk in self.chunks:
            score = 0
            match_type = 'content'  # 默认

            for term in expanded_terms:
                term_lower = term.lower()
                # 标题匹配：高权重，标记 matchType
                if term_lower in chunk.title.lower():
                    score += 10
                    match_type = 'title'
                # 正文TF计分
                score += chunk.content_lower.count(term_lower)

            # 同义词标记：如果原始词没命中但扩展词命中了
            if match_type != 'title':
                original_hit = any(
                    t.lower() in chunk.title.lower()
                    for t in query_terms
                )
                if not original_hit:
                    synonym_hit = any(
                        t.lower() in chunk.content_lower and t.lower() not in query_terms
                        for t in expanded_terms
                    )
                    if synonym_hit:
                        match_type = 'synonym'

            if score > 0:
                snippet = self._extract_snippet(chunk.content, query_terms)
                scored.append((chunk, score, snippet, match_type))

        scored.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                'title': c.title,
                'snippet': snippet,
                'source': c.source_path,
                'category': c.category,
                'score': min(s / 100, 1.0),
                'matchType': mt,
            }
            for c, s, snippet, mt in scored[:top_k]
        ]

    def _extract_snippet(
        self, content: str, query_terms: List[str], max_len: int = 200
    ) -> str:
        """提取包含关键词的文本片段作为摘要"""
        content_lower = content.lower()
        for term in query_terms:
            idx = content_lower.find(term.lower())
            if idx != -1:
                start = max(0, idx - 50)
                end = min(len(content), idx + max_len)
                snippet = content[start:end]
                return (snippet[:max_len] + '...') if len(snippet) > max_len else snippet
        return content[:max_len] + '...'

    async def ask(self, question: str) -> dict:
        """RAG问答：检索Top-3 → 拼接上下文 → LLM生成回答"""
        results = self.search(question, top_k=3)
        context_text = '\n\n'.join(
            f"【来源：{r['title']}】{r['snippet']}" for r in results
        )

        prompt = f"""基于以下参考资料回答用户问题。如果资料不足以回答，明确说明。

参考资料：
{context_text}

用户问题：{question}

要求：简洁直接，引用资料时标注来源标题。"""

        from services.llm import call_llm
        answer = await call_llm(
            "你是知识库助手，基于给定资料简洁准确地回答用户问题。",
            prompt,
        )

        return {
            'answer': answer,
            'sources': [
                {'title': r['title'], 'snippet': r['snippet'], 'matchType': r['matchType']}
                for r in results
            ],
        }
```

### 9.3 API响应中 matchType 的使用

搜索接口返回的每条结果含 `matchType` 字段，前端可据此差异化展示：

| matchType | 含义 | 建议前端展示 |
|-----------|------|-------------|
| `title` | 搜索词命中文章标题 | 高亮展示，标题旁加 ★ 标记 |
| `content` | 搜索词在正文中匹配 | 正常展示 |
| `synonym` | 通过同义词扩展匹配到 | 灰色小字标注"关联结果" |

RAG问答接口的 `sources` 中同样包含 `matchType`，让用户知道每个参考来源的匹配质量。

### 9.4 后续升级路径

当知识库200+篇或检索质量不满足需求时：

1. 为chunk预计算embedding（openai text-embedding-3-small）
2. 存入SQLite的BLOB字段（复用现有数据库）
3. search改为：关键词召回Top-50 → embedding精排Top-5（双路检索）
4. `_chunk_article`、`search`、`ask` 的外部接口不变

---

### 10.0 前端基础配置文件

```css
/* frontend/src/styles/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

```css
/* frontend/src/styles/tiptap.css */
.ProseMirror {
  min-height: 400px;
  padding: 1rem;
  outline: none;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 0.75rem;
  color: #6b7280;
  margin: 0.5rem 0;
}
```

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

---

## 十、依赖安装与启动

```bash
# 前端
cd frontend
npm create vite@latest . -- --template react-ts
npm install xstate@5 @xstate/react@5 antd@5 @ant-design/v5-patch-for-react-19 react@19 react-dom@19 react-router-dom@6 @tiptap/react @tiptap/starter-kit axios
npm install -D tailwindcss @tailwindcss/typography postcss autoprefixer @types/react @types/react-dom typescript
npx tailwindcss init -p
```

```bash
# 后端
cd backend
pip install fastapi==0.115.0 uvicorn==0.30.6 sqlalchemy==2.0.35 openai==1.51.0 python-multipart==0.0.12
```

启动：`Terminal1: uvicorn main:app --reload --port 8000` / `Terminal2: npm run dev` → `localhost:5173`

### 10.1 前端关键配置文件

#### vite.config.ts

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

> Vite proxy 将开发环境的前端 `/api/*` 请求代理到后端 `localhost:8000`，解决跨域问题。生产部署时不依赖此配置——由 Nginx 或后端直接提供静态文件。

#### tailwind.config.ts

```typescript
// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,  // 禁用 Tailwind 默认 reset，避免与 Ant Design 样式冲突
  },
  plugins: [typography],
};

export default config;
```

> `@tailwindcss/typography` 插件用于 TipTap 编辑器内容的排版样式（`prose` class）。`preflight: false` 是必须的——不禁用会导致 Ant Design 组件样式错乱。

#### postcss.config.js

```javascript
// frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 10.2 前端入口文件

#### main.tsx

```typescript
// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@ant-design/v5-patch-for-react-19';  // antd 5 + React 19 兼容补丁
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

#### App.tsx

```typescript
// frontend/src/App.tsx
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { WorkflowPage } from './pages/WorkflowPage';
import { WarehousePage } from './pages/WarehousePage';
import { ArticleDetail } from './components/warehouse/ArticleDetail';
import { StyleSkillPage } from './pages/StyleSkillPage';

const { Header, Content } = Layout;

const navItems: MenuProps['items'] = [
  { key: '/workflow', label: '创作工作流' },
  { key: '/warehouse', label: '文章仓库' },
  { key: '/style-skill', label: '风格Skill' },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = '/' + location.pathname.split('/')[1];

  return (
    <ConfigProvider locale={zhCN}>
      <Layout className="min-h-screen">
        <Header className="flex items-center px-6">
          <div className="text-white font-bold text-lg mr-8">AI深度创作引擎</div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[activeKey]}
            items={navItems}
            onClick={({ key }) => navigate(key)}
            className="flex-1"
          />
        </Header>
        <Content>
          <Routes>
            <Route path="/" element={<Navigate to="/workflow" replace />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="/warehouse/:id" element={<ArticleDetail />} />
            <Route path="/style-skill" element={<StyleSkillPage />} />
          </Routes>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
```

> 路由设计：`/` 自动重定向到 `/workflow`。`ConfigProvider` 设置为中文，全局生效于 Ant Design 组件。

---

## 十一、验证清单与注意事项

### 11.0 开发时注意事项

| # | 项目 | 说明 |
|---|------|------|
| 1 | **CORS 配置** | `allow_origins` 默认值为 `localhost:5173`，部署时通过环境变量 `CORS_ORIGINS` 设为实际域名 |
| 2 | **draft 全程纯文本** | TipTap 编辑器仅用于写作态。WritingStep 提交时调用 `editor.getText()` 提取纯文本（保留段落换行，丢弃内联格式）。回退到 writing 时用 `editor.commands.setContent(draft)` 初始化——TipTap 自动将纯文本包装为段落节点。写作提示文案引导段落式写作，不建议使用有序/无序列表（getText 会丢失列表层级） |
| 3 | **文章保存手动触发** | `completed` 状态下用户点击"保存文章"按钮，组件内部调用 `api.post('/articles', ...)`。保存成功后按钮变为"已保存"，并启用"开始新文章"和"去仓库查看"。RESET 事件不清除已保存到数据库的文章 |

### 11.1 实现前验证

| # | 验证项 | 时机 |
|---|--------|------|
| 1 | React 19 + Ant Design + Tailwind + TipTap 四者无冲突 | Day 1 |
| 1.1 | `npm ls react` 无版本冲突（React 19 唯一副本） | Day 1 |
| 1.2 | `@ant-design/v5-patch-for-react-19` 已在入口引入 | Day 1 |
| 1.3 | antd 组件（Button/Modal/Drawer）正常渲染无报错 | Day 1 |
| 2 | XState v5 `useMachine` 正常 | Day 1 |
| 3 | Vite proxy 生效 (`/api/health` → `{"code":0}`) | Day 1 |
| 4 | 并行状态不阻断主流程 | Day 2 |
| 5 | TipTap 实例正常渲染 | Day 4 |
| 6 | 状态持久化（writing步刷新后draft不丢） | Day 5 |

### 11.2 XState v5 注意事项（来源：Plan 1）

- 不用 `interpret()`，用 `useMachine` hook
- guard 不用 `cond`
- 并行状态在根级别设 `type: 'parallel'`
- `assign` 回调接收单个 `{context, event}` 对象，解构用 `({ event })` 或 `({ context })`，不是 v4 的 `(context, event)` 两参数形式（已全部验证，6 处回调均为 v5 正确写法）

### 11.3 常见坑点（来源：Plan 3）

- SSE 不用原生 EventSource（POST场景），统一用 Fetch API + ReadableStream
- SQLite 开发期单 worker
- 禁用 Tailwind preflight（`corePlugins: { preflight: false }`）
- TipTap 依赖浏览器 API

### 11.4 项目基础文件

```gitignore
# .gitignore
node_modules/
__pycache__/
*.pyc
.env
backend/data/app.db
dist/
.vite/
.DS_Store
*.log
```

```bash
# backend/requirements.txt
fastapi==0.115.0
uvicorn==0.30.6
sqlalchemy==2.0.35
openai==1.51.0
python-multipart==0.0.12
python-dotenv==1.0.1
jieba==0.42.1
```

```bash
# .env.example
DEEPSEEK_API_KEY=your-api-key-here
DATABASE_URL=sqlite:///data/app.db
KB_DIR=../knowledge-base
CORS_ORIGINS=http://localhost:5173
```

---

## 融合来源速查

| 章节 | 主要来源 | 说明 |
|------|---------|------|
| 目录结构 | Plan 2 + 1 | 前端按域分组，后端 routes/services 分离 |
| XState 类型 | Plan 2 命名 + Plan 1 字段 + Plan 3 coachRound | 三方融合 |
| XState 状态机 | Plan 2 逻辑 + Plan 1 action 模式 | PRD合规为核心 |
| 知识库状态 | Plan 3 | closed/open状态管理（搜索由组件自行处理） |
| usePersistedMachine | Plan 3 | Hook 封装最优 |
| 组件TSX | Plan 3 | 适配后直接可用 |
| API设计 | Plan 2 | 语义化SSE + previousFeedback + FormatPreview数组 |
| SSE封装 | Plan 1 | 残行buffer处理 |
| 后端实现 | Plan 1 | LLM/SSE路由/Agent提示词/数据库 |
| 知识库 | Plan 3+2+1 | 结构+chunk+搜索三方融合 |
| 数据流 | Plan 2 | 逐卡点序列最详细 |
| 验证清单 | Plan 1+2+3 | 三方互补 |

---

*本文档融 Plan 1 (DeepSeek) 后端、Plan 2 (Claude) 架构、Plan 3 (GLM) 前端于一体。*
