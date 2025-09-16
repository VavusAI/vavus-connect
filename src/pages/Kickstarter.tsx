import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Kickstarter: React.FC = () => {
    return (
        <section className="bg-gray-900 text-white">
            {/* Hero */}
            <div className="max-w-7xl mx-auto px-6 py-16 text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    VAVUS AI – Coming Soon on Kickstarter
                </h1>
                <p className="text-lg md:text-xl mb-8">
                    Private, on-device translation for hospitals, courts, schools, and
                    travelers. Be the first to know when we launch.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                    <Input
                        type="email"
                        placeholder="Enter your email"
                        className="text-black md:w-96"
                    />
                    <Button className="bg-orange-500 hover:bg-orange-600">
                        Notify Me
                    </Button>
                </div>
                <img
                    src="public/Kickstarter/hero.jpg"
                    alt="VAVUS device mockup"
                    className="mx-auto mt-12 rounded-2xl shadow-xl max-w-3xl"
                />
            </div>

            {/* Feature Grid */}
            <div className="bg-gray-800 py-16">
                <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
                    {[
                        {
                            title: "Offline Translation",
                            desc: "HIPAA-ready on-device processing",
                            icon: "/kickstarter/icons/offline.svg",
                        },
                        {
                            title: "Multi-Headphone Chat",
                            desc: "Real conversations, multiple participants",
                            icon: "/kickstarter/icons/multi.svg",
                        },
                        {
                            title: "OCR + Converters",
                            desc: "Photo translation, currency, units",
                            icon: "/kickstarter/icons/ocr.svg",
                        },
                    ].map((f) => (
                        <Card key={f.title} className="bg-gray-700">
                            <CardHeader>
                                <img src={f.icon} alt={f.title} className="mx-auto h-16 w-16" />
                                <CardTitle className="mt-4">{f.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm opacity-80">{f.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Timeline / Stretch Goals placeholder */}
            <div className="max-w-6xl mx-auto px-6 py-16 text-center">
                <h2 className="text-3xl font-bold mb-4">Our Roadmap</h2>
                <p className="mb-8">
                    Prototype complete. Manufacturing partnership next. Kickstarter launch soon.
                </p>
                <img
                    src="/Kickstarter/timeline.png"
                    alt="VAVUS timeline"
                    className="mx-auto rounded-2xl shadow-xl"
                />
            </div>

            {/* Call to action */}
            <div className="bg-orange-500 py-16 text-center">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                    Join the waitlist
                </h3>
                <p className="mb-6">
                    Get early-bird pricing and exclusive updates.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                    <Input
                        type="email"
                        placeholder="Enter your email"
                        className="text-black md:w-96"
                    />
                    <Button className="bg-black hover:bg-gray-900">Notify Me</Button>
                </div>
            </div>
        </section>
    );
};

export default Kickstarter;
