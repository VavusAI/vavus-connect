import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Globe, 
  MessageSquare, 
  Shield, 
  Zap, 
  Check,
  Smartphone,
  Lock,
  Cloud,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubscribeModal } from '@/components/ui/subscribe-modal';

const Index = () => {
  const [email, setEmail] = useState('');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Show subscribe modal on exit intent (simplified)
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShowSubscribeModal(true);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000); // Show after 10 seconds

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const features = [
    {
      icon: Globe,
      title: 'Universal Translation',
      description: 'Translate between 100+ languages with AI-powered accuracy and context awareness.'
    },
    {
      icon: Smartphone,
      title: 'Device Integration',
      description: 'Seamless sync across all your devices with our dedicated hardware ecosystem.'
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'End-to-end encryption ensures your conversations and data remain completely private.'
    },
    {
      icon: Cloud,
      title: 'Offline Capable',
      description: 'Core features work offline, syncing automatically when connected.'
    }
  ];

  const socialProofLogos = [
    'TechCorp',
    'GlobalCom',
    'InnovateLab',
    'FutureSync'
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-subtle">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent-brand/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-8 animate-fade-in">
              <span className="gradient-text">VAVUS AI</span>
              <br />
              Translation & AI for everyone
            </h1>
            
            <p className="mx-auto mb-12 max-w-2xl text-xl text-muted-foreground animate-slide-up">
              Experience the future of communication with secure, private AI-powered 
              translation and conversation tools designed for global connectivity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              <Link to="/translate">
                <Button className="btn-hero group">
                  Translate now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link to="/ai">
                <Button className="btn-secondary">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Try AI Chat
                </Button>
              </Link>
            </div>

            {/* Device Notice */}
            <div className="mt-8 p-4 bg-accent-brand-light border border-accent-brand/20 rounded-lg max-w-lg mx-auto">
              <p className="text-sm text-accent-brand font-medium">
                <Smartphone className="inline h-4 w-4 mr-1" />
                Accounts will require device after launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for the modern world with enterprise-grade security and consumer-friendly design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="feature-card text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-hero p-3 rounded-lg w-fit mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-8">Trusted by leading organizations</p>
            <div className="flex flex-wrap justify-center items-center gap-8">
              {socialProofLogos.map((logo) => (
                <div key={logo} className="text-2xl font-bold text-muted-foreground/60">
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-hero rounded-xl p-8 md:p-12 text-center text-white">
            <h2 className="mb-4 text-white">Stay in the Loop</h2>
            <p className="mb-8 text-lg opacity-90 max-w-2xl mx-auto">
              Get early access, product updates, and launch notifications delivered to your inbox.
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:border-white"
              />
              <Button 
                type="submit"
                className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Subscribe Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
      />
    </div>
  );
};

export default Index;