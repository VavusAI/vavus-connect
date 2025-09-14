import { useState, useRef, useCallback } from 'react';
import { saveChat } from '@/lib/api';

export type ChatMessage = {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    created_at: string;
};

type SendableMsg = { role: 'system' | 'user' | 'assistant'; content: string };

type UseStreamedChatOpts = {
    conversationId?: string;
    onNewConversation?: (id: string) => void;
    getRecentMessages?: () => ChatMessage[]; // provide last N messages for context
};

/* --- STRIPPING + GATING HELPERS --- */

// Remove any chain-of-thought / analysis / fenced think blocks
function stripReasoningAll(s: string): string {
    if (!s) return s;

    // Remove DeepSeek tags
    s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // Remove "pipe" style
    s = s.replace(/<\|think\|>[\s\S]*?(?=<\|assistant\|>)/gi, '');

    // Remove fenced code blocks labeled think/reasoning/analysis
    s = s.replace(/```(?:think|thinking|reasoning|analysis)[\s\S]*?```/gi, '');

    // Remove obvious “analysis:” style prefixes up to the next blank line
    s = s.replace(/^\s*(analysis|reasoning|thoughts?|scratch(?:pad)?):[\s\S]*?(?:\n\s*\n|$)/gim, '');

    // If the model emits "Final answer:" keep only what follows it
    const fa = s.match(/final answer\s*:\s*/i);
    if (fa) {
        const idx = (fa.index ?? -1) + fa[0].length;
        if (idx > -1) s = s.slice(idx);
    }

    // Minor cleanups
    s = s.replace(/^(assistant|answer)\s*:\s*/i, '');
    return s.trim();
}

// During streaming, don't render *anything* until we know the
// "thinking" phase is over. These markers flip the gate:
function detectAnswerStart(bufferLower: string): number {
    // </think>
    const t1 = bufferLower.lastIndexOf('</think>');
    if (t1 !== -1) return t1 + '</think>'.length;

    // <|assistant|>  (after <|think|>)
    const t2 = bufferLower.lastIndexOf('<|assistant|>');
    if (t2 !== -1) return t2 + '<|assistant|>'.length;

    // ``` (closing a fenced think block)
    // only consider if we've seen ```think earlier
    const hasFenceStart = /```think|```thinking|```reasoning|```analysis/i.test(bufferLower);
    const lastFenceClose = bufferLower.lastIndexOf('```');
    if (hasFenceStart && lastFenceClose !== -1) return lastFenceClose + 3;

    // "Final answer:" pattern
    const fa = bufferLower.lastIndexOf('final answer:');
    if (fa !== -1) return fa + 'final answer:'.length;

    // Otherwise unknown yet
    return -1;
}

/* --- STREAM FUNCTION (talks to /api/ai-stream) --- */
async function streamChat({
                              messages,
                              maxTokens,
                              onDelta,
                              onDone,
                              onError,
                              signal,
                          }: {
    messages: SendableMsg[];
    maxTokens: number;
    onDelta: (chunk: string) => void;
    onDone: (full: string) => void;
    onError: (e: unknown) => void;
    signal: AbortSignal;
}) {
    try {
        const res = await fetch('/api/ai-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
                temperature: 0.3,
                max_tokens: maxTokens,
                messages,
            }),
            signal,
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let full = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
                const line = part.split('\n').find((l) => l.startsWith('data:'));
                if (!line) continue;
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') {
                    onDone(full);
                    return;
                }
                try {
                    const json = JSON.parse(payload);
                    const delta =
                        json?.choices?.[0]?.delta?.content ??
                        json?.choices?.[0]?.message?.content ??
                        '';
                    if (delta) {
                        full += delta;
                        onDelta(delta);
                    }
                } catch {
                    // ignore keepalive/comments
                }
            }
        }

        onDone(full);
    } catch (e) {
        onError(e);
    }
}

/* --- HOOK --- */
export function useStreamedChat(opts: UseStreamedChatOpts = {}) {
    const { conversationId, onNewConversation, getRecentMessages } = opts;

    const [streamText, setStreamText] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // Gate state
    const rawRef = useRef('');              // entire raw stream so far
    const shownUntilRef = useRef(0);        // end index of what was flushed to UI
    const answerStartedRef = useRef(false); // flips once we detect answer
    const guardTimerRef = useRef<number | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    const onSend = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            setStreamText('');
            setIsThinking(true);

            // reset gate
            rawRef.current = '';
            shownUntilRef.current = 0;
            answerStartedRef.current = false;
            if (guardTimerRef.current) {
                window.clearTimeout(guardTimerRef.current);
                guardTimerRef.current = null;
            }

            const controller = new AbortController();
            controllerRef.current = controller;

            const recent = getRecentMessages?.() ?? [];
            const context: SendableMsg[] = [
                { role: 'system', content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
                ...recent.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: trimmed },
            ];

            // If the model never marks end-of-think, show something after a short guard
            const GUARD_MS = 1200;
            guardTimerRef.current = window.setTimeout(() => {
                if (!answerStartedRef.current && rawRef.current) {
                    // fall back: strip everything we have and start showing it
                    answerStartedRef.current = true;
                    const cleaned = stripReasoningAll(rawRef.current);
                    setStreamText(cleaned);
                    shownUntilRef.current = rawRef.current.length;
                    setIsThinking(false);
                }
            }, GUARD_MS) as unknown as number;

            await streamChat({
                messages: context,
                maxTokens: 1024,
                signal: controller.signal,
                onDelta: (chunk) => {
                    rawRef.current += chunk;

                    if (!answerStartedRef.current) {
                        const lower = rawRef.current.toLowerCase();
                        const startAt = detectAnswerStart(lower);
                        if (startAt !== -1) {
                            answerStartedRef.current = true;
                            const tail = rawRef.current.slice(startAt);
                            const cleaned = stripReasoningAll(tail);
                            if (cleaned) setStreamText((prev) => prev + cleaned);
                            shownUntilRef.current = rawRef.current.length;
                            if (guardTimerRef.current) {
                                window.clearTimeout(guardTimerRef.current);
                                guardTimerRef.current = null;
                            }
                            setIsThinking(false);
                            return;
                        }
                        // still thinking → show nothing (spinner stays on)
                        return;
                    }

                    // Once answer started, append only the newly arrived portion, cleaned
                    const newPortion = rawRef.current.slice(shownUntilRef.current);
                    const cleaned = stripReasoningAll(newPortion);
                    if (cleaned) setStreamText((prev) => prev + cleaned);
                    shownUntilRef.current = rawRef.current.length;
                },
                onDone: async (full) => {
                    if (guardTimerRef.current) {
                        window.clearTimeout(guardTimerRef.current);
                        guardTimerRef.current = null;
                    }
                    setIsThinking(false);
                    const finalClean = stripReasoningAll(full);
                    setStreamText(finalClean);

                    // persist
                    try {
                        const res = await saveChat({
                            conversationId,
                            message: trimmed,
                            assistantText: finalClean,
                        });
                        const newId: string | undefined = (res as any)?.conversationId || conversationId;
                        onNewConversation?.(newId as string);
                    } catch {
                        // ignore save errors here (UI stays responsive)
                    }
                },
                onError: () => {
                    if (guardTimerRef.current) {
                        window.clearTimeout(guardTimerRef.current);
                        guardTimerRef.current = null;
                    }
                    setIsThinking(false);
                },
            });

            controllerRef.current = null;
        },
        [conversationId, onNewConversation, getRecentMessages]
    );

    const onStop = useCallback(() => {
        controllerRef.current?.abort();
        setIsThinking(false);
    }, []);

    return {
        isThinking,
        streamText,
        onSend,
        onStop,
    };
}
