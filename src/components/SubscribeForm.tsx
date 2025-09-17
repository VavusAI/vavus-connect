import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Props = { className?: string; page?: string };

export default function SubscribeForm({ className = "", page }: Props) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
    const [msg, setMsg] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const clean = email.trim().toLowerCase();

        if (!isEmail(clean)) {
            setStatus("error");
            setMsg("Please enter a valid email.");
            return;
        }

        setStatus("loading");
        setMsg("");

        // context capture (works client and won’t crash on SSR)
        const hasWin = typeof window !== "undefined";
        const pagePath = page ?? (hasWin ? window.location.pathname : "/kickstarter");
        const utm = hasWin ? (window.location.search.slice(1) || null) : null;

        try {
            // Try to get user id (ok if unauthenticated)
            let user_id: string | null = null;
            try {
                const { data } = await supabase.auth.getUser();
                user_id = data?.user?.id ?? null;
            } catch { /* ignore */ }

            // === A) Primary path: supabase-js insert ===
            const { error } = await supabase
                .from("subscriptions")
                .insert([{ email: clean, user_id, page: pagePath, utm }]);

            if (error) {
                // Duplicate -> treat as success
                if (error.code === "23505" || /duplicate key|unique/i.test(error.message)) {
                    setStatus("ok"); setMsg("You’re in! 🎉"); setEmail(""); return;
                }

                // If supabase-js is misconfigured, fall back to raw REST to diagnose
                const fallback = await tryRestInsert(clean, user_id, pagePath, utm);
                if (fallback.ok) {
                    setStatus("ok"); setMsg("You’re in! 🎉 (via REST)"); setEmail(""); return;
                }

                console.error("[SubscribeForm] Supabase error:", error, "REST fallback:", fallback);
                setStatus("error");
                setMsg(fallback.message || error.message || "Something went wrong. Please try again.");
                return;
            }

            setStatus("ok");
            setMsg("You’re in! 🎉");
            setEmail("");
        } catch (err: any) {
            // Network/config errors surface here
            console.error("[SubscribeForm] Unexpected:", err);
            setStatus("error");
            setMsg(err?.message || "Network error. Check Supabase URL/key.");
        }
    }

    return (
        <form onSubmit={onSubmit} className={`flex gap-3 ${className}`}>
            <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="md:w-96"
                disabled={status === "loading"}
                required
            />
            <Button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Subscribing…" : "Subscribe"}
            </Button>
            {msg && (
                <span className={`text-sm self-center ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {msg}
        </span>
            )}
        </form>
    );
}

/**
 * Fallback: direct REST call to isolate client config issues.
 * If this works, your DB/policies are fine and the issue is supabase-js/env.
 */
async function tryRestInsert(
    email: string,
    user_id: string | null,
    page: string | null,
    utm: string | null
): Promise<{ ok: boolean; message?: string }> {
    try {
        // These must be defined at build time in Vercel
        const url = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
        const anon = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

        if (!url || !anon) {
            return { ok: false, message: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY." };
        }

        const res = await fetch(`${url}/rest/v1/subscriptions`, {
            method: "POST",
            headers: {
                "apikey": anon,
                "Authorization": `Bearer ${anon}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify([{ email, user_id, page, utm }])
        });

        if (res.ok) return { ok: true };

        const text = await res.text();
        // 409 duplicate -> success UX
        if (res.status === 409 || /duplicate key|unique/i.test(text)) {
            return { ok: true };
        }
        return { ok: false, message: `REST ${res.status}: ${text}` };
    } catch (e: any) {
        return { ok: false, message: e?.message || "REST network error" };
    }
}
