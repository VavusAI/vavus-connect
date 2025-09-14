import React, { useState } from "react";
import { Zap, Settings, Upload, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { sendChat } from "@/lib/api";
import ConversationSidebar from '@/components/chat/ConversationSidebar';
import ChatMessages from '@/components/chat/ChatMessages';
import MessageInput from '@/components/chat/MessageInput';
import ScrollToBottom from '@/components/chat/ScrollToBottom';
import { updateConversationTitle } from '@/lib/api';
import useStreamedChat, { ChatMessage } from '@/hooks/useStreamedChat';

interface Conversation {
    id: string;
    title?: string | null;
    const AIChat: React.FC = () => {
    const conversations = convos as Conversation[];
    const { messages, streamText, isThinking, onSend } = useStreamedChat(activeId);
    const messagesRef = useRef<HTMLDivElement>(null);
    const el = messagesRef.current;
    const scrollToBottom = () => {
        const el = messagesRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    };
}, [messages, streamText]);
const handleSend = () => {
    onSend(inputMessage);


    type Conversation = { id: string; title?: string | null };
type Message = { id: string; role: "user" | "assistant"; content: string };

function ConversationList({
                            items,
                            activeId,
                            onSelect,
                            onNew,
                          }: {
  items: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((c) =>
      (c.title || "Untitled conversation")
          .toLowerCase()
          .includes(query.toLowerCase())
  );
  return (
      <div className="flex h-full flex-col">
        <div className="p-3">
          <Input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-2"
          />
          <Button onClick={onNew} className="w-full">
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filtered.map((c) => (
                <Button
                    key={c.id}
                    variant={activeId === c.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => onSelect(c.id)}
                >
              <span className="truncate">
                {c.title || "Untitled conversation"}
              </span>
                </Button>
            ))}
            {filtered.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">
                  No conversations
                </p>
            )}
          </div>
        </ScrollArea>
      </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
      <div className="flex justify-end">
        <div className="max-w-md rounded-lg bg-primary px-3 py-2 text-primary-foreground">
          {content}
        </div>
      </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
      <div className="flex justify-start">
        <div className="max-w-md rounded-lg bg-muted px-3 py-2">
          {content}
        </div>
      </div>
  );
}

function Placeholder({ onNew }: { onNew: () => void }) {
  return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">VAVUS AI</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={onNew} className="btn-hero">
            New Chat
          </Button>
        </div>
      </div>
  );
}

const AIChat = () => {
  const [activeId, setActiveId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const { items: convos, refresh: refreshConvos } = useConversations();
  const {
    items: messages,
    refresh: refreshMessages,
  } = useMessages(activeId);

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      const res = await sendChat({ conversationId: activeId, message: input });
      const convoId = res.conversationId;
      setInput("");
      if (!activeId) setActiveId(convoId);
      refreshMessages(convoId);
      refreshConvos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewChat = () => {
    setActiveId(undefined);
    refreshMessages();
  };

  return (
      <div className="flex h-screen">
        <aside className="hidden w-64 border-r bg-background md:flex">
          <ConversationList
              items={convos as Conversation[]}
              activeId={activeId}
              onSelect={setActiveId}
              onNew={handleNewChat}
          />
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-bold">VAVUS AI</span>
            </div>
            <div className="flex items-center gap-2">
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>
          {activeId ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {(messages as Message[]).map((m) =>
                        m.role === "user" ? (
                            <UserMessage key={m.id} content={m.content} />
                        ) : (
                            <AssistantMessage key={m.id} content={m.content} />
                        )
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="flex items-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Upload className="h-5 w-5" />
                    </Button>
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message"
                        className="flex-1 resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
