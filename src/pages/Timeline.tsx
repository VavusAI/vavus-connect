import React, { useState } from 'react';
import { CheckCircle, Clock, Circle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Timeline = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Product', 'Devices', 'Security', 'Apps'];

  const milestones = [
    {
      quarter: 'Q3 2025',
      status: 'completed',
      category: 'Product',
      title: 'Core AI Engine',
      description: 'Completed initial development of our multilingual AI translation engine with context awareness.',
      items: [
        'Neural machine translation model',
        'Context-aware processing',
        'Developed and tested Vavus AI and Vavus AI Pro',
        'Initial language support (21 languages)'
      ]
    },
    {
      quarter: 'Q3 2025',
      status: 'completed',
      category: 'Security',
      title: 'Security Framework',
      description: 'Implemented end-to-end encryption and privacy-first architecture.',
      items: [
        'E2E encryption protocol',
        'Zero-knowledge architecture',
        'Security audit completed',
        'OS, Apps and Server security developed and tested'
      ]
    },
    {
      quarter: 'Q4 2025',
      status: 'in-progress',
      category: 'Apps',
      title: 'Beta Test Applications',
      description: 'Launched web and mobile beta applications for early testing.',
      items: [
        'Web application beta',
        'iOS app development',
        'Android app development',
        'User feedback integration'
      ]
    },
    {
      quarter: 'Q4 2025',
      status: 'in-progress',
      category: 'Devices',
      title: 'Hardware Development',
      description: 'Development of dedicated VAVUS AI hardware devices for enhanced security.',
      items: [
        'Device prototype design',
        'Hardware security module',
        'Manufacturing partnerships',
        'FCC/CE certifications'
      ]
    },
    {
      quarter: 'Q4 2025',
      status: 'planned',
      category: 'Product Launch',
      title: 'Kickstarter campaign',
      description: 'Launch Vavus AI device on kickstarter.',
      items: [
        'Pre-Campaign',
        'Videos with the apps and features',
        'Setup of Donations',
        'Performance optimization'
      ]
    },
    {
      quarter: 'Q4 2025',
      status: 'planned',
      category: 'Devices',
      title: 'Device Launch',
      description: 'Public launch of VAVUS AI hardware devices and full platform.',
      items: [
        'Device manufacturing',
        'Retail partnerships',
        'Marketing campaign',
        'Customer support launch'
      ]
    },
    {
      quarter: 'Q4 2025',
      status: 'completed',
      category: 'Security',
      title: 'Enterprise Features',
      description: 'Launch enterprise-grade features for business customers.',
      items: [
        'HIPAA compliance',
        'GDPR full compliance',
        'Enterprise SSO',
        'Admin dashboard'
      ]
    },
    {
      quarter: 'Q1 2026',
      status: 'planned',
      category: 'Product',
      title: 'AI Enhancement',
      description: 'Advanced AI features including voice cloning and real-time conversation.',
      items: [
        'Voice synthesis',
        'Real-time conversation mode',
        'AI personality customization',
        'Advanced context understanding'
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-success" />;
      case 'in-progress':
        return <Clock className="h-6 w-6 text-warning" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Done</Badge>;
      case 'in-progress':
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      default:
        return <Badge variant="outline">Planned</Badge>;
    }
  };

  const filteredMilestones = activeFilter === 'All' 
    ? milestones 
    : milestones.filter(milestone => milestone.category === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="mb-6">
            <span className="gradient-text">Product Timeline</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Track our progress as we build the future of AI-powered communication. 
            From core technology to hardware devices and enterprise features.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'default' : 'outline'}
              onClick={() => setActiveFilter(filter)}
              className={`${activeFilter === filter ? 'btn-hero' : 'btn-ghost'}`}
            >
              <Filter className="h-4 w-4 mr-1" />
              {filter}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

          <div className="space-y-12">
            {filteredMilestones.map((milestone, index) => (
              <div key={milestone.quarter} className="relative">
                {/* Timeline Node */}
                <div className="absolute left-5 -translate-x-1/2 hidden md:block">
                  <div className="bg-white p-2 rounded-full border-2 border-border shadow-sm">
                    {getStatusIcon(milestone.status)}
                  </div>
                </div>

                {/* Content */}
                <Card className="md:ml-20 p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                      <div className="md:hidden">
                        {getStatusIcon(milestone.status)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-foreground">
                          {milestone.title}
                        </h3>
                        <p className="text-accent-brand font-medium">
                          {milestone.quarter}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(milestone.status)}
                      <Badge variant="outline">{milestone.category}</Badge>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-6">
                    {milestone.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {milestone.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${
                          milestone.status === 'completed' 
                            ? 'bg-success' 
                            : milestone.status === 'in-progress'
                            ? 'bg-warning'
                            : 'bg-muted-foreground'
                        }`} />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Summary */}
        <Card className="mt-16 p-8 bg-white">
          <div className="text-center">
            <h2 className="mb-6">Progress Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-success mb-2">
                  {milestones.filter(m => m.status === 'completed').length}
                </div>
                <p className="text-muted-foreground">Completed Milestones</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning mb-2">
                  {milestones.filter(m => m.status === 'in-progress').length}
                </div>
                <p className="text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground mb-2">
                  {milestones.filter(m => m.status === 'planned').length}
                </div>
                <p className="text-muted-foreground">Planned Features</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Timeline;