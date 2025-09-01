import React from 'react';
import { Shield, Eye, Lock, Database, Users, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';

const Privacy = () => {
  const sections = [
    {
      id: 'data-collection',
      icon: Database,
      title: 'Data We Collect',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            VAVUS AI is designed with privacy at its core. We collect minimal data necessary to provide our services:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Account Information:</strong> Email address, encrypted authentication credentials</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Device Data:</strong> Device identifiers for hardware authentication and sync</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Usage Analytics:</strong> Anonymous usage patterns to improve our services</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Communication Content:</strong> Encrypted translations and conversations (we cannot read these)</span>
            </li>
          </ul>
          <p className="text-muted-foreground">
            <strong>Important:</strong> We use zero-knowledge architecture, meaning we cannot access the content of your translations or conversations.
          </p>
        </div>
      )
    },
    {
      id: 'data-usage',
      icon: Eye,
      title: 'How We Use Data',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your data is used solely to provide and improve VAVUS AI services:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Service Delivery:</strong> Process translations and AI conversations securely</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Account Management:</strong> Authenticate users and sync data across devices</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Service Improvement:</strong> Analyze anonymous usage patterns to enhance features</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Security:</strong> Detect and prevent unauthorized access or abuse</span>
            </li>
          </ul>
          <p className="text-muted-foreground">
            <strong>We never:</strong> Sell your data, share it with advertisers, or use it for marketing without explicit consent.
          </p>
        </div>
      )
    },
    {
      id: 'cookies',
      icon: Shield,
      title: 'Cookies & Tracking',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We use minimal cookies and tracking technologies:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-lg">
              <h4 className="font-semibold mb-2">Essential Cookies</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Authentication sessions</li>
                <li>• Security tokens</li>
                <li>• Language preferences</li>
                <li>• Essential functionality</li>
              </ul>
            </div>
            <div className="p-4 bg-surface rounded-lg">
              <h4 className="font-semibold mb-2">Optional Analytics</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Anonymous usage statistics</li>
                <li>• Performance monitoring</li>
                <li>• Error reporting</li>
                <li>• Feature usage patterns</li>
              </ul>
            </div>
          </div>
          <p className="text-muted-foreground">
            You can control analytics cookies through our consent banner or browser settings.
          </p>
        </div>
      )
    },
    {
      id: 'third-parties',
      icon: Users,
      title: 'Third Parties',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We work with minimal third-party services, all carefully vetted for privacy compliance:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Cloud Infrastructure:</strong> Secure hosting and data processing (encrypted)</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Payment Processing:</strong> Secure payment handling for subscriptions</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Analytics:</strong> Anonymous usage analytics (optional, with consent)</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span><strong>Customer Support:</strong> Encrypted support ticket management</span>
            </li>
          </ul>
          <p className="text-muted-foreground">
            All third parties are bound by strict data processing agreements and cannot access your content.
          </p>
        </div>
      )
    },
    {
      id: 'data-retention',
      icon: Database,
      title: 'Data Retention',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We retain data only as long as necessary to provide our services:
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="font-medium">Account Data</span>
              <span className="text-muted-foreground text-sm">Until account deletion</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="font-medium">Conversation History</span>
              <span className="text-muted-foreground text-sm">User-controlled (1-365 days)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="font-medium">Usage Analytics</span>
              <span className="text-muted-foreground text-sm">90 days (anonymized)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="font-medium">Support Tickets</span>
              <span className="text-muted-foreground text-sm">3 years for support quality</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            You can request data deletion at any time through your account settings or by contacting support.
          </p>
        </div>
      )
    },
    {
      id: 'your-rights',
      icon: Lock,
      title: 'Your Rights',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            You have comprehensive rights over your personal data:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-success/10 rounded-lg">
                <h4 className="font-semibold text-success mb-1">Access</h4>
                <p className="text-sm text-muted-foreground">Download all your data anytime</p>
              </div>
              <div className="p-3 bg-accent-brand/10 rounded-lg">
                <h4 className="font-semibold text-accent-brand mb-1">Portability</h4>
                <p className="text-sm text-muted-foreground">Export data in standard formats</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <h4 className="font-semibold text-warning mb-1">Correction</h4>
                <p className="text-sm text-muted-foreground">Update or correct your information</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <h4 className="font-semibold text-destructive mb-1">Deletion</h4>
                <p className="text-sm text-muted-foreground">Permanently delete all your data</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <h4 className="font-semibold text-primary mb-1">Objection</h4>
                <p className="text-sm text-muted-foreground">Object to specific data processing</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-1">Withdrawal</h4>
                <p className="text-sm text-muted-foreground">Withdraw consent anytime</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="mb-6">
            <span className="gradient-text">Privacy Policy</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your privacy is fundamental to everything we build. This policy explains how we collect, 
            use, and protect your information with complete transparency.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Last updated:</strong> December 1, 2024
          </p>
        </div>

        {/* Privacy Principles */}
        <Card className="p-8 mb-12 bg-gradient-hero text-white">
          <h2 className="text-center mb-8 text-white">Our Privacy Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Lock className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Zero-Knowledge</h3>
              <p className="text-sm opacity-90">
                We cannot read your conversations or translations
              </p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Minimal Collection</h3>
              <p className="text-sm opacity-90">
                We collect only what's essential for our services
              </p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">User Control</h3>
              <p className="text-sm opacity-90">
                You control your data and can delete it anytime
              </p>
            </div>
          </div>
        </Card>

        {/* Privacy Sections */}
        <div className="space-y-8 mb-16">
          {sections.map((section) => (
            <Card key={section.id} className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-gradient-hero p-3 rounded-lg">
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                <h2>{section.title}</h2>
              </div>
              
              {section.content}
            </Card>
          ))}
        </div>

        {/* Important Notice */}
        <Card className="p-8 border-l-4 border-l-warning bg-warning/5">
          <h3 className="font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-warning" />
            Important Notice for Users
          </h3>
          <p className="text-muted-foreground mb-4">
            This privacy policy is a placeholder for demonstration purposes. In a production environment, 
            you would need to:
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li>• Have this policy reviewed by legal counsel</li>
            <li>• Ensure compliance with GDPR, CCPA, and other applicable privacy laws</li>
            <li>• Update the policy based on your actual data practices</li>
            <li>• Include specific details about your data processing activities</li>
            <li>• Provide clear contact information for privacy inquiries</li>
          </ul>
        </Card>

        {/* Contact */}
        <Card className="p-8 text-center mt-8">
          <Mail className="h-8 w-8 mx-auto mb-4 text-primary" />
          <h3 className="font-semibold mb-2">Questions About Privacy?</h3>
          <p className="text-muted-foreground mb-4">
            If you have any questions about this privacy policy or how we handle your data, 
            please don't hesitate to contact us.
          </p>
          <a 
            href="mailto:privacy@vavus.ai" 
            className="text-primary hover:text-primary-hover font-medium"
          >
            privacy@vavus.ai
          </a>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;