export interface BulletPoints {
  experience: string;
  insight: string;
  question: string;
  stylePrompt?: string;
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
  draft: string;
  mentorFeedback: MentorFeedback | null;
  stylePrompt: string;

  errorMessage: string | null;
  sseBuffer: string;
  progressLog: ProgressEntry[];
  coachRound: number;
}

export type WorkflowEvent =
  | { type: 'SUBMIT'; bulletPoints: BulletPoints }
  | { type: 'CONFIRM_SKELETON' }
  | { type: 'EDIT_SKELETON'; skeleton: Skeleton }
  | { type: 'BACK_TO_INPUT' }
  | { type: 'SUBMIT_DRAFT'; draft: string }
  | { type: 'CONFIRM_COACH' }
  | { type: 'BACK_TO_SKELETON' }
  | { type: 'BACK_TO_WRITING' }
  | { type: 'SUBMIT_REVISION'; draft: string }
  | { type: 'CONFIRM_FINAL' }
  | { type: 'OPEN_KNOWLEDGE' }
  | { type: 'CLOSE_KNOWLEDGE' }
  | { type: 'RETRY' }
  | { type: 'RESET' };
