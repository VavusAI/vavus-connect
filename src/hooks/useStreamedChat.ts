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
type Opts = { onNewConversation?: (id: string) => void };

// SSE helper
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
                } catch { /* keepalives */ }
            }
        }

        onDone(full);
    } catch (e) {
        onError(e);
    }
}

export function useStreamedChat(conversationId?: string, opts: Opts = {}) {
    const { items, refresh } = useMessages(conversationId);
    const messages = items as ChatMessage[];

    const [streamText, setStreamText] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    const lastUserRef = useRef<string | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            lastUserRef.current = trimmed;
            setStreamText('');
            setIsThinking(true);

            const controller = new AbortController();
            controllerRef.current = controller;

            const streamingMessages: SendableMsg[] = [
                { role: 'system', content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
                ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: trimmed },
            ];

            await streamChat({
                messages: streamingMessages,
                maxTokens: 1024,
                onDelta: (chunk) => setStreamText((prev) => prev + chunk),
                onDone: async (full) => {
                    setIsThinking(false);
                    setStreamText('');
                    try {
                        const res = await saveChat({ conversationId, message: trimmed, assistantText: full });
                        const newId: string | undefined = (res as any)?.conversationId || conversationId;

                        if (!conversationId && newId && opts.onNewConversation) {
                            opts.onNewConversation(newId);
                        }
                        await refresh(newId);
                    } catch (e) {
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

    const regenerate = useCallback(() => {
        if (lastUserRef.current) {
            return send(lastUserRef.current);
        }
    }, [send]);

    const stop = useCallback(() => {
        controllerRef.current?.abort();
        setIsThinking(false);
    }, []);

    return {
        messages,
        streamText,
        isThinking,
        onSend: send,
        onRegenerate: regenerate,
        onStop: stop,
    };
}

export default useStreamedChat;
