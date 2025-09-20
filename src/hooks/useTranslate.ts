// /src/hooks/useTranslate.ts
import { useState, useCallback } from 'react';
import { codeForApi } from '@/lib/languages/madlad';

export function useTranslate() {
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState<string | null>(null);

    const translate = useCallback(async (opts: { text: string; source?: string | null; target: string; model?: string }) => {
        setLoading(true); setError(null);
        try {
            const payload: Record<string, unknown> = {
                text: opts.text,
                source: opts.source ? codeForApi(opts.source) : 'auto',
                target: codeForApi(opts.target),
            };
            if (opts.model) payload.model = opts.model;
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || 'Translation failed');
            }
            const j = await res.json();
            return j.translation as string;
        } catch (e: any) {
            setError(e?.message || 'Translation failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    return { translate, loading, error };
}