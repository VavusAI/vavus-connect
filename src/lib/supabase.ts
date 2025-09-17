// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Loud, actionable diagnostics in the browser console
if (!url || !anon) {
    const host = url ? new URL(url).host : "(missing)";
    // This is the anon key; it's safe to ship to the client, but we only show length to be tidy
    // eslint-disable-next-line no-console
    console.error("[Supabase] Missing envs", {
        hasUrl: !!url,
        urlHost: host,
        hasAnonKey: !!anon,
        anonLen: anon?.length ?? 0,
        hint: "Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Project Settings → Environment Variables, then redeploy."
    });
}

export const supabase = createClient(url!, anon!, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
    global: {
        headers: {
            apikey: anon || "",
            "x-client-info": "vavus-webapp",
        },
    },
});

// Small built-in sanity helpers you can call from DevTools:
if (typeof window !== "undefined") {
    (window as any).__sbEnv = {
        hasUrl: !!url,
        urlHost: url ? new URL(url).host : null,
        hasAnonKey: !!anon,
        anonLen: anon?.length ?? 0,
    };
    (window as any).__sbPing = async () => {
        try {
            // harmless metadata query to confirm connectivity
            const res = await fetch(`${url}/rest/v1/?select=%2a`, {
                headers: { apikey: anon || "", Authorization: `Bearer ${anon}` },
            });
            return { ok: res.ok, status: res.status, text: await res.text() };
        } catch (e) {
            return { ok: false, error: (e as Error).message };
        }
    };
}
