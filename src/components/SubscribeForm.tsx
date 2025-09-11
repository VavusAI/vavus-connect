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
        const value = email.trim();

        if (!isEmail(value)) {
            setStatus("error");
            setMessage("Please enter a valid email.");
            return;
        }

        setStatus("loading");
        setMessage("");

        const page = window.location.pathname;
        const utm = window.location.search.slice(1); // raw query string

        // upsert avoids duplicate errors thanks to UNIQUE index (lower(email))
        const { error } = await supabase
            .from("subscriptions")
            .upsert(
                {
                    email: value.toLowerCase(),
                    user_id: session?.user?.id ?? null,
                    page,
                    utm
                },
                { onConflict: "email" }
            );

        if (error) {
            setStatus("error");
            setMessage("Something went wrong. Please try again.");
            return;
        }

        setStatus("ok");
        setMessage("You’re in! We’ll keep you posted.");
        setEmail("");
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
                <p
                    className={`text-sm mt-2 ${
                        status === "error" ? "text-red-600" : "text-green-600"
                    }`}
                >
                    {message}
                </p>
            )}
        </form>
    );
}
