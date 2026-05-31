// src/hooks/usePersistedMachine.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMachine } from '@xstate/react';
import { fromPromise } from 'xstate';
import type { AppMachine } from '../state/appMachine';
import type { Skeleton, MentorFeedback, BulletPoints } from '../state/appMachine.types';
import { fetchSSE } from '../services/sse';

const STORAGE_KEY = 'deep_article_app_state';

const INVOKE_ROLLBACK: Record<string, string> = {
  architecting: 'input',
  coaching: 'writing',
  formatting: 'finalReview',
};

function sanitizeSnapshot(snapshot: any): any {
  if (!snapshot || !snapshot.value) return undefined;
  const wf = snapshot.value.workflow;
  if (typeof wf === 'string' && INVOKE_ROLLBACK[wf]) {
    snapshot.value = { ...snapshot.value, workflow: INVOKE_ROLLBACK[wf] };
    snapshot.context = { ...snapshot.context, errorMessage: null, sseBuffer: '' };
  }
  return snapshot;
}

export function usePersistedMachine(machine: AppMachine) {
  const [streamingContent, setStreamingContent] = useState('');

  const handleChunk = useCallback((text: string) => {
    setStreamingContent(prev => prev + text);
  }, []);

  const resetStreaming = useCallback(() => {
    setStreamingContent('');
  }, []);

  const machineWithServices = useMemo(
    () =>
      machine.provide({
        actors: {
          generateSkeleton: fromPromise(
            ({ input }: { input: BulletPoints }) => {
              resetStreaming();
              return fetchSSE<Skeleton>(
                '/api/skeleton/generate',
                input as unknown as Record<string, unknown>,
                handleChunk,
              );
            },
          ),
          getMentorFeedback: fromPromise(
            ({ input }: { input: { draft: string; skeleton: Skeleton | null } }) => {
              resetStreaming();
              return fetchSSE<MentorFeedback>(
                '/api/mentor/review',
                input as unknown as Record<string, unknown>,
                handleChunk,
              );
            },
          ),


        },
      }),
    [machine, handleChunk, resetStreaming],
  );

  const rehydratedSnapshot = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return undefined;
      const parsed = JSON.parse(saved);
      return sanitizeSnapshot(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
  })();

  const [state, send, actorRef] = useMachine(machineWithServices, {
    snapshot: rehydratedSnapshot,
  } as any);

  useEffect(() => {
    const sub = actorRef.subscribe(() => {
      try {
        const snap = actorRef.getPersistedSnapshot();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      } catch (e) {
        console.error('[usePersistedMachine] localStorage写入失败:', e);
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
    } catch { /* quota exceeded — ignore */ }
  };

  return [state, send, saveSnapshot, streamingContent] as const;
}
