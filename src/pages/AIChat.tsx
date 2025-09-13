import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Lock, Upload, FileText, Download, Plus, ArrowDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { saveChat, updateConversationTitle } from '@/lib/api';
import { Loader } from 'lucide-react';

type DbMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at: string;
};

type Mode = 'normal' | 'thinking';
type Conversation = { id: string; title?: string | null };

/** Strip any chain-of-thought / reasoning before showing or saving */
function stripReasoning(s: string): string {
  if (!s) return s;
  let out = s;
  // Remove <think> ... </think>
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Remove fenced reasoning blocks like ```thinking
  out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
  // Clean stray tags just in case
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
  onDone: (full: string, info?: { finishReason?: string }) => void;
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
    let finishReason: string | undefined;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line
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
          const fr = json?.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
        } catch {
          // ignore keepalives/bad lines
        }
      }
    }

    onDone(full, { finishReason });
  } catch (e) {
    onError(e);
  }
}

const AIChat = () => {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Streaming UI state
  const [streamText, setStreamText] = useState(''); // shows the final answer tokens (no CoT)
  const [showStream, setShowStream] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // for thinking mode indicator

  // Internal streaming guards to hide CoT until it ends
  const rawRef = useRef('');                 // full raw streamed text (may contain CoT)
  const answerStartedRef = useRef(false);    // flips true once we detect answer segment
  const streamedIndexRef = useRef(0);        // last index of rawRef we've shown to the user

  // Fallback guard: if no <think> detected, we still suppress early fluff
  const guardTimerRef = useRef<number | null>(null);
  const guardArmedRef = useRef(false);

  // Toggles
  const [mode, setMode] = useState<Mode>('normal');
  const [longMode, setLongMode] = useState(false);
  const [useInternet, setUseInternet] = useState(false);
  const [usePersona, setUsePersona] = useState(false);
  const [useWorkspace, setUseWorkspace] = useState(false);

  const { items: convos, loading: convLoading, refresh: refreshConvos } = useConversations();
  const { items: msgs, /* loading: msgsLoading */ refresh: refreshMsgs } = useMessages(activeId);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = () => {
    if (!isNearBottomRef.current) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    isNearBottomRef.current = true;
    setIsNearBottom(true);
  };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = near;
    setIsNearBottom(near);
  };

  // Only pick default conversation once on mount
  const pickedDefaultRef = useRef(false);
  useEffect(() => {
    if (!pickedDefaultRef.current && !activeId && convos.length > 0) {
      setActiveId(convos[0].id);
      pickedDefaultRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convos]);

  useEffect(() => {
    scrollToBottom();
  }, [msgs, isTyping, showStream, streamText]);

  async function handleSendMessage() {
    const text = inputMessage.trim();
    if (!text) return;

    // reset UI
    setIsTyping(true);
    setInputMessage('');
    setShowStream(true);
    setStreamText('');
    rawRef.current = '';
    answerStartedRef.current = false;
    streamedIndexRef.current = 0;
    guardArmedRef.current = false;
    if (guardTimerRef.current) {
      window.clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }

    // Guard time based on mode (short for normal/final, long for thinking if needed)
    let guardMs = mode === 'normal' ? 500 : 5000;

    // Streaming context: base prompt
    let streamingMessages = [
      { role: 'system' as const, content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
      ...msgs.slice(-6).map((m) => ({ role: m.role, content: m.content } as const)),
      { role: 'user' as const, content: text },
    ];

    if (mode === 'normal') {
      streamingMessages.splice(1, 0, {
        role: 'system' as const,
        content: 'If you need to reason step-by-step, enclose it in <think> ... </think>. Otherwise, respond directly with only the final answer. Do not add extra text or formatting unless asked.',
      });
    }

    const maxTokens = mode === 'thinking' ? (longMode ? 4096 : 2048) : (longMode ? 2048 : 1024);

    // Thinking mode: do a non-persist reasoning pass, then stream the final answer
    if (mode === 'thinking') {
      setIsThinking(true);
      try {
        // Non-persist internal reasoning call to /api/ai
        const { reply } = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeId,
            message: text,
            mode: 'thinking',
            longMode,
            useInternet,
            usePersona,
            useWorkspace,
            skipStrip: true,     // return full reasoning
            noPersist: true,     // <-- do not save this step
          }),
        }).then(res => res.json());

        // Strip any tags before embedding back as context
        const reasoning = stripReasoning(reply || '');
        streamingMessages.push({
          role: 'system',
          content: `[Internal Reasoning]\n${reasoning}\n\nNow provide ONLY the final answer in plain language. Do not include <think> or any analysis.`,
        });

        // For the final stream in thinking, shorten guard
        guardMs = 500;
      } catch (e) {
        toast({ title: 'Thinking failed', description: 'Error during reasoning step.', variant: 'destructive' });
        setIsTyping(false);
        setShowStream(false);
        setIsThinking(false);
        return;
      }
    }

    // 1) Stream live tokens, but only show tokens after end-of-reasoning boundary
    await streamChat({
      messages: streamingMessages,
      maxTokens,

      onDelta: (chunk) => {
        // accumulate raw text (which may contain CoT)
        rawRef.current += chunk;
        const rawLower = rawRef.current.toLowerCase();

        // Start a fallback guard once the first token arrives (if we haven't armed it)
        if (!guardArmedRef.current) {
          guardArmedRef.current = true;
          guardTimerRef.current = window.setTimeout(() => {
            // If no explicit </think> boundary was detected within the guard window,
            // assume no thinking and flush the entire buffer as the answer.
            if (!answerStartedRef.current) {
              answerStartedRef.current = true;
              const newPortion = rawRef.current.slice(0);
              const cleanDelta = stripReasoning(newPortion);
              if (cleanDelta) setStreamText(prev => prev + cleanDelta);
              streamedIndexRef.current = rawRef.current.length;
              setIsThinking(false);
              scrollToBottom();
            }
          }, guardMs) as unknown as number;
        }

        // 1) Preferred: look for explicit </think>
        if (!answerStartedRef.current) {
          const endIdx = rawLower.lastIndexOf('</think>');
          if (endIdx !== -1) {
            answerStartedRef.current = true;
            // Show any content AFTER </think>
            const after = rawRef.current.slice(endIdx + '</think>'.length);
            const cleanAfter = stripReasoning(after);
            if (cleanAfter) setStreamText(prev => prev + cleanAfter);
            streamedIndexRef.current = rawRef.current.length;
            setIsThinking(false); // Hide spinner once answer starts
            scrollToBottom();
            return;
          }
          // Still thinking; do not show anything yet
          scrollToBottom();
          return;
        }

        // 2) Already in answer mode: show only the new part since last time
        const newPortion = rawRef.current.slice(streamedIndexRef.current);
        streamedIndexRef.current = rawRef.current.length;
        const cleanDelta = stripReasoning(newPortion);
        if (cleanDelta) {
          setStreamText(prev => prev + cleanDelta);
          scrollToBottom();
        }
      },

      onDone: async (_final, info) => {
        if (guardTimerRef.current) {
          window.clearTimeout(guardTimerRef.current);
          guardTimerRef.current = null;
        }

        // Clean the final answer completely (belt & suspenders)
        const clean = stripReasoning(_final);

        // 2) Save conversation with final assistant text (already cleaned)
        try {
          const resp = await saveChat({
            conversationId: activeId,
            message: text,
            assistantText: clean,
            mode,
            longMode,
            useInternet,
            usePersona,
            useWorkspace,
          });

          const { conversationId } = resp || {};
          if (conversationId) {
            setActiveId(conversationId);
            await Promise.all([refreshMsgs(conversationId), refreshConvos()]);
          } else {
            await refreshConvos();
            if (activeId) await refreshMsgs(activeId);
          }
        } catch (e: unknown) {
          console.error(e);
          toast({
            title: 'Failed to save chat',
            description: e instanceof Error ? e.message : 'Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsTyping(false);
          setShowStream(false); // hide the ephemeral bubble; final message is now in history
          setStreamText('');
          rawRef.current = '';
          answerStartedRef.current = false;
          streamedIndexRef.current = 0;
          guardArmedRef.current = false;
          setIsThinking(false);
          scrollToBottom();
        }
        if (info?.finishReason === 'length') {
          toast({
            title: 'Response truncated',
            description: 'The model hit the max token limit. Consider enabling Long memory or asking to continue.',
          });
        }
      },

      onError: (e: unknown) => {
        if (guardTimerRef.current) {
          window.clearTimeout(guardTimerRef.current);
          guardTimerRef.current = null;
        }
        setIsTyping(false);
        setShowStream(false);
        setStreamText('');
        rawRef.current = '';
        answerStartedRef.current = false;
        streamedIndexRef.current = 0;
        guardArmedRef.current = false;
        setIsThinking(false);
        toast({
          title: 'Streaming failed',
          description: e instanceof Error ? e.message : 'Please try again.',
          variant: 'destructive',
        });
      },
    });
  }

  function startNewConversation() {
    setActiveId(undefined);
    isNearBottomRef.current = true;
    setIsNearBottom(true);
    setInputMessage('');
    setStreamText('');
    setShowStream(false);
    setIsTyping(false);
    rawRef.current = '';
    answerStartedRef.current = false;
    streamedIndexRef.current = 0;
    guardArmedRef.current = false;
    if (guardTimerRef.current) {
      window.clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }
    refreshConvos();
  }

  function handleFeatureClick(name: string) {
    toast({
      title: `${name} coming soon`,
      description: 'We’ll enable uploads, OCR and export shortly.',
    });
  }

  async function handleRenameConversation() {
    if (!activeId) return;
    const currentTitle = (convos as any[]).find((c) => c.id === activeId)?.title || '';
    const newTitle = prompt('Rename conversation', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
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

  return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-left">
              <h1 className="mb-1">
                <span className="gradient-text">AI Chat Assistant</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Your conversations are saved privately to your account.
              </p>
            </div>

            {/* Conversation picker */}
            <div className="flex items-center gap-2">
              <Select
                  value={activeId ?? ''}
                  onValueChange={(v) => setActiveId(v || undefined)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={convLoading ? 'Loading…' : (activeId ? 'Select conversation' : 'New conversation')} />
                </SelectTrigger>
                <SelectContent>
                  {(convos as Conversation[]).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title || 'Untitled conversation'}
                      </SelectItem>
                  ))}
                  {convos.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No conversations yet</div>
                  )}
                </SelectContent>
              </Select>
              <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRenameConversation}
                  disabled={!activeId}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={startNewConversation}>
                <Plus className="h-4 w-4 mr-1" />
                New chat
              </Button>
            </div>
          </div>

          {/* Demo/Info Notice */}
          <div className="mb-6 p-3 bg-accent-brand-light border border-accent-brand/20 rounded-lg text-center">
            <p className="text-sm text-accent-brand font-medium inline-flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Only you can see your conversations.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="mb-4 rounded-lg border bg-surface px-3 py-2 shadow-sm">
            {/* Row 1: Mode + Long memory */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mode</span>
                <div className="inline-flex rounded-lg border p-0.5">
                  <Button
                      type="button"
                      size="sm"
                      variant={mode === 'normal' ? 'default' : 'ghost'}
                      onClick={() => setMode('normal')}
                      className={mode === 'normal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}
                  >
                    Fast
                  </Button>
                  <Button
                      type="button"
                      size="sm"
                      variant={mode === 'thinking' ? 'default' : 'ghost'}
                      onClick={() => setMode('thinking')}
                      className={mode === 'thinking' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}
                  >
                    Thinking
                  </Button>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={longMode}
                    onChange={(e) => setLongMode(e.target.checked)}
                />
                <span className="text-foreground">Long memory / Deep context</span>
              </label>
            </div>

            {/* Row 2: Persona / Workspace / Internet */}
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={usePersona}
                    onChange={(e) => setUsePersona(e.target.checked)}
                />
                <span className="text-foreground">Use my Persona</span>
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={useWorkspace}
                    onChange={(e) => setUseWorkspace(e.target.checked)}
                />
                <span className="text-foreground">Use Workspace Memory</span>
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={useInternet}
                    onChange={(e) => setUseInternet(e.target.checked)}
                />
                <span className="text-foreground">Use internet for this reply</span>
              </label>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex flex-col h-[600px]">
            {/* Chat Messages */}
            <Card className="flex-1 p-4 mb-4 overflow-hidden relative">
              <div
                  ref={messagesContainerRef}
                  className="h-full overflow-y-auto space-y-4"
                  onScroll={handleScroll}
              >
                {msgs.map((m: DbMessage) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                              m.role === 'user'
                                  ? 'bg-gradient-hero text-white'
                                  : 'bg-surface text-foreground border border-border'
                          }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        <p
                            className={`text-xs mt-1 ${
                                m.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                            }`}
                        >
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                ))}

                {/* Ephemeral streaming assistant bubble */}
                {showStream && (
                    <div className="flex justify-start">
                      <div className="bg-surface text-foreground border border-border p-3 rounded-lg max-w-[80%]">
                        <div className="flex items-center">
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                          <p className="text-sm whitespace-pre-wrap">
                            {answerStartedRef.current
                                ? (streamText || '…')
                                : 'Thinking...'}
                          </p>
                        </div>
                        {!answerStartedRef.current && (
                            <p className="text-xs mt-1 text-muted-foreground">working on a reply</p>
                        )}
                      </div>
                    </div>
                )}

                {/* typing dots (kept as fallback when no stream bubble) */}
                {isTyping && !showStream && (
                    <div className="flex justify-start">
                      <div className="bg-surface border border-border p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                )}

              </div>
              {!isNearBottom && (
                  <Button
                      onClick={() => {
                        isNearBottomRef.current = true;
                        scrollToBottom();
                      }}
                      size="sm"
                      className="absolute bottom-4 right-4"
                  >
                    <ArrowDown className="h-4 w-4 mr-1" />
                    Jump to latest
                  </Button>
              )}
            </Card>

            {/* Input Area */}
            <div className="space-y-4">
              {/* Pending Features */}
              <div className="flex space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeatureClick('File Upload')}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeatureClick('OCR')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  OCR
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeatureClick('Export Chat')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                    placeholder="Type your message…"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 focus-ring"
                />
                <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="btn-hero"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Feature Preview */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg border border-border">
              <div className="bg-primary-light p-3 rounded-lg w-fit mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Multi-turn Conversations</h3>
              <p className="text-sm text-muted-foreground">Maintain context across long conversations</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg border border-border">
              <div className="bg-accent-brand-light p-3 rounded-lg w-fit mx-auto mb-4">
                <FileText className="h-6 w-6 text-accent-brand" />
              </div>
              <h3 className="font-semibold mb-2">Document Analysis</h3>
              <p className="text-sm text-muted-foreground">Upload and analyze documents with AI</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg border border-border">
              <div className="bg-success/20 p-3 rounded-lg w-fit mx-auto mb-4">
                <Lock className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Private & Secure</h3>
              <p className="text-sm text-muted-foreground">All conversations encrypted and private</p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AIChat;
