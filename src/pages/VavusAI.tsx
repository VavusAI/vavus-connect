import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, BarChart, Globe, MessageSquare, Shield, Code2, Bot, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VavusAI = () => {
    const navigate = useNavigate();

    // Correct specs (rebranded from GLM-4.5 series)
    const specs = [
        {
            name: 'Vavus AI',
            subtitle: 'Fast, lightweight, unified intelligence',
            details: [
                '106B total parameters / 12B active (MoE)',
                'Hybrid modes: Thinking & Fast',
                '128k context length',
                'Native function/tool calling',
            ],
        },
        {
            name: 'Vavus AI Pro',
            subtitle: 'Flagship reasoning & agentic performance',
            details: [
                '355B total parameters / 32B active (MoE)',
                'Hybrid modes: Thinking & Fast',
                '128k context length',
                'Native function/tool calling',
            ],
        },
    ];

    // Compact benchmark highlights taken from the GLM-4.5 reports (rebranded)
    const benchmarksAgentic = [
        { metric: 'TAU-bench (Retail)', pro: '79.7', base: '77.9' },
        { metric: 'TAU-bench (Airline)', pro: '60.4', base: '60.8' },
        { metric: 'BFCL v3 (Full)', pro: '77.8', base: '76.4' },
        { metric: 'BrowseComp (Web)', pro: '26.4%', base: '21.3%' },
    ];

    const benchmarksReasoning = [
        { metric: 'MMLU Pro', pro: '84.6', base: '81.4' },
        { metric: 'AIME 2024', pro: '91.0', base: '89.4' },
        { metric: 'MATH 500', pro: '98.2', base: '98.1' },
        { metric: 'GPQA', pro: '79.1', base: '75.0' },
    ];

    const benchmarksCoding = [
        { metric: 'SWE-bench Verified', pro: '64.2', base: '57.6' },
        { metric: 'Terminal-Bench', pro: '37.5', base: '30.0' },
        { metric: 'Tool Calling Success', pro: '90.6%', base: '—' },
    ];

    const capabilities = [
        { icon: Globe, title: 'World-class translation' },
        { icon: MessageSquare, title: 'Conversational intelligence' },
        { icon: Code2, title: 'Full-stack app generation' },
        { icon: Bot, title: 'Agentic tool use & browsing' },
        { icon: BarChart, title: 'Data analysis & insights' },
        { icon: Shield, title: 'Privacy-first architecture' },
    ];

    return (
        <div className="bg-gradient-subtle">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-hero text-white">
                <div className="mx-auto max-w-7xl px-4 py-24 text-center">
                    <h1 className="mb-6 text-4xl md:text-5xl font-bold">
                        <span className="gradient-text">⚡ Introducing Vavus AI & Vavus AI Pro</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg opacity-90">
                        Unified reasoning, coding, and agentic intelligence — built for speed, accuracy, and privacy.
                    </p>

                    {/* Get Started -> AIChat.tsx */}
                    <Button className="btn-hero mt-8" onClick={() => navigate('/ai')}>
                        Get Started
                    </Button>

                    {/* Quick badges */}
                    <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm opacity-90">
                        <span className="rounded-full bg-white/10 px-3 py-1">Top-tier math & logic</span>
                        <span className="rounded-full bg-white/10 px-3 py-1">High-reliability tool calling</span>
                        <span className="rounded-full bg-white/10 px-3 py-1">128k context</span>
                        <span className="rounded-full bg-white/10 px-3 py-1">MoE architecture</span>
                    </div>
                </div>
            </section>

            {/* Value Props */}
            <section className="py-16">
                <div className="mx-auto max-w-5xl px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-semibold">Two Models. Endless Possibilities.</h2>
                    <p className="mt-4 text-muted-foreground">
                        <strong>Vavus AI</strong> delivers incredible speed and efficiency. <strong>Vavus AI Pro</strong> pushes the
                        limits of deep reasoning, coding, and multi-step agentic tasks.
                    </p>
                </div>
            </section>

            {/* Model Specs */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4">
                    <h3 className="text-center mb-10 text-xl md:text-2xl font-semibold">Model Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {specs.map((spec) => (
                            <Card key={spec.name} className="p-8 text-center feature-card">
                                <h4 className="text-2xl font-semibold">{spec.name}</h4>
                                <p className="mt-1 text-sm text-muted-foreground">{spec.subtitle}</p>
                                <ul className="mt-6 space-y-2 text-muted-foreground">
                                    {spec.details.map((detail) => (
                                        <li key={detail}>
                                            <Check className="inline h-4 w-4 text-primary mr-2" />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hybrid Modes */}
            <section className="py-16 bg-surface">
                <div className="mx-auto max-w-7xl px-4">
                    <h3 className="text-center mb-10 text-xl md:text-2xl font-semibold">Hybrid Reasoning Modes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="p-6">
                            <div className="flex items-start gap-3">
                                <Zap className="h-6 w-6 text-primary mt-1" />
                                <div>
                                    <h4 className="font-semibold">Fast Mode</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Instant, streamlined responses for chat, assistance, and rapid iteration.
                                    </p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6">
                            <div className="flex items-start gap-3">
                                <Bot className="h-6 w-6 text-primary mt-1" />
                                <div>
                                    <h4 className="font-semibold">Thinking Mode</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Deep chain-of-thought reasoning and multi-turn tool use for complex tasks.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Benchmarks – Agentic */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4">
                    <h3 className="text-center mb-10 text-xl md:text-2xl font-semibold">Agentic Benchmarks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {benchmarksAgentic.map((b) => (
                            <Card key={b.metric} className="p-6 text-center">
                                <BarChart className="h-8 w-8 mx-auto mb-4 text-primary" />
                                <h4 className="font-semibold">{b.metric}</h4>
                                <p className="text-sm text-muted-foreground mt-2">
                                    <strong>Vavus AI Pro:</strong> {b.pro}
                                    <br />
                                    <strong>Vavus AI:</strong> {b.base}
                                </p>
                            </Card>
                        ))}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-6">
                        *Measured with optimized user simulator where applicable; BrowseComp reflects % correct with browsing tools.
                    </p>
                </div>
            </section>

            {/* Benchmarks – Reasoning */}
            <section className="py-16 bg-surface">
                <div className="mx-auto max-w-7xl px-4">
                    <h3 className="text-center mb-10 text-xl md:text-2xl font-semibold">Reasoning Benchmarks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {benchmarksReasoning.map((b) => (
                            <Card key={b.metric} className="p-6 text-center">
                                <BarChart className="h-8 w-8 mx-auto mb-4 text-primary" />
                                <h4 className="font-semibold">{b.metric}</h4>
                                <p className="text-sm text-muted-foreground mt-2">
                                    <strong>Vavus AI Pro:</strong> {b.pro}
                                    <br />
                                    <strong>Vavus AI:</strong> {b.base}
                                </p>
                            </Card>
                        ))}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-6">
                        *AIME/GPQA averaged over multiple samples to reduce variance; text-only HLE subset where relevant.
                    </p>
                </div>
            </section>

            {/* Benchmarks – Coding */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4">
                    <h3 className="text-center mb-10 text-xl md:text-2xl font-semibold">Coding Benchmarks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {benchmarksCoding.map((b) => (
                            <Card key={b.metric} className="p-6 text-center">
                                <Code2 className="h-8 w-8 mx-auto mb-4 text-primary" />
                                <h4 className="font-semibold">{b.metric}</h4>
                                <p className="text-sm text-muted-foreground mt-2">
                                    <strong>Vavus AI Pro:</strong> {b.pro}
                                    <br />
                                    <strong>Vavus AI:</strong> {b.base}
                                </p>
                            </Card>
                        ))}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-6">
                        *SWE-bench with OpenHands constraints; Terminal-Bench via Terminus; standard function calling.
                    </p>
                </div>
            </section>

            {/* Capabilities */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4">
                    <h3 className="text-center mb-10 text-xl md:text-2xl font-semibold">What Vavus AI Can Do</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {capabilities.map((cap, idx) => (
                            <div
                                key={cap.title}
                                className="feature-card text-center p-6"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="bg-gradient-hero p-3 rounded-lg w-fit mx-auto mb-4">
                                    <cap.icon className="h-6 w-6 text-white" />
                                </div>
                                <h4 className="text-lg font-semibold mb-2 text-foreground">{cap.title}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VavusAI;
