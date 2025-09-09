import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Vavus AI', href: '/vavus-ai' },
  { name: 'Translate', href: '/translate' },
  { name: 'AI Chat', href: '/ai' },
  { name: 'About', href: '/about' },
  { name: 'Timeline', href: '/timeline' },
  { name: 'For Businesses', href: '/business' },
  { name: 'Join Us', href: '/join' },
  { name: 'Contact', href: '/contact' },
  { name: 'Vavus Apps', href: '/vavus-apps' },
];

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-gradient-hero p-2 rounded-lg group-hover:shadow-brand transition-all duration-300">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">VAVUS AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-link ${isActivePath(item.href) ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <Link to="/login">
              <Button className="btn-hero">
                Login / Account
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-ghost"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-border">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                  isActivePath(item.href)
                    ? 'text-primary bg-primary-light'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 pb-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="btn-hero w-full">
                  Login / Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};