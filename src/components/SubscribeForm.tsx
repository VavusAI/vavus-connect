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

            // Single source of truth: plain INSERT; duplicate -> success
            const { error } = await supabase
                .from("subscriptions")
                .insert([{ email: clean, user_id, page: pagePath, utm }]);

            if (error) {
                if (error.code === "23505" || /duplicate key|unique/i.test(error.message)) {
                    setStatus("ok"); setMsg("You’re in! 🎉"); setEmail(""); return;
                }
                console.error("[SubscribeForm] Supabase insert error:", error);
                setStatus("error");
                setMsg(error.message || "Something went wrong. Please try again.");
                return;
            }

            setStatus("ok");
            setMsg("You’re in! 🎉");
            setEmail("");
        } catch (err: any) {
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
