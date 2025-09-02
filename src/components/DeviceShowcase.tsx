import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DeviceShowcase: React.FC = () => {
  const features = [
    '450+ language translation',
    'Advanced AI (top 6 in capability)',
    'Multiple AI agents (law, medical, etc.)',
    'Transcription and document creation',
    'Fully HIPAA compliant',
  ];

  return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">
                Meet Our AI-Powered Device
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row items-center gap-8">
              {/* Device image */}
              <div className="w-full lg:w-1/2">
                <img
                    src="/images/device.png" // Update with your image's filename
                    alt="Phone-like device with AI chat and translation app"
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <p className="text-center text-sm text-gray-500 mt-2">
                  AI Chat and Translation App
                </p>
              </div>
              {/* Features list */}
              <div className="w-full lg:w-1/2">
                <h3 className="text-xl font-semibold mb-4">Key Features</h3>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Badge variant="default" className="mr-2 mt-1">
                          ✓
                        </Badge>
                        <span className="text-lg">{feature}</span>
                      </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
  );
};

export default DeviceShowcase;