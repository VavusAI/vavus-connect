import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
    const navigate = useNavigate();
    const { search } = useLocation();

    // Support ?next=/account (defaults to /account)
    const nextPath = useMemo(() => {
        const url = new URLSearchParams(search);
        const next = url.get('next') || '/account';
        return next.startsWith('/') ? next : '/account';
    }, [search]);

    useEffect(() => {
        // If already signed in, send to account immediately
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) navigate(nextPath, { replace: true });
        });

        // Also handle real-time auth changes
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') navigate(nextPath, { replace: true });
        });
        return () => sub?.subscription.unsubscribe();
    }, [navigate, nextPath]);

    return (
        <div className="min-h-screen bg-gradient-subtle relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent-brand/5" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="mx-auto w-full max-w-md">
                    <div className="rounded-xl border bg-white/70 backdrop-blur p-6 shadow-sm">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-semibold">
                                Sign in to <span className="gradient-text">Vavus AI</span>
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Privacy-first. Zero telemetry. HIPAA mode available.
                            </p>
                        </div>

                        <Auth
                            supabaseClient={supabase}
                            appearance={{
                                theme: ThemeSupa,
                                variables: {
                                    default: {
                                        colors: {
                                            brand: 'hsl(var(--primary))',
                                            brandAccent: 'hsl(var(--accent-brand))',
                                            inputBackground: 'white',
                                            inputBorder: 'hsl(var(--muted))',
                                            inputText: 'hsl(var(--foreground))',
                                        },
                                        borderWidths: { buttonBorderWidth: '1px' },
                                        radii: { borderRadiusButton: '0.75rem', buttonBorderRadius: '0.75rem' },
                                    },
                                },
                                className: {
                                    button:
                                        'btn-hero w-full !bg-primary !text-white hover:opacity-95 transition',
                                    input: 'bg-white',
                                    container: 'space-y-4',
                                },
                            }}
                            providers={[]} // email only
                            // For magic links & OAuth, this must be whitelisted in Supabase Auth -> URL config
                            redirectTo={`${window.location.origin}${nextPath}`}
                        />

                        <p className="text-xs text-muted-foreground mt-4 text-center">
                            By continuing you agree to our Terms and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
