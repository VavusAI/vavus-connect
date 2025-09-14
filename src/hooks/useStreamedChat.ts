import { useState, useRef, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { saveChat } from '@/lib/api';

export type ChatMessage = {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    created_at: string;
};

type SendableMsg = { role: 'system' | 'user' | 'assistant'; content: string };

type UseStreamedChatOpts = {
    /** Called when a brand-new conversation gets created on first save */
    onNewConversation?: (id: string) => void;
};

/** Strip chain-of-thought / reasoning markers */
function stripReasoning(s: string): string {
    if (!s) return s;
    let out = s;
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<\/?think>/gi, '');
    return out.trim();
}

/** ---- SSE streaming helper that talks to /api/ai-stream ---- */
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

        if (!res.ok || !res.body) {
            onError(new Error(`HTTP ${res.status}`));
            return;
        }

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
                    // ignore malformed/keepalive frames
                }
            }
        }

        onDone(full);
    } catch (e) {
        onError(e);
    }
}

/**
 * Streaming hook:
 * - streams from /api/ai-stream
 * - saves via /api/ai (saveChat)
 * - refreshes history and adopts returned conversationId if new
 * - hides CoT until first visible token (or guard timeout)
 */
export function useStreamedChat(conversationId?: string, opts: UseStreamedChatOpts = {}) {
    const { items, refresh } = useMessages(conversationId);
    const messages = items as ChatMessage[];

    const [streamText, setStreamText] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // CoT guard state
    const rawRef = useRef('');              // raw streamed text
    const answerStartedRef = useRef(false); // flips when answer begins
    const streamedIdxRef = useRef(0);
    const guardTimerRef = useRef<number | null>(null);
    const guardArmedRef = useRef(false);

    const lastUserRef = useRef<string | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    const onSend = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            lastUserRef.current = trimmed;
            setStreamText('');
            setIsThinking(true);

            // reset guard
            rawRef.current = '';
            answerStartedRef.current = false;
            streamedIdxRef.current = 0;
            guardArmedRef.current = false;
            if (guardTimerRef.current) {
                window.clearTimeout(guardTimerRef.current);
                guardTimerRef.current = null;
            }

            const controller = new AbortController();
            controllerRef.current = controller;

            const streamingMessages: SendableMsg[] = [
                { role: 'system', content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
                ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: trimmed },
            ];

            const guardMs = 1200;

            await streamChat({
                messages: streamingMessages,
                maxTokens: 1024,
                onDelta: (chunk) => {
                    rawRef.current += chunk;
                    const rawLower = rawRef.current.toLowerCase();

                    // Arm guard after first token
                    if (!guardArmedRef.current) {
                        guardArmedRef.current = true;
                        guardTimerRef.current = window.setTimeout(() => {
                            if (!answerStartedRef.current) {
                                answerStartedRef.current = true;
                                const clean = stripReasoning(rawRef.current);
                                if (clean) setStreamText(clean);
                                streamedIdxRef.current = rawRef.current.length;
                                setIsThinking(false);
                            }
                        }, guardMs) as unknown as number;
                    }

                    const closeTagIdx = rawLower.lastIndexOf('</think>');
                    if (closeTagIdx !== -1 && !answerStartedRef.current) {
                        answerStartedRef.current = true;
                        const after = rawRef.current.slice(closeTagIdx + '</think>'.length);
                        const cleanDelta = stripReasoning(after);
                        if (cleanDelta) setStreamText((prev) => prev + cleanDelta);
                        streamedIdxRef.current = rawRef.current.length;
                        if (guardTimerRef.current) {
                            window.clearTimeout(guardTimerRef.current);
                            guardTimerRef.current = null;
                        }
                        setIsThinking(false);
                        return;
                    }

                    if (answerStartedRef.current) {
                        const newPortion = rawRef.current.slice(streamedIdxRef.current);
                        const cleanDelta = stripReasoning(newPortion);
                        if (cleanDelta) setStreamText((prev) => prev + cleanDelta);
                        streamedIdxRef.current = rawRef.current.length;
                    }
                },
                onDone: async (full) => {
                    setIsThinking(false);
                    try {
                        const finalClean = stripReasoning(full);
                        setStreamText(finalClean);
                        const res = await saveChat({ conversationId, message: trimmed, assistantText: finalClean });
                        const newId: string | undefined = (res as any)?.conversationId || conversationId;
                        if (!conversationId && newId && opts.onNewConversation) {
                            opts.onNewConversation(newId);
                        }
                        await refresh(newId);
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error(e);
                    }
                },
                onError: () => {
                    setIsThinking(false);
                },
                signal: controller.signal,
            });

            controllerRef.current = null;
        },
        [messages, conversationId, refresh, opts]
    );

    const onRegenerate = useCallback(() => {
        if (lastUserRef.current) return onSend(lastUserRef.current);
    }, [onSend]);

    const onStop = useCallback(() => {
        controllerRef.current?.abort();
        setIsThinking(false);
    }, []);

    return {
        messages,
        streamText,
        isThinking,
        onSend,
        onRegenerate,
        onStop,
    };
}
