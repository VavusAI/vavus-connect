import { useState, useRef, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { saveChat } from '@/lib/api';

export type ChatMessage = {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    created_at: string;
};

// basic SSE streaming helper
async function streamChat({
                              messages,
                              maxTokens,
                              onDelta,
                              onDone,
                              onError,
                              signal,
                          }: {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
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
                const line = part.split('\n').find(l => l.startsWith('data:'));
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
                        json?.choices?.[0]?.message?.content ?? '';
                    if (delta) {
                        full += delta;
                        onDelta(delta);
                    }
                } catch {
                    // ignore malformed lines
                }
            }
        }
        onDone(full);
    } catch (e) {
        onError(e);
    }
}

export function useStreamedChat(conversationId?: string) {
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

            const streamingMessages = [
                { role: 'system' as const, content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
                ...messages.slice(-6).map(m => ({ role: m.role as const, content: m.content })),
                { role: 'user' as const, content: trimmed },
            ];

            await streamChat({
                messages: streamingMessages,
                maxTokens: 1024,
                onDelta: (chunk) => setStreamText(prev => prev + chunk),
                onDone: async (full) => {
                    setIsThinking(false);
                    setStreamText('');
                    await saveChat({ conversationId, message: trimmed, assistantText: full });
                    await refresh(conversationId);
                },
                onError: () => {
                    setIsThinking(false);
                },
                signal: controller.signal,
            });

            controllerRef.current = null;
        },
        [messages, conversationId, refresh]
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