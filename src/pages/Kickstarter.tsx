import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubscribeForm from "@/components/SubscribeForm";

const Kickstarter: React.FC = () => {
    return (
        <div className="bg-background text-foreground">
            <div className="max-w-6xl mx-auto px-6 py-16">
                {/* Hero */}
                <Card className="border border-border">
                    <CardHeader className="text-center">
                        <CardTitle className="text-4xl md:text-5xl font-bold">
                            Fully encrypted OS, fully encrypted apps, fully encrypted server!
                        </CardTitle>
                        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                            Private, on-device translation for hospitals, courts, schools, and travelers.
                        </p>
                    </CardHeader>

                    {/* Replaced inert input+button with shared SubscribeForm */}
                    <CardContent className="flex justify-center">
                        <SubscribeForm />
                    </CardContent>

                    <img
                        src="/Kickstarter/hero.jpg"
                        alt="VAVUS preview"
                        className="mx-auto mt-8 rounded-2xl shadow-xl max-w-3xl"
                    />
                </Card>

                {/* Features (white icons that pop on primary strip) */}
                <div className="mt-16 rounded-2xl p-8 bg-primary text-primary-foreground">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: "Offline Translation", desc: "HIPAA-ready on-device processing", icon: "/kickstarter/icons/offline-white-static.svg" },
                            { title: "Multi-Headphone Chat", desc: "Real conversations, multiple participants", icon: "/kickstarter/icons/multi-white-static.svg" },
                            { title: "OCR + Converters", desc: "Photo translation, currency, units", icon: "/kickstarter/icons/ocr-white-static.svg" },
                        ].map((f) => (
                            <div key={f.title} className="text-center">
                                <img src={f.icon} alt="" className="mx-auto h-16 w-16 mb-3" />
                                <div className="text-xl font-semibold">{f.title}</div>
                                <p className="text-sm opacity-90">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div className="mt-16 text-center">
                    <h2 className="text-3xl font-bold mb-4">Our Roadmap</h2>
                    <p className="text-muted-foreground mb-8">
                        Prototype complete. Manufacturer partnership next. Kickstarter launch soon.
                    </p>
                    <img
                        src="/Kickstarter/timeline.png"
                        alt="VAVUS timeline"
                        className="mx-auto rounded-2xl shadow-xl"
                    />
                </div>

                {/* Final CTA */}
                <div className="mt-16 text-center">
                    <h3 className="text-2xl md:text-3xl font-bold mb-3">Join the waitlist</h3>
                    <p className="text-muted-foreground mb-6">Get early-bird pricing and exclusive updates.</p>

                    {/* Replaced inert input+button with shared SubscribeForm */}
                    <div className="flex justify-center">
                        <SubscribeForm />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Kickstarter;
