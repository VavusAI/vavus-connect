import React from 'react';
import { ArrowRight, Users, Target, Globe, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const About = () => {
  const values = [
    {
      icon: Globe,
      title: 'Global Connection',
      description: 'Breaking down language barriers to connect people worldwide through seamless communication.'
    },
    {
      icon: Heart,
      title: 'Privacy First',
      description: 'Your data belongs to you. We build with privacy and security as foundational principles.'
    },
    {
      icon: Target,
      title: 'Innovation',
      description: 'Pushing the boundaries of AI and language technology to create meaningful solutions.'
    }
  ];

  const team = [
    {
      name: 'Dragos Constantine',
      role: 'Founder',
      bio: 'Constantine is a former pro tennis player and Columbia University graduate, a repeat founder, and the sole developer behind VAVUS AI.',
      // Place the file at: public/images/dragos.jpg
      image: '/images/dragos.jpg'
    },
  ];

  return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-20">
            <h1 className="mb-6">
              <span className="gradient-text">About VAVUS AI</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're building the future of human communication through AI-powered translation
              and conversation tools that respect privacy and connect cultures.
            </p>
          </div>

          {/* Mission */}
          <section className="mb-20">
            <Card className="p-12 text-center bg-white">
              <h2 className="mb-8">Our Mission</h2>
              <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-8">
                To create a world where language is never a barrier to human connection,
                understanding, and collaboration. We believe that everyone deserves access
                to powerful AI tools that are secure, private, and designed with humanity in mind.
              </p>
              <div className="bg-gradient-hero p-8 rounded-xl text-white">
                <p className="text-lg font-medium">
                  "Technology should amplify human potential, not replace human connection."
                </p>
                <p className="text-sm opacity-80 mt-2">— VAVUS AI Team</p>
              </div>
            </Card>
          </section>

          {/* Values */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="mb-4">Our Values</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                These principles guide everything we build and every decision we make.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((value) => (
                  <Card key={value.title} className="p-8 text-center">
                    <div className="bg-gradient-hero p-4 rounded-lg w-fit mx-auto mb-6">
                      <value.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </Card>
              ))}
            </div>
          </section>

          {/* Team */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="mb-4">Meet The Team</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                A diverse group of engineers, researchers, and designers passionate about
                connecting the world through technology.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member) => (
                  <Card key={member.name} className="p-6 text-center">
                    <img
                        src={member.image}
                        alt={member.name}
                        loading="lazy"
                        className="mx-auto mb-4 h-24 w-24 rounded-full object-cover shadow-sm"
                    />
                    <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                    <p className="text-accent-brand font-medium text-sm mb-3">{member.role}</p>
                    <p className="text-muted-foreground text-sm">{member.bio}</p>
                  </Card>
              ))}
            </div>
          </section>

          {/* Story */}
          <section className="mb-20">
            <Card className="p-12">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-center mb-8">Our Story</h2>
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  <p>
                    VAVUS AI was born from a simple frustration: existing translation and AI tools
                    either compromised on privacy or lacked the sophistication needed for meaningful
                    communication across cultures.
                  </p>
                  <p>
                    After eight years as a founder, I saw how AI can move humanity forward by understanding context,
                    nuance, and culture. But none of it matters without privacy—that’s why we built VAVUS AI to keep
                    personal communication secure by design. Roughly 95% of people don’t use AI day-to-day;
                    productivity will surge in the next few years and many risk being left behind.
                    Our goal is simple: bring AI to everyone so the benefits are shared by all.
                  </p>
                  <p>
                    Today, we're building a platform that combines cutting-edge AI with hardware-level
                    security, creating tools that are both powerful and trustworthy. Our vision extends
                    beyond simple translation to encompass true cross-cultural understanding and communication.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* CTA */}
          <section className="text-center">
            <Card className="p-12 bg-gradient-hero text-white">
              <h2 className="mb-4 text-white">Join Our Mission</h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                We're always looking for passionate people who want to help break down
                language barriers and connect the world.
              </p>
              <Link to="/join">
                <Button className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3">
                  View Open Positions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </section>
        </div>
      </div>
  );
};

export default About;
