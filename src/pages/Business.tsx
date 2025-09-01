import React, { useState } from 'react';
import { Shield, Lock, FileText, Download, ChevronDown, ChevronRight, Building, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

const Business = () => {
  const [openSections, setOpenSections] = useState<string[]>(['security']);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const { toast } = useToast();

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Request Submitted",
      description: "We'll send you the security documentation within 24 hours."
    });
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  const securitySections = [
    {
      id: 'security',
      title: 'Security Overview',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            VAVUS AI is built with enterprise-grade security from the ground up, ensuring your data remains private and protected.
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>End-to-end encryption for all communications</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Zero-knowledge architecture - we cannot access your data</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Hardware-based security with dedicated devices</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>Regular third-party security audits</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'data',
      title: 'Data Handling & Encryption',
      icon: Lock,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Our data handling practices ensure maximum privacy and security for enterprise customers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-lg">
              <h4 className="font-semibold mb-2">Data Encryption</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• AES-256 encryption at rest</li>
                <li>• TLS 1.3 for data in transit</li>
                <li>• Perfect forward secrecy</li>
                <li>• Hardware security modules</li>
              </ul>
            </div>
            <div className="p-4 bg-surface rounded-lg">
              <h4 className="font-semibold mb-2">Data Processing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• On-device processing where possible</li>
                <li>• Minimal data retention policies</li>
                <li>• Automatic data purging</li>
                <li>• No third-party data sharing</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'compliance',
      title: 'Compliance Roadmap',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We're committed to meeting the highest compliance standards for enterprise deployment.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <span className="font-medium">GDPR Compliance</span>
              <span className="text-success text-sm font-medium">Ready</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
              <span className="font-medium">HIPAA Compliance</span>
              <span className="text-warning text-sm font-medium">Q2 2025</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">SOC 2 Type II</span>
              <span className="text-muted-foreground text-sm font-medium">Q3 2025</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">ISO 27001</span>
              <span className="text-muted-foreground text-sm font-medium">Q4 2025</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'architecture',
      title: 'Architecture Summary',
      icon: Building,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            High-level overview of our secure, scalable architecture designed for enterprise needs.
          </p>
          <div className="bg-surface p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-primary-light p-3 rounded-lg w-fit mx-auto mb-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Edge Security</h4>
                <p className="text-sm text-muted-foreground">
                  Device-level encryption and processing
                </p>
              </div>
              <div className="text-center">
                <div className="bg-accent-brand-light p-3 rounded-lg w-fit mx-auto mb-3">
                  <Globe className="h-6 w-6 text-accent-brand" />
                </div>
                <h4 className="font-semibold mb-2">Distributed AI</h4>
                <p className="text-sm text-muted-foreground">
                  Scalable AI processing infrastructure
                </p>
              </div>
              <div className="text-center">
                <div className="bg-success/20 p-3 rounded-lg w-fit mx-auto mb-3">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <h4 className="font-semibold mb-2">Enterprise Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Centralized management and controls
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'deployment',
      title: 'Deployment Options',
      icon: Globe,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Flexible deployment options to meet your organization's security and compliance requirements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="font-semibold mb-3">Cloud Deployment</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Multi-region availability</li>
                <li>• Auto-scaling infrastructure</li>
                <li>• 99.9% uptime SLA</li>
                <li>• Managed updates and security</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h4 className="font-semibold mb-3">On-Premises</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Full data control</li>
                <li>• Air-gapped deployment</li>
                <li>• Custom security policies</li>
                <li>• Dedicated support team</li>
              </ul>
            </Card>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="mb-6">
            <span className="gradient-text">Enterprise & Security</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built for enterprise deployment with industry-leading security, compliance, 
            and privacy protection. Your data stays yours.
          </p>
        </div>

        {/* Security Sections */}
        <div className="space-y-6 mb-16">
          {securitySections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <Collapsible 
                open={openSections.includes(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-6 hover:bg-surface/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-hero p-2 rounded-lg">
                        <section.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-left">{section.title}</h3>
                    </div>
                    {openSections.includes(section.id) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 pb-6">
                  {section.content}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Request Documentation Form */}
        <Card className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="mb-4">Request Security Documentation</h2>
              <p className="text-muted-foreground">
                Get detailed security documentation, compliance reports, and architecture diagrams.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company *</label>
                  <Input
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your.email@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Tell us about your security requirements and use case..."
                  rows={4}
                />
              </div>

              <Button type="submit" className="btn-hero w-full">
                <Download className="mr-2 h-4 w-4" />
                Request Security Docs PDF
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Business;