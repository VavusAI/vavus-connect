import React, { useState } from 'react';
import { Code, Palette, Handshake, Megaphone, Upload, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const Join = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin: '',
    role: '',
    message: ''
  });
  const { toast } = useToast();

  const opportunities = [
    {
      icon: Code,
      title: 'Engineering',
      description: 'Build the future of AI-powered communication',
      roles: [
        'Senior Full-Stack Engineer',
        'AI/ML Engineer', 
        'DevOps Engineer',
        'Mobile Developer (iOS/Android)',
        'Backend Systems Engineer'
      ],
      skills: ['React/TypeScript', 'Python/PyTorch', 'Kubernetes', 'Swift/Kotlin', 'Go/Rust']
    },
    {
      icon: Palette,
      title: 'Design',
      description: 'Create beautiful, intuitive experiences for global users',
      roles: [
        'Senior Product Designer',
        'UX Researcher',
        'Design Systems Lead',
        'Brand Designer'
      ],
      skills: ['Figma', 'User Research', 'Design Systems', 'Accessibility', 'Prototyping']
    },
    {
      icon: Handshake,
      title: 'Partnerships',
      description: 'Build strategic relationships and expand our reach',
      roles: [
        'VP of Partnerships',
        'Business Development Manager',
        'Channel Sales Manager',
        'Strategic Accounts Executive'
      ],
      skills: ['Relationship Building', 'Negotiation', 'Strategic Planning', 'Enterprise Sales']
    },
    {
      icon: Megaphone,
      title: 'Marketing',
      description: 'Tell our story and connect with users worldwide',
      roles: [
        'Growth Marketing Manager',
        'Content Marketing Lead',
        'Developer Relations',
        'Community Manager'
      ],
      skills: ['Growth Hacking', 'Content Strategy', 'Developer Community', 'Analytics']
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Application Submitted!",
      description: "We'll review your application and get back to you within a week."
    });
    setFormData({
      name: '',
      email: '',
      linkedin: '',
      role: '',
      message: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="mb-6">
            <span className="gradient-text">Join Our Team</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Help us break down language barriers and connect the world through 
            AI-powered communication. We're looking for passionate people who want 
            to make a global impact.
          </p>
        </div>

        {/* Why Join VAVUS */}
        <Card className="p-8 mb-16 bg-gradient-hero text-white">
          <div className="text-center mb-8">
            <h2 className="mb-4 text-white">Why Join VAVUS AI?</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              We're building the future of human communication while respecting privacy and security.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Global Impact</h3>
              <p className="text-sm opacity-80">
                Your work will help millions of people communicate across language barriers
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Cutting-Edge Tech</h3>
              <p className="text-sm opacity-80">
                Work with the latest AI, security, and hardware technologies
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Privacy First</h3>
              <p className="text-sm opacity-80">
                Build products that respect user privacy and data ownership
              </p>
            </div>
          </div>
        </Card>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-center mb-12">Open Opportunities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {opportunities.map((opportunity) => (
              <Card key={opportunity.title} className="p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-gradient-hero p-3 rounded-lg">
                    <opportunity.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{opportunity.title}</h3>
                    <p className="text-muted-foreground">{opportunity.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Open Roles:</h4>
                  <ul className="space-y-2">
                    {opportunity.roles.map((role) => (
                      <li key={role} className="text-sm text-muted-foreground flex items-center">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full mr-2" />
                        {role}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Key Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.skills.map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-surface text-xs rounded-md">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <Card className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="mb-4">Apply Now</h2>
              <p className="text-muted-foreground">
                Send us your information and tell us how you'd like to contribute to VAVUS AI.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn / Portfolio URL</label>
                <Input
                  value={formData.linkedin}
                  onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Interested Role *</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="partnerships">Partnerships</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tell us about yourself *</label>
                <Textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Tell us about your background, experience, and why you're interested in joining VAVUS AI..."
                  rows={6}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="button" variant="outline" className="flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
                <Button type="submit" className="btn-hero flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-surface">
            <h3 className="font-semibold mb-4">Remote-First Culture</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're a distributed team with hubs in San Francisco and London. 
              We offer competitive compensation, equity, health benefits, and unlimited PTO. 
              Most importantly, you'll be working on technology that connects people worldwide.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Join;