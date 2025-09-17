import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function SubscribeForm({ className = "" }: { className?: string }) {
    const { session } = useSession();
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [message, setMessage] = useState<string>("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const value = email.trim().toLowerCase();
        if (!isEmail(value)) {
            setStatus("error");
            setMessage("Please enter a valid email.");
            return;
        }

        setStatus("loading");
        setMessage("");

        // Be resilient if this ever renders on the server
        const hasWindow = typeof window !== "undefined";
        const page = hasWindow ? window.location.pathname : "/kickstarter";
        const utm = hasWindow ? (window.location.search.slice(1) || null) : null;

        try {
            // Use plain INSERT; treat duplicate as success
            const { error } = await supabase
                .from("subscriptions")
                .insert([{ email: value, user_id: session?.user?.id ?? null, page, utm }]);

            if (error) {
                // Duplicate email → success UX
                if (error.code === "23505" || /duplicate key|unique/i.test(error.message)) {
                    setStatus("ok");
                    setMessage("You’re in! We’ll keep you posted.");
                    setEmail("");
                    return;
                }
                console.error("[SubscribeForm] Supabase insert error:", error);
                setStatus("error");
                setMessage(error.message || "Something went wrong. Please try again.");
                return;
            }

            setStatus("ok");
            setMessage("You’re in! We’ll keep you posted.");
            setEmail("");
        } catch (err: any) {
            console.error("[SubscribeForm] Unexpected error:", err);
            setStatus("error");
            setMessage(err?.message || "Something went wrong. Please try again.");
        }
    }

    return (
        <form onSubmit={onSubmit} className={`flex gap-2 ${className}`}>
            <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                required
            />
            <Button type="submit" className="btn-hero" disabled={status === "loading"}>
                {status === "loading" ? "Subscribing..." : "Subscribe"}
            </Button>

            {message && (
                <p className={`text-sm mt-2 ${status === "error" ? "text-red-600" : "text-green-600"}`}>
                    {message}
                </p>
            )}
        </form>
    );
}
