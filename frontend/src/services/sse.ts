// src/services/sse.ts

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
    buffer = lines.pop() || '';

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
          onChunk?.(chunk.content);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        clearTimeout(chunkTimer!);
        throw e;
      }
    }
  }

  try {
    return JSON.parse(fullText) as T;
  } catch {
    const extracted = extractJSON(fullText);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch { /* fall through */ }
    }
    throw new Error(`AI返回了无效的JSON格式，请重试。原始文本前100字符：${fullText.slice(0, 100)}`);
  }
}

function extractJSON(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const firstBrace  = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  if (firstBrace === -1 && firstBracket === -1) return null;

  const isObject = firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket);
  const start = isObject ? firstBrace : firstBracket;

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
