import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useMessages(conversationId?: string) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    async function refresh(id = conversationId) {
        if (!id) {
            setItems([]);
            return;
        }        setLoading(true);
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (!error && data) setItems(data);
        setLoading(false);
    }

    useEffect(() => {
        if (!conversationId) {
            setItems([]);
            return;
        }
        refresh(conversationId);
        const ch = supabase
            .channel(`msg-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => refresh()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [conversationId]);

    return { items, loading, refresh };
}
