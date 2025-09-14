import React from 'react';
import { Card } from '@/components/ui/card';
import { ChatMessage } from '@/hooks/useStreamedChat';

interface Props {
    messages: ChatMessage[];
    streamText: string;
    isThinking: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    onScroll: () => void;
}

const ChatMessages: React.FC<Props> = ({ messages, streamText, isThinking, containerRef, onScroll }) => {
    return (
        <Card ref={containerRef} className="mb-4 p-4 h-[480px] overflow-y-auto" onScroll={onScroll}>
            <div className="space-y-4">
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="bg-surface border border-border p-3 rounded-lg whitespace-pre-wrap">
                            {m.content}
                        </div>
                    </div>
                ))}
                {streamText && (
                    <div className="flex justify-start">
                        <div className="bg-surface border border-border p-3 rounded-lg whitespace-pre-wrap">
                            {streamText}
                        </div>
                    </div>
                )}
                {isThinking && !streamText && (
                    <div className="flex justify-start">
                        <div className="bg-surface border border-border p-3 rounded-lg">
                            <span className="animate-pulse text-sm">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ChatMessages;