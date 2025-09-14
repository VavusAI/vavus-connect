import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil } from 'lucide-react';

interface Conversation {
    id: string;
    title?: string | null;
}

interface Props {
    conversations: Conversation[];
    activeId?: string;
    onSelect: (id?: string) => void;
    onNew: () => void;
    onRename: () => void;
    loading?: boolean;
}

const ConversationSidebar: React.FC<Props> = ({
                                                  conversations,
                                                  activeId,
                                                  onSelect,
                                                  onNew,
                                                  onRename,
                                                  loading,
                                              }) => {
    return (
        <div className="flex items-center gap-2">
            <Select value={activeId ?? ''} onValueChange={(v) => onSelect(v || undefined)}>
                <SelectTrigger className="w-64">
                    <SelectValue placeholder={loading ? 'Loading…' : activeId ? 'Select conversation' : 'New conversation'} />
                </SelectTrigger>
                <SelectContent>
                    {conversations.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                            {c.title || 'Untitled conversation'}
                        </SelectItem>
                    ))}
                    {conversations.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No conversations yet</div>
                    )}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={onRename} disabled={!activeId}>
                <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onNew}>
                <Plus className="h-4 w-4 mr-1" />
                New chat
            </Button>
        </div>
    );
};

export default ConversationSidebar;