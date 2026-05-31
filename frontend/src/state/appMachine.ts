// src/state/appMachine.ts

import { createMachine, assign } from 'xstate';
import type {
  WorkflowContext, WorkflowEvent, Skeleton,
  MentorFeedback, ProgressEntry
} from './appMachine.types';

// ════════════════════════════════════
// Action 函数
// ════════════════════════════════════

const clearAll = assign({
  bulletPoints: { experience: '', insight: '', question: '' },
  skeleton: null, draft: '', mentorFeedback: null,
  errorMessage: null,
  coachRound: 0, progressLog: [], sseBuffer: '',
});

const clearDraftAndFeedback = assign({
  draft: '', mentorFeedback: null, errorMessage: null,
});

const clearFeedback = assign({
  mentorFeedback: null, errorMessage: null,
});

const clearError = assign({ errorMessage: null });

const logProgress = assign({
  progressLog: ({ context }: { context: WorkflowContext }) => {
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
  coachRound: ({ context }: { context: WorkflowContext }) => context.coachRound + 1,
});

// ════════════════════════════════════
// Guard
// ════════════════════════════════════

const validateBulletPoints = ({ event }: { event: WorkflowEvent }) => {
  if (event.type !== 'SUBMIT') return false;
  const { experience, insight, question } = event.bulletPoints;
  return experience.length >= 20 || insight.length >= 20 || question.length >= 20;
};

// ════════════════════════════════════
// 状态机
// ════════════════════════════════════

export const appMachine = createMachine({
  id: 'deepArticleApp',
  types: {} as { context: WorkflowContext; events: WorkflowEvent },
  context: {
    bulletPoints: { experience: '', insight: '', question: '' },
    skeleton: null, draft: '', mentorFeedback: null,
    stylePrompt: '',
    errorMessage: null, sseBuffer: '',
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
                stylePrompt: ({ event }: any) => event.bulletPoints?.stylePrompt || '',
                errorMessage: null,
              }),
            },
            RETRY: { target: 'architecting', actions: clearError as any },
          },
        },

        architecting: {
          invoke: {
            src: 'generateSkeleton',
            input: ({ context }) => context.bulletPoints,
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
                errorMessage: ({ event }: any) => `骨架生成失败：${event.error?.message || '请重试'}`,
                sseBuffer: '',
              }),
            },
          },
        },

        skeletonReview: {
          on: {
            CONFIRM_SKELETON: { target: 'writing', actions: clearError as any },
            BACK_TO_INPUT: { target: 'input', actions: clearAll as any },
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
            RETRY: { target: 'coaching', actions: clearFeedback as any },
            BACK_TO_SKELETON: { target: 'skeletonReview', actions: clearError as any },
          },
        },

        coaching: {
          invoke: {
            src: 'getMentorFeedback',
            input: ({ context }) => ({ draft: context.draft, skeleton: context.skeleton, stylePrompt: context.stylePrompt }),
            onDone: {
              target: 'coachResponse',
              actions: [
                assign({
                  mentorFeedback: ({ event }) => (event as any).output as MentorFeedback,
                  sseBuffer: '', errorMessage: null,
                }),
                logProgress as any,
              ],
            },
            onError: {
              target: 'writing',
              actions: assign({
                errorMessage: ({ event }: any) => `导师审阅失败：${event.error?.message || '请重试'}`,
                sseBuffer: '',
              }),
            },
          },
        },

        coachResponse: {
          on: {
            CONFIRM_COACH: { target: 'finalReview', actions: clearError as any },
            BACK_TO_SKELETON: {
              target: 'skeletonReview',
              actions: clearDraftAndFeedback as any,
            },
            BACK_TO_WRITING: {
              target: 'writing',
              actions: clearFeedback as any,
            },
            SUBMIT_REVISION: {
              target: 'coaching',
              actions: assign({
                draft: ({ event }: any) => event.draft as string,
                errorMessage: null,
              }),
            },
          },
        },

        finalReview: {
          on: {
            CONFIRM_FINAL: { target: 'completed', actions: clearError as any },
          },
        },

        completed: {
          on: { RESET: { target: 'input', actions: clearAll as any } },
        },
      },
    },

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
