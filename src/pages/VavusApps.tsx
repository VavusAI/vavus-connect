import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Mic,
    FileText,
    Scale,
    Stethoscope,
    Pill,
    GraduationCap,
    BookOpen,
    MessagesSquare,
    Users,
    Radio,
    Check,
} from "lucide-react";

type AppItem = {
    id: string;
    name: string;
    icon: React.ComponentType<any>;
    blurb: string;
    features: string[];
    comingSoon?: boolean;
    action?: { label: string; onClick?: () => void; disabled?: boolean };
    route?: string;
};

const VavusApps = () => {
    const navigate = useNavigate();

    const apps: AppItem[] = [
        {
            id: "transcriber",
            name: "AI Transcriber",
            icon: Mic,
            blurb:
                "Real-time, multi-language transcription with smart timestamps and speaker-aware notes.",
            features: [
                "Live or recorded audio transcription",
                "Speakers, timestamps, sections",
                "Export notes to TXT / DOCX / PDF",
                "Works with Vavus devices & headsets",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "docs",
            name: "Document Creation & Analysis",
            icon: FileText,
            blurb:
                "Turn long documents into clear answers, summaries, and ready-to-use drafts.",
            features: [
                "Ask questions about any document",
                "Auto-summaries & highlights",
                "Draft contracts, letters & reports",
                "Source citations & traceable quotes",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "lawyer",
            name: "AI Lawyer",
            icon: Scale,
            blurb:
                "Contract review and risk spotting with plain-language explanations and clause suggestions.",
            features: [
                "Redline suggestions & risk flags",
                "Clause libraries & comparisons",
                "Plain-language summaries",
                "Export clean drafts for counsel",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "doctor",
            name: "AI Doctor",
            icon: Stethoscope,
            blurb:
                "Educational triage assistant that explains symptoms and next-step options.",
            features: [
                "Symptom exploration & triage education",
                "Guideline-based explanations",
                "Follow-up questions & checklists",
                "Printable visit prep notes",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "pharmacist",
            name: "AI Pharmacist",
            icon: Pill,
            blurb:
                "Medication information, interaction checks, and patient-friendly instructions.",
            features: [
                "Interaction & duplication checks",
                "Usage, storage & missed-dose guides",
                "OTC vs Rx comparisons",
                "Question prompts for your pharmacist",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "tutor",
            name: "AI Tutor",
            icon: GraduationCap,
            blurb:
                "Personalized study plans with step-by-step explanations and adaptive practice.",
            features: [
                "Diagnostic quiz & study roadmap",
                "Worked examples & hints",
                "Adaptive practice & spaced review",
                "Progress tracking & goals",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "teacher",
            name: "AI Teacher",
            icon: BookOpen,
            blurb:
                "Lesson planning, rubric suggestions, and classroom-ready materials in minutes.",
            features: [
                "Curriculum-aligned lesson plans",
                "Rubrics & formative checks",
                "Worksheets, slides & answer keys",
                "Parent-friendly summaries",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "chat-translate",
            name: "Chat & Translation Chat (Group)",
            icon: MessagesSquare,
            blurb:
                "Real-time translated group chat. Speak your language—everyone reads in theirs.",
            features: [
                "Live 2–10 person rooms",
                "Auto-translate messages & voice",
                "Photo/OCR translate (coming soon)",
                "Multi-headphone support on devices",
            ],
            comingSoon: false,
            action: {
                label: "Open",
                onClick: () => navigate("/AIChat"),
            },
        },
        {
            id: "group-chat",
            name: "Group Chat",
            icon: Users,
            blurb:
                "Fast, clean group messaging for teams and families. Voice notes and file sharing built-in.",
            features: [
                "Pinned messages & mentions",
                "File sharing & voice notes",
                "Read receipts & message controls",
                "Device-to-device sync (coming soon)",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
        {
            id: "mesh",
            name: "Internet-Free Chat (≈3 miles)",
            icon: Radio,
            blurb:
                "Peer-to-peer mesh messaging for events and emergencies—no internet required.*",
            features: [
                "Mesh over Bluetooth / Wi-Fi Direct",
                "Auto-relay via nearby devices",
                "Ephemeral IDs & opt-in range boost",
                "Emergency broadcast mode",
            ],
            comingSoon: true,
            action: { label: "Preview soon", disabled: true },
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="mb-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold">Vavus Apps</h1>
                    <p className="mt-3 text-muted-foreground">
                        Powerful AI experiences for communication, learning, documents, and care.{" "}
                        <span className="font-medium">Previews coming soon.</span>
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                        <Badge variant="secondary">Multi-language</Badge>
                        <Badge variant="secondary">Privacy-minded</Badge>
                        <Badge variant="secondary">Built on Vavus AI & Vavus AI Pro</Badge>
                    </div>
                </header>

                {/* Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map((app) => (
                        <Card key={app.id} className="overflow-hidden hover:shadow-lg transition">
                            {/* Preview placeholder */}
                            <div className="relative aspect-video w-full bg-gradient-to-br from-black/10 via-transparent to-black/10">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="rounded-xl border border-dashed border-white/20 bg-black/5 px-3 py-1 text-xs">
                                        Preview {app.comingSoon ? "coming soon" : "available"}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex items-center gap-2">
                                    <app.icon className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-semibold">{app.name}</h3>
                                    {app.comingSoon && (
                                        <Badge className="ml-auto" variant="outline">
                                            Preview soon
                                        </Badge>
                                    )}
                                </div>

                                <p className="mt-2 text-sm text-muted-foreground">{app.blurb}</p>

                                <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                                    {app.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2">
                                            <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-5">
                                    <Button
                                        variant={app.comingSoon ? "secondary" : "default"}
                                        disabled={app.action?.disabled}
                                        onClick={app.action?.onClick}
                                        className="w-full"
                                    >
                                        {app.action?.label ?? "Learn more"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </section>

                {/* Footer notes */}
                <footer className="mt-10 space-y-2 text-xs text-muted-foreground">
                    <p>
                        *Estimated mesh range depends on local conditions, device hardware, and line-of-sight. Range extenders and
                        relay nodes improve coverage.
                    </p>
                    <p>
                        Research preview only. These tools do not replace licensed professionals. They are not medical devices and
                        do not provide medical or legal advice.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default VavusApps;
