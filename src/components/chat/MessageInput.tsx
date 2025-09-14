import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface Props {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    disabled?: boolean;
}

const MessageInput: React.FC<Props> = ({ value, onChange, onSend, disabled }) => {
    return (
        <div className="flex space-x-2">
            <Input
                placeholder="Type your message…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
                className="flex-1 focus-ring"
            />
            <Button onClick={onSend} disabled={!value.trim() || disabled} className="btn-hero">
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
};

export default MessageInput;