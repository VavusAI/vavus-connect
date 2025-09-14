import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Plus, Pencil, ArrowDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { saveChat, updateConversationTitle } from '@/lib/api';

type DbMessage = {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    created_at: string;
};
type Conversation = { id: string; title?: string | null };
type Mode = 'normal' | 'thinking';

/** Strip any chain-of-thought / reasoning before showing or saving */
function stripReasoning(s: string): string {
    if (!s) return s;
    let out = s;
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<\/?think>/gi, '');
    return out.trim();
}

/** ---- SSE streaming helper (OpenAI-style) ---- */
async function streamChat({
                              messages,
                              maxTokens,
                              onDelta,
                              onDone,
                              onError,
                          }: {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    maxTokens: number;
    onDelta: (chunk: string) => void;
    onDone: (full: string) => void;
    onError: (e: unknown) => void;
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
                // Basic SSE: look for a data: line
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
                    // ignore malformed/keepalive lines
                }
            }
        }

        onDone(full);
    } catch (e) {
        onError(e);
    }
}

const SCROLL_SNAP_PX = 64;

const AIChat: React.FC = () => {
    const { toast } = useToast();

    // Conversation + history
    const [activeId, setActiveId] = useState<string | undefined>(undefined);
    const { items: convos, loading: convLoading, refresh: refreshConvos } = useConversations(); // loads list + realtime :contentReference[oaicite:5]{index=5}
    const { items: msgs, loading: msgsLoading, refresh: refreshMsgs } = useMessages(activeId); // loads history + realtime per-conv :contentReference[oaicite:6]{index=6}

    // Composer + controls
    const [input, setInput] = useState('');
    const [useInternet, setUseInternet] = useState(false);
    const [usePersona, setUsePersona] = useState(false);
    const [longMode, setLongMode] = useState(false);

    // Streaming UI state (we only render final answer, not CoT)
    const [isTyping, setIsTyping] = useState(false);
    const [streamText, setStreamText] = useState('');

    // Internal guards to hide CoT until it ends
    const rawRef = useRef('');              // raw streamed text (may contain CoT)
    const answerStartedRef = useRef(false); // flips once answer segment begins
    const streamedIdxRef = useRef(0);       // last index already flushed to UI
    const guardTimerRef = useRef<number | null>(null);
    const guardArmedRef = useRef(false);

    // Scroll helpers
    const listRef = useRef<HTMLDivElement>(null);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const onScroll = () => {
        const el = listRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_SNAP_PX;
        setIsNearBottom(atBottom);
    };
    const scrollToBottom = () => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    };
    useEffect(() => {
        if (isNearBottom) scrollToBottom();
    }, [msgs?.length, streamText, isNearBottom]);

    const visibleMessages = useMemo(() => {
        const base = (msgs as DbMessage[]) || [];
        if (!streamText) return base;
        return [
            ...base,
            {
                id: 'streaming',
                role: 'assistant' as const,
                content: streamText,
                created_at: new Date().toISOString(),
            },
        ];
    }, [msgs, streamText]);

    function startNewConversation() {
        setActiveId(undefined);
        setInput('');
        setStreamText('');
        setIsTyping(false);
        rawRef.current = '';
        answerStartedRef.current = false;
        streamedIdxRef.current = 0;
        guardArmedRef.current = false;
        if (guardTimerRef.current) {
            window.clearTimeout(guardTimerRef.current);
            guardTimerRef.current = null;
        }
        refreshConvos();
    }

    async function handleRenameConversation() {
        if (!activeId) return;
        const current = (convos as any[]).find((c) => c.id === activeId)?.title || '';
        const newTitle = window.prompt('Rename conversation', current);
        if (!newTitle || newTitle === current) return;
        try {
            await updateConversationTitle(activeId, newTitle);
            refreshConvos();
        } catch (e: any) {
            toast({
                title: 'Rename failed',
                description: e?.message || 'Please try again.',
                variant: 'destructive',
            });
        }
    }

    async function handleSend() {
        const text = input.trim();
        if (!text || isTyping) return;

        setInput('');
        setIsTyping(true);
        setStreamText('');
        rawRef.current = '';
        answerStartedRef.current = false;
        streamedIdxRef.current = 0;
        guardArmedRef.current = false;
        if (guardTimerRef.current) {
            window.clearTimeout(guardTimerRef.current);
            guardTimerRef.current = null;
        }

        // Build base streaming context (last ~6 turns + system) — matches your prior approach. :contentReference[oaicite:7]{index=7}
        let streamingMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            { role: 'system', content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
            ...(msgs as DbMessage[]).slice(-6).map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
        ];

        const mode: Mode = useInternet || usePersona ? 'thinking' : 'normal';
        let guardMs = 1200;

        // Optional thinking prepass (non-persist) to enable persona/web server logic; nothing shown to user. :contentReference[oaicite:8]{index=8}
        if (mode === 'thinking') {
            try {
                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: activeId,
                        message: text,
                        mode: 'thinking',
                        longMode,
                        useInternet,
                        usePersona,
                        useWorkspace: false,
                        skipStrip: true, // let us strip locally
                        noPersist: true, // do not save this step
                    }),
                });
                const { reply } = await res.json();
                const reasoning = stripReasoning(reply || '');
                if (reasoning) {
                    streamingMessages.push({
                        role: 'system',
                        content:
                            `[Internal Reasoning]\n${reasoning}\n\nNow provide ONLY the final answer in plain language. Do not include <think> or analysis.`,
                    });
                }
                guardMs = 500; // shorter guard when we’ve primed the model
            } catch {
                toast({
                    title: 'Thinking failed',
                    description: 'Continuing without internet/persona prepass.',
                });
            }
        }

        const maxTokens = longMode ? 2048 : 1024;

        await streamChat({
            messages: streamingMessages,
            maxTokens,
            onDelta: (chunk) => {
                // Accumulate raw (may include CoT). Guard until </think> or timeout.
                rawRef.current += chunk;
                const rawLower = rawRef.current.toLowerCase();

                // Arm a fallback guard after first token
                if (!guardArmedRef.current) {
                    guardArmedRef.current = true;
                    guardTimerRef.current = window.setTimeout(() => {
                        if (!answerStartedRef.current) {
                            answerStartedRef.current = true;
                            const clean = stripReasoning(rawRef.current);
                            if (clean) setStreamText(clean);
                            streamedIdxRef.current = rawRef.current.length;
                            scrollToBottom();
                        }
                    }, guardMs) as unknown as number;
                }

                // If we detect explicit end of thinking, flush only the clean answer tail
                const closeTagIdx = rawLower.lastIndexOf('</think>');
                if (closeTagIdx !== -1 && !answerStartedRef.current) {
                    answerStartedRef.current = true;
                    // Start showing text strictly AFTER </think>
                    const after = rawRef.current.slice(closeTagIdx + '</think>'.length);
                    const cleanDelta = stripReasoning(after);
                    if (cleanDelta) setStreamText((prev) => prev + cleanDelta);
                    streamedIdxRef.current = rawRef.current.length;
                    if (guardTimerRef.current) {
                        window.clearTimeout(guardTimerRef.current);
                        guardTimerRef.current = null;
                    }
                    scrollToBottom();
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
                try {
                    const finalClean = stripReasoning(full);
                    setStreamText(finalClean);
                    // Persist the user+assistant turn; API can create a new conversation if missing.
                    const r = await saveChat({
                        conversationId: activeId,
                        message: text,
                        assistantText: finalClean,
                        mode,
                        longMode,
                        useInternet,
                        usePersona,
                        useWorkspace: false,
                    });
                    const returnedId = (r as any)?.conversationId || activeId;
                    if (!activeId && returnedId) {
                        setActiveId(returnedId);
                    }
                    await Promise.all([refreshMsgs(returnedId), refreshConvos()]);
                } catch (e: any) {
                    toast({
                        title: 'Save failed',
                        description: e?.message || 'Could not save this turn.',
                        variant: 'destructive',
                    });
                } finally {
                    setIsTyping(false);
                    // ensure we’re pinned to bottom at end
                    setTimeout(scrollToBottom, 50);
                }
            },
            onError: (e) => {
                setIsTyping(false);
                toast({
                    title: 'Stream error',
                    description: e instanceof Error ? e.message : 'Something went wrong.',
                    variant: 'destructive',
                });
            },
        });
    }

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-left">
                        <h1 className="mb-1">
                            <span className="gradient-text">AI Chat Assistant</span>
                        </h1>
                        <p className="text-sm text-muted-foreground">Your conversations are saved privately to your account.</p>
                    </div>

                    {/* Conversation picker */}
                    <div className="flex items-center gap-2">
                        <Select value={activeId ?? ''} onValueChange={(v) => setActiveId(v || undefined)}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder={convLoading ? 'Loading…' : activeId ? 'Select conversation' : 'New conversation'} />
                            </SelectTrigger>
                            <SelectContent>
                                {(convos as Conversation[]).map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.title || 'Untitled conversation'}
                                    </SelectItem>
                                ))}
                                {(convos as Conversation[]).length === 0 && (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">No conversations yet</div>
                                )}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={handleRenameConversation} disabled={!activeId}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={startNewConversation}>
                            <Plus className="h-4 w-4 mr-1" />
                            New chat
                        </Button>
                    </div>
                </div>

                {/* Notice */}
                <div className="mb-6 p-3 bg-accent-brand-light border border-accent-brand/20 rounded-lg text-center">
                    <p className="text-sm text-accent-brand font-medium inline-flex items-center">
                        <Lock className="h-4 w-4 mr-1" />
                        Only you can see your conversations.
                    </p>
                </div>

                {/* Controls */}
                <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <div className="font-medium">Internet</div>
                            <div className="text-xs text-muted-foreground">Enable web browsing in reasoning pass</div>
                        </div>
                        <Switch checked={useInternet} onCheckedChange={setUseInternet} />
                    </label>

                    <label className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <div className="font-medium">Persona</div>
                            <div className="text-xs text-muted-foreground">Use your saved assistant persona</div>
                        </div>
                        <Switch checked={usePersona} onCheckedChange={setUsePersona} />
                    </label>

                    <label className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <div className="font-medium">Long mode</div>
                            <div className="text-xs text-muted-foreground">Allow longer answers</div>
                        </div>
                        <Switch checked={longMode} onCheckedChange={setLongMode} />
                    </label>
                </div>

                {/* Messages */}
                <div
                    ref={listRef}
                    onScroll={onScroll}
                    className="relative h-[56vh] overflow-y-auto rounded-lg border bg-background p-4"
                >
                    {msgsLoading && (msgs?.length ?? 0) === 0 ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : (
                        <div className="space-y-3">
                            {(visibleMessages as DbMessage[]).map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                            m.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-foreground'
                                        }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Scroll-to-bottom */}
                    {!isNearBottom && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={scrollToBottom}
                            className="absolute bottom-4 right-4 shadow-md"
                        >
                            <ArrowDown className="h-4 w-4 mr-1" />
                            Jump to latest
                        </Button>
                    )}
                </div>

                {/* Composer */}
                <div className="mt-3 flex gap-2">
                    <Input
                        placeholder="Type your message…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="btn-hero">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
