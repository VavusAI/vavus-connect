import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Allow TS to know about the Crisp global
declare global {
  interface Window {
    $crisp?: any[];
  }
}

// Opens the Crisp chat popup; retries briefly if the script isn't ready yet
function openCrispChat() {
  if (typeof window === 'undefined') return;

  if (window.$crisp) {
    window.$crisp.push(['do', 'chat:open']);
    return;
  }

  let tries = 0;
  const iv = setInterval(() => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:open']);
      clearInterval(iv);
    } else if (++tries > 40) {
      clearInterval(iv); // stop after ~10s
    }
  }, 250);
}

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours."
    });
    setFormData({
      name: '',
      email: '',
      category: '',
      message: ''
    });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Us',
      description: 'Send us an email and we\'ll respond within 24 hours',
      contact: 'constantine@vavusai.com',
      action: 'mailto:constantine@vavusai.com'
    },
    {
      icon: MessageSquare,
      title: 'Start a Chat',
      description: 'Get instant answers to your questions',
      contact: 'Live Chat',
      action: '#'
    },
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Speak with our team directly',
      contact: '+1 (347) 973-1974',
      action: 'tel:+13479731974'
    }
  ];

  const offices = [
    {
      city: 'Casper',
      address: '312 W 2nd St, Casper, WY 82601',
      description: 'Our main headquarters and AI research lab'
    },
  ];

  return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="mb-6">
              <span className="gradient-text">Get in Touch</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Have questions about VAVUS AI? Want to partner with us? Or just want to say hello?
              We'd love to hear from you.
            </p>
          </div>

          {/* Contact Methods */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method) => (
                <Card key={method.title} className="p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-hero p-3 rounded-lg w-fit mx-auto mb-4">
                    <method.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{method.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{method.description}</p>

                  {method.contact === 'Live Chat' ? (
                      <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            openCrispChat();
                          }}
                          className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {method.contact}
                      </a>
                  ) : (
                      <a
                          href={method.action}
                          className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {method.contact}
                      </a>
                  )}
                </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="p-8">
              <div className="mb-8">
                <h2 className="mb-4">Send us a Message</h2>
                <p className="text-muted-foreground">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="What can we help you with?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="sales">Sales Inquiry</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="press">Press & Media</SelectItem>
                      <SelectItem value="general">General Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <Textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                  />
                </div>

                <Button type="submit" className="btn-hero w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </Card>

            {/* Office Locations & Info */}
            <div className="space-y-8">
              {/* Offices */}
              <Card className="p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <MapPin className="h-6 w-6 text-primary" />
                  <h2>Our Offices</h2>
                </div>

                <div className="space-y-6">
                  {offices.map((office) => (
                      <div key={office.city} className="border-l-2 border-primary pl-4">
                        <h3 className="font-semibold text-lg">{office.city}</h3>
                        <p className="text-muted-foreground text-sm whitespace-pre-line mb-2">
                          {office.address}
                        </p>
                        <p className="text-muted-foreground text-sm">{office.description}</p>
                      </div>
                  ))}
                </div>
              </Card>

              {/* FAQ */}
              <Card className="p-8">
                <h2 className="mb-6">Frequently Asked Questions</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">When will VAVUS devices be available?</h3>
                    <p className="text-muted-foreground text-sm">
                      We're planning to launch our first devices in Q1 2025. Sign up for updates to be notified.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Is my data private and secure?</h3>
                    <p className="text-muted-foreground text-sm">
                      Yes! We use end-to-end encryption and a zero-knowledge architecture. We cannot access your data.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Do you offer enterprise solutions?</h3>
                    <p className="text-muted-foreground text-sm">
                      Yes, we offer enterprise-grade solutions with additional security and compliance features.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Can I try VAVUS AI before purchasing?</h3>
                    <p className="text-muted-foreground text-sm">
                      You can try our limited demo features on the translate and AI chat pages. Full features require a device.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Response Time */}
              <Card className="p-6 bg-gradient-hero text-white text-center">
                <h3 className="font-semibold mb-2">Quick Response Promise</h3>
                <p className="text-sm opacity-90">
                  We typically respond to all inquiries within 24 hours during business days.
                  For urgent matters, please call us directly.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Contact;
