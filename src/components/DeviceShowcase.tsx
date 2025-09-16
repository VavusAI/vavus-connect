import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DeviceShowcase: React.FC = () => {
  const features: string[] = [
    '419-language translation in real time',
    'Live transcription & AI notes for meetings and calls',
    'Vavus AI — Top 3 overall; specialist agents: Legal, Medical, Tutor, Professor',
    'Zero telemetry & end-to-end encrypted device↔device chats',
    'Vavus OS — no social media, no Google tracking; FIPS-only encryption across OS & apps',
    'HIPAA Mode (optional): on-device audit; encrypted uploads under your keys; BAA available',
    'No-Guardrails Research Mode: open topic for lawful research (no step-by-step harm)',
  ];

  const trustBadges = [
    'FIPS-Only Encryption',
    'Zero Telemetry',
    'End-to-End Chats',
    'HIPAA Mode',
    'BAA Available',
  ];

  return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-hidden">
            <CardHeader className="text-center">
              <div className="mb-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  VAVUS DEVICE
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold">
                The world’s first AI Device — <span className="text-primary">Fully HIPAA-Compliant</span>
              </CardTitle>
              <p className="mt-3 text-muted-foreground">
                Access without surveillance. Zero telemetry by default. FIPS-only encryption end-to-end.
              </p>
            </CardHeader>

            <CardContent className="flex flex-col lg:flex-row items-center gap-8">
              {/* Device image */}
              <div className="w-full lg:w-1/2">
                <img
                    src="/images/device.png" // Update with your image
                    alt="Vavus AI Device — HIPAA-grade with encrypted chat and translation"
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <p className="text-center text-sm text-gray-500 mt-2">
                  Encrypted device↔device chats • Private by default
                </p>
              </div>

              {/* Features list */}
              <div className="w-full lg:w-1/2">
                <h3 className="text-xl font-semibold mb-4">Key Features</h3>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Badge variant="default" className="mr-2 mt-1 rounded-full px-2">
                          ✓
                        </Badge>
                        <span className="text-lg text-foreground/90">{feature}</span>
                      </li>
                  ))}
                </ul>

                {/* Trust badges */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {trustBadges.map((b) => (
                      <Badge key={b} variant="secondary" className="rounded-full px-3 py-1">
                        {b}
                      </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
  );
};

export default DeviceShowcase;
