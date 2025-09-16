import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Globe,
  MessageSquare,
  Smartphone,
  Lock,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubscribeModal } from '@/components/ui/subscribe-modal';
import DeviceShowcase from '../components/DeviceShowcase';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

const Index: React.FC = () => {
  const [email, setEmail] = useState('');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // subscribe form status
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [subMsg, setSubMsg] = useState('');
  const { session } = useSession();

  // Track if this browser has already subscribed
  const [hasSubscribed, setHasSubscribed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('vavus_subscribed') === '1';
  });

  // Exit-intent popup – only if NOT subscribed and NOT logged in
  useEffect(() => {
    if (typeof window === 'undefined' || hasSubscribed || session) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasSubscribed && !session) {
        setShowSubscribeModal(true);
      }
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000); // Show after 10 seconds

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasSubscribed, session]);

  // === Edgy Kickstarter copy ===
  const features = [
    {
      icon: Globe,
      title: '419 languages. No borders.',
      description:
          'Real‑time speech ↔ text with clean AI notes. Built for messy rooms and bad mics.',
    },
    {
      icon: MessageSquare,
      title: 'Vavus AI — Top 3 overall.',
      description:
          'Hosted on our servers for speed and reliability. Tap specialist agents: Legal, Medical, Tutor, Professor.',
    },
    {
      icon: Lock,
      title: 'Zero‑Telemetry Privacy.',
      description:
          'We don’t collect content or usage. End‑to‑end encrypted chats between devices. Your keys, your call.',
    },
    {
      icon: Smartphone,
      title: 'Vavus OS — No trackers.',
      description:
          'No social feeds. No Google tracking. FIPS‑only crypto across OS and apps.',
    },
  ];

  const socialProofLogos = ['TechCorp', 'GlobalCom', 'InnovateLab', 'FutureSync'];

  function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim().toLowerCase();

    if (!isEmail(value)) {
      setSubStatus('error');
      setSubMsg('Please enter a valid email.');
      return;
    }

    setSubStatus('loading');
    setSubMsg('');

    try {
      const page = window.location.pathname;
      const utm = window.location.search.slice(1);

      const { error } = await supabase
          .from('subscriptions')
          .upsert(
              {
                email: value,
                user_id: session?.user?.id ?? null,
                page,
                utm,
              },
              { onConflict: 'email' }
          );

      if (error) throw error;

      // Mark as subscribed on this browser, hide popup
      localStorage.setItem('vavus_subscribed', '1');
      setHasSubscribed(true);
      setShowSubscribeModal(false);

      setSubStatus('ok');
      setSubMsg("You’re in. We’ll ping you before we go live.");
      setEmail('');
    } catch (err) {
      setSubStatus('error');
      setSubMsg('Something went wrong. Please try again.');
    } finally {
      // fade the message out after a moment (optional)
      setTimeout(() => setSubStatus('idle'), 4000);
    }
  }

  return (
      <div className="relative">
        {/* Device Showcase Section */}
        <DeviceShowcase />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-subtle">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent-brand/5" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-8 animate-fade-in">
                <span className="gradient-text">Meet the first HIPAA‑grade AI Device.</span>
                <br />
                Zero telemetry. FIPS‑only. Vavus AI (Top 3 overall).
              </h1>

              <p className="mx-auto mb-12 max-w-2xl text-xl text-muted-foreground animate-slide-up">
                Translation, transcription, and specialist agents—without the tracking. Device‑to‑device chats stay sealed. We can’t see your messages—or your metadata.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
                <Link to="/kickstarter">
                  <Button className="btn-hero group">
                    Back on Kickstarter
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <Link to="/ai">
                  <Button className="btn-secondary">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Try AI Chat
                  </Button>
                </Link>
              </div>

              {/* Device Notice */}
              <div className="mt-8 p-4 bg-accent-brand-light border border-accent-brand/20 rounded-lg max-w-lg mx-auto">
                <p className="text-sm text-accent-brand font-medium">
                  <Smartphone className="inline h-4 w-4 mr-1" />
                  Accounts will require a Vavus Device after launch. Kickstarter backers ship first.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the Device */}
        <section className="py-20 bg-white border-t">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2 className="mb-3">Meet the Device</h2>
              <p className="text-lg text-muted-foreground">HIPAA‑grade AI. Access without surveillance.</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>419‑language translation</strong> in real time.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>Live transcription & AI notes</strong> for meetings and calls.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>Vavus AI — Top 3 overall</strong>, hosted on our servers for speed and reliability.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>Specialist agents</strong>: Legal, Medical, Tutor, Professor.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>Zero telemetry & end‑to‑end encrypted chats</strong> between devices.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>Vavus OS — no social media, no Google tracking</strong>; <strong>FIPS‑only encryption</strong> across OS & apps.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>HIPAA Mode (optional)</strong>: on‑device audit; encrypted uploads under your keys; <strong>BAA available</strong>.</span></li>
              <li className="flex items-start gap-3"><Check className="h-5 w-5 mt-1" /><span><strong>No‑Guardrails Research Mode</strong>: open topic for lawful research (no step‑by‑step harm).</span></li>
            </ul>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="mb-4">What the Device Gets You</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Speed, privacy, and specialist intelligence—without the surveillance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                  <div
                      key={feature.title}
                      className="feature-card text-center"
                      style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="bg-gradient-hero p-3 rounded-lg w-fit mx-auto mb-4">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16 bg-surface">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">Trust, not tracking</p>
              <div className="flex flex-wrap justify-center items-center gap-3">
                {['FIPS‑Only Encryption', 'Zero Telemetry', 'End‑to‑End Encrypted Chats', 'HIPAA Mode (Optional)', 'BAA Available'].map((badge) => (
                    <span
                        key={badge}
                        className="rounded-full border border-muted px-3 py-1 text-sm text-muted-foreground/90 bg-white"
                    >
                  {badge}
                </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-hero rounded-xl p-8 md:p-12 text-center text-white">
              <h2 className="mb-4 text-white">Get in early</h2>
              <p className="mb-8 text-lg opacity-90 max-w-2xl mx-auto">
                Early‑bird pricing, limited units, and launch updates.
              </p>

              <form
                  className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
                  onSubmit={handleSubscribe}
              >
                <Input
                    type="email"
                    placeholder="your@work.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:border-white"
                    disabled={subStatus === 'loading'}
                    required
                />
                <Button
                    type="submit"
                    className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
                    disabled={subStatus === 'loading'}
                >
                  {subStatus === 'loading' ? 'Subscribing…' : 'Get Early Access'}
                </Button>
              </form>

              {subMsg && (
                  <p
                      className={`mt-3 text-sm ${
                          subStatus === 'error' ? 'text-red-200' : 'text-emerald-200'
                      }`}
                  >
                    {subMsg}
                  </p>
              )}
            </div>
          </div>
        </section>

        {/* Subscribe Modal (won't render once subscribed or when logged in) */}
        <SubscribeModal
            isOpen={showSubscribeModal && !hasSubscribed && !session}
            onClose={() => setShowSubscribeModal(false)}
            onSubscribed={() => {
              localStorage.setItem('vavus_subscribed', '1');
              setHasSubscribed(true);
              setShowSubscribeModal(false);
            }}
        />
      </div>
  );
};

export default Index;
