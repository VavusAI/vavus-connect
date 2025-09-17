// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
    const host = url ? new URL(url).host : "(missing)";
    console.error("[Supabase] Missing envs", {
        hasUrl: !!url, urlHost: host, hasAnonKey: !!anon, anonLen: anon?.length ?? 0
    });
}

export const supabase = createClient(url!, anon!, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: { headers: { apikey: anon || "" } },
});

// Expose quick test helpers in the browser console
if (typeof window !== "undefined") {
    (window as any).__sb = supabase;
    (window as any).__sbEnv = { hasUrl: !!url, urlHost: url ? new URL(url).host : null, hasAnonKey: !!anon, anonLen: anon?.length ?? 0 };
    (window as any).__sbPing = async () => {
        try {
            const res = await fetch(`${url}/rest/v1/?select=%2a`, {
                headers: { apikey: anon || "", Authorization: `Bearer ${anon}` },
            });
            return { ok: res.ok, status: res.status, text: await res.text() };
        } catch (e:any) {
            return { ok: false, error: e.message };
        }
    };
}
