import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useConversations() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('archived', false)
            .order('updated_at', { ascending: false });

        if (!error && data) setItems(data);
        setLoading(false);
    }

    useEffect(() => {
        refresh();

        // realtime updates
        const ch = supabase
            .channel('conv-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => refresh()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, []);

    return { items, loading, refresh };
}
