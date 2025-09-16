import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: auth } = await supabase.auth.getUser();
            const uid = auth.user?.id;
            if (!uid) {
                if (mounted) setIsAdmin(false);
                return;
            }
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', uid)
                .maybeSingle();
            if (mounted) setIsAdmin(!!data?.is_admin && !error);
        })();
        return () => { mounted = false; };
    }, []);

    return isAdmin; // null = loading
}
