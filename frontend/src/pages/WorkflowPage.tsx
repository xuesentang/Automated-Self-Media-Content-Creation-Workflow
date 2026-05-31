// src/pages/WorkflowPage.tsx

import { usePersistedMachine } from '../hooks/usePersistedMachine';
import { appMachine } from '../state/appMachine';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { StreamingPanel } from '../components/common/StreamingPanel';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { ProgressIndicator } from '../components/common/ProgressIndicator';
import { KnowledgeDrawer } from '../components/knowledge/KnowledgeDrawer';
import { InputStep } from '../components/workflow/InputStep';
import { SkeletonReviewStep } from '../components/workflow/SkeletonReviewStep';
import { WritingStep } from '../components/workflow/WritingStep';
import { CoachResponseStep } from '../components/workflow/CoachResponseStep';
import { FinalReviewStep } from '../components/workflow/FinalReviewStep';
import { CompletedStep } from '../components/workflow/CompletedStep';
import { Button } from 'antd';
import { BookOpen, Lightbulb, Zap } from 'lucide-react';

const STEP_MAP: Record<string, number> = {
  input: 0, architecting: 0,
  skeletonReview: 1,
  writing: 2, coaching: 2,
  coachResponse: 3,
  finalReview: 4,
  completed: 5,
};

export function WorkflowPage() {
  const navigate = useNavigate();
  const [state, send, , streamingContent] = usePersistedMachine(appMachine);

  if (!state.value) {
    return <LoadingOverlay message="正在恢复工作状态..." />;
  }

  const wf = (state.value as any).workflow as string;
  const kbOpen = (state.value as any).knowledgeBase !== 'closed';

  const VALID_STATES = ['input','architecting','skeletonReview','writing','coaching','coachResponse','finalReview','completed'];
  if (!VALID_STATES.includes(wf)) {
    localStorage.removeItem('deep_article_app_state');
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-[var(--error-50)] flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-[var(--error-500)]" />
          </div>
          <p className="text-[var(--text-secondary)] mb-4">工作状态异常，已自动重置</p>
          <Button type="primary" size="large" onClick={() => window.location.reload()}>
            重新开始
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = STEP_MAP[wf] ?? 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg-secondary)]">
      <div className="max-w-[1800px] mx-auto flex gap-6">
        {/* Left Sidebar - Step Navigation */}
        <aside className="w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto border-r border-[var(--border-light)] bg-white/50 backdrop-blur-sm">
          <div className="p-5">
            <ProgressIndicator current={currentStep} />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={`flex-1 min-w-0 ${wf === 'writing' ? '' : ''}`}>
          {/* Top Bar */}
          <div className="sticky top-16 z-10 bg-white/80 backdrop-blur-md border-b border-[var(--border-light)] px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                {wf === 'input' && '开始创作'}
                {wf === 'architecting' && '生成骨架中...'}
                {wf === 'skeletonReview' && '审核文章骨架'}
                {wf === 'writing' && '核心写作'}
                {wf === 'coaching' && '导师审阅中...'}
                {wf === 'coachResponse' && '导师反馈'}
                {wf === 'finalReview' && '终审定稿'}
                {wf === 'completed' && '创作完成'}
              </h1>
              <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
                {wf === 'input' && '输入你的经历和想法，AI将为你生成文章骨架'}
                {wf === 'architecting' && 'AI正在分析你的输入并生成文章结构'}
                {wf === 'skeletonReview' && '确认骨架逻辑是否合理，可直接修改'}
                {wf === 'writing' && '基于骨架撰写文章初稿'}
                {wf === 'coaching' && 'AI导师正在审阅你的初稿'}
                {wf === 'coachResponse' && '查看导师反馈并修改'}
                {wf === 'finalReview' && '最后确认文章内容'}
                {wf === 'completed' && '文章创作完成，可以保存或发布'}
              </p>
            </div>
            <Button
              onClick={() => send({ type: 'OPEN_KNOWLEDGE' })}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              知识库
            </Button>
          </div>

          {/* Error Banner */}
          {state.context.errorMessage && (
            <div className="px-6 pt-4">
              <ErrorBanner message={state.context.errorMessage} onRetry={() => send({ type: 'RETRY' })} />
            </div>
          )}

          {/* Content */}
          <div className="px-0 py-0 animate-fade-in-up">
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
            {wf === 'architecting' && <StreamingPanel message="AI架构师正在生成文章骨架..." content={streamingContent} />}
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
            {wf === 'coaching' && <StreamingPanel message="导师正在审阅..." content={streamingContent} />}
            {wf === 'coachResponse' && (
              <CoachResponseStep draft={state.context.draft}
                feedback={state.context.mentorFeedback!}
                onConfirm={() => send({ type: 'CONFIRM_COACH' })}
                onBackToSkeleton={() => send({ type: 'BACK_TO_SKELETON' })}
                onBackToWriting={() => send({ type: 'BACK_TO_WRITING' })}
                onSubmitRevision={(draft) => send({ type: 'SUBMIT_REVISION', draft })} />
            )}
            {wf === 'finalReview' && (
              <FinalReviewStep draft={state.context.draft}
                onConfirm={() => send({ type: 'CONFIRM_FINAL' })} />
            )}
            {wf === 'completed' && (
              <>
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
                      progressLog: state.context.progressLog,
                    });
                    return res.data.id;
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Tips & Actions */}
        <aside className="w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto border-l border-[var(--border-light)] bg-white/30 backdrop-blur-sm p-5">
          <div className="space-y-6">
            {/* Quick Tips */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border-light)]">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-[var(--warning-500)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">创作技巧</h3>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-xs font-medium flex items-center justify-center">1</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    经历描述越具体，生成的骨架越精准
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-xs font-medium flex items-center justify-center">2</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    个人感悟是文章的灵魂，不要省略
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-xs font-medium flex items-center justify-center">3</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    疑问式标题更容易引发读者共鸣
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-gradient-to-br from-[var(--brand-50)] to-[var(--brand-100)] rounded-xl p-4 border border-[var(--brand-200)]">
              <h3 className="text-sm font-semibold text-[var(--brand-700)] mb-2">当前状态</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--brand-500)] animate-pulse" />
                <span className="text-xs text-[var(--brand-600)]">
                  {wf === 'input' && '等待输入'}
                  {wf === 'architecting' && 'AI生成中...'}
                  {wf === 'skeletonReview' && '待审核'}
                  {wf === 'writing' && '写作中'}
                  {wf === 'coaching' && '审阅中...'}
                  {wf === 'coachResponse' && '待修改'}
                  {wf === 'finalReview' && '待确认'}
                  {wf === 'completed' && '已完成'}
                </span>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="rounded-xl p-4 border border-[var(--border-light)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">快捷操作</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)]">打开知识库</span>
                  <kbd className="px-2 py-0.5 bg-[var(--slate-100)] rounded text-[var(--text-tertiary)] font-mono">K</kbd>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)]">保存文章</span>
                  <kbd className="px-2 py-0.5 bg-[var(--slate-100)] rounded text-[var(--text-tertiary)] font-mono">Ctrl+S</kbd>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <KnowledgeDrawer open={kbOpen}
        onClose={() => send({ type: 'CLOSE_KNOWLEDGE' })} />
    </div>
  );
}
