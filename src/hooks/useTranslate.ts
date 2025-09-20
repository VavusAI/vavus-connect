// /src/hooks/useTranslate.ts
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { codeForApi, LanguageCodeError } from '@/lib/languages/madlad';

export function useTranslate() {
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState<string | null>(null);

    const translate = useCallback(async (opts: { text: string; source?: string | null; target: string; model?: string }) => {
        setLoading(true); setError(null);
        try {
            let safeSource = 'auto';
            let safeTarget: string;
            try {
                safeSource = opts.source ? codeForApi(opts.source) : 'auto';
                safeTarget = codeForApi(opts.target);
            } catch (err) {
                if (err instanceof LanguageCodeError) {
                    const message = err.message || 'Unsupported language selection';
                    setError(message);
                    toast({
                        title: 'Unsupported language',
                        description: message,
                        variant: 'destructive',
                    });
                }
                throw err;
            }

            const payload: Record<string, unknown> = {
                text: opts.text,
                source: safeSource,
                target: safeTarget,
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