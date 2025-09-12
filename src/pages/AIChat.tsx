import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Lock, Upload, FileText, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { sendChat } from '@/lib/api';

type DbMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at: string;
};

type Mode = 'normal' | 'thinking';

/** ---- SSE streaming helper (OpenAI-style) ---- */
async function streamChat({
                            messages,
                            onDelta,
                            onDone,
                            onError,
                          }: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  onDelta: (chunk: string) => void;
  onDone: (full: string) => void;
  onError: (e: any) => void;
}) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Your /app/api/ai/route.ts forces stream:true upstream
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
        temperature: 0.3,
        max_tokens: 1024,
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
        } catch {
          // ignore keepalives/bad lines
        }
      }
    }

    onDone(full);
  } catch (e) {
    onError(e);
  }
}

const AIChat = () => {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Streaming UI state (ephemeral assistant bubble)
  const [streamText, setStreamText] = useState('');
  const [showStream, setShowStream] = useState(false);

  // Toggles
  const [mode, setMode] = useState<Mode>('normal');
  const [longMode, setLongMode] = useState(false);
  const [useInternet, setUseInternet] = useState(false);
  const [usePersona, setUsePersona] = useState(false);
  const [useWorkspace, setUseWorkspace] = useState(false);

  const { items: convos, loading: convLoading, refresh: refreshConvos } = useConversations();
  const { items: msgs, /* loading: msgsLoading */ refresh: refreshMsgs } = useMessages(activeId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Only pick default conversation once on mount
  const pickedDefaultRef = useRef(false);
  useEffect(() => {
    if (!pickedDefaultRef.current && !activeId && convos.length > 0) {
      setActiveId(convos[0].id);
      pickedDefaultRef.current = true;
    }
  }, [convos, activeId]);

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

    // Streaming context (lightweight): system + last few turns + user
    const streamingMessages = [
      { role: 'system' as const, content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
      ...msgs.slice(-6).map((m) => ({ role: m.role, content: m.content } as const)),
      { role: 'user' as const, content: text },
    ];

    // 1) Stream live tokens to UI
    await streamChat({
      messages: streamingMessages,
      onDelta: (chunk) => {
        setStreamText(prev => prev + chunk);
        scrollToBottom();
      },
      onDone: async (_final) => {
        // 2) Persist with your existing non-streaming API (recomputes server-side)
        try {
          const resp = await sendChat({
            conversationId: activeId,
            message: text,
            mode,
            longMode,
            useInternet,
            usePersona,
            useWorkspace,
          } as any);

          const { conversationId } = resp || {};
          if (conversationId) {
            setActiveId(conversationId);
            await Promise.all([refreshMsgs(conversationId), refreshConvos()]);
          } else {
            await refreshConvos();
            if (activeId) await refreshMsgs(activeId);
          }
        } catch (e: any) {
          console.error(e);
          toast({
            title: 'Saved copy may differ',
            description: 'We showed you the streamed reply, but saving might have produced a slightly different answer.',
          });
        } finally {
          setIsTyping(false);
          setShowStream(false);
          setStreamText('');
          scrollToBottom();
        }
      },
      onError: (e) => {
        setIsTyping(false);
        setShowStream(false);
        setStreamText('');
        toast({
          title: 'Streaming failed',
          description: e?.message || 'Please try again.',
          variant: 'destructive',
        });
      },
    });
  }

  function startNewConversation() {
    setActiveId(undefined);
    // messages hook will return empty until first send creates a conversation
  }

  function handleFeatureClick(name: string) {
    toast({
      title: `${name} coming soon`,
      description: 'We’ll enable uploads, OCR and export shortly.',
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
                  {convos.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title || 'Untitled conversation'}
                      </SelectItem>
                  ))}
                  {convos.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No conversations yet</div>
                  )}
                </SelectContent>
              </Select>

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
            <Card className="flex-1 p-4 mb-4 overflow-hidden">
              <div className="h-full overflow-y-auto space-y-4">
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
                        <p className="text-sm whitespace-pre-wrap">{streamText || '...'}</p>
                        <p className="text-xs mt-1 text-muted-foreground">typing…</p>
                      </div>
                    </div>
                )}

                {/* typing dots (optional; can remove since streaming bubble shows progress) */}
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

                <div ref={messagesEndRef} />
              </div>
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
