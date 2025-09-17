import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubscribed?: () => void; // notify parent when subscribed
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
                                                                  isOpen,
                                                                  onClose,
                                                                  onSubscribed,
                                                              }) => {
    const { session } = useSession();
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Guard: don't render if already subscribed (on this browser) or user is logged in
    const alreadySubscribed =
        typeof window !== 'undefined' &&
        localStorage.getItem('vavus_subscribed') === '1';
    const loggedIn = !!session;

    if (!isOpen || alreadySubscribed || loggedIn) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !consent || isSubmitting) return;

        setIsSubmitting(true);
        setError('');

        try {
            const value = email.trim().toLowerCase();
            const page = window.location.pathname;
            const utm = window.location.search.slice(1); // raw query string

            // ⬇️ Plain INSERT; duplicates treated as success
            const { error } = await supabase
                .from('subscriptions')
                .insert([{ email: value, user_id: session?.user?.id ?? null, page, utm }]);

            if (error) {
                if (error.code === '23505' || /duplicate key|unique/i.test(error.message)) {
                    // treat duplicate as success
                } else {
                    throw error;
                }
            }

            // Mark this browser as subscribed and notify parent
            localStorage.setItem('vavus_subscribed', '1');
            onSubscribed?.();

            setIsSubmitted(true);

            // Auto-close after a short success state
            setTimeout(() => {
                onClose();
                setIsSubmitted(false);
                setEmail('');
                setConsent(false);
            }, 2000);
        } catch (err: any) {
            console.error('[SubscribeModal] Subscribe error:', err);
            setError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => !isSubmitting && onClose()}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl p-6 m-4 max-w-md w-full animate-scale-in">
                {/* Close button */}
                <button
                    onClick={() => !isSubmitting && onClose()}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {isSubmitted ? (
                    /* Success State */
                    <div className="text-center py-4">
                        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Thanks for subscribing!
                        </h3>
                        <p className="text-muted-foreground">
                            Check your inbox for product updates & launch invites.
                        </p>
                    </div>
                ) : (
                    /* Form */
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-gradient-hero p-2 rounded-lg">
                                <Mail className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Stay Updated
                            </h3>
                        </div>

                        <p className="text-muted-foreground mb-6">
                            Get product updates & launch invites delivered to your inbox.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="focus-ring"
                                />
                            </div>

                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="consent"
                                    checked={consent}
                                    onCheckedChange={(checked) => setConsent(!!checked)}
                                    className="mt-1"
                                />
                                <label htmlFor="consent" className="text-sm text-muted-foreground">
                                    I agree to receive product updates and marketing emails from VAVUS AI.
                                </label>
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <Button
                                type="submit"
                                disabled={!email || !consent || isSubmitting}
                                className="btn-hero w-full"
                            >
                                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
