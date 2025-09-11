import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";

const AI_ITEMS = [
  { name: 'Vavus AI', href: '/vavus-ai' },
  { name: 'Translate', href: '/translate' },
  { name: 'AI Chat', href: '/ai' },
  { name: 'Vavus Apps', href: '/vavus-apps' },
];

const WHO_ITEMS = [
  { name: 'About', href: '/about' },
  { name: 'Timeline', href: '/timeline' },
  { name: 'Join Us', href: '/join' },
  { name: 'Contact', href: '/contact' },
];

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { session } = useSession();

  const isActivePath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isGroupActive = (items: { href: string }[]) =>
      items.some((i) => isActivePath(i.href));

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
              <div className="ml-10 flex items-center gap-6">
                {/* Home */}
                <Link to="/" className={`nav-link whitespace-nowrap ${isActivePath('/') ? 'active' : ''}`}>
                  Home
                </Link>

                {/* AI dropdown */}
                <div className="relative group">
                  <button
                      className={`nav-link whitespace-nowrap flex items-center gap-1 ${isGroupActive(AI_ITEMS) ? 'active' : ''}`}
                      aria-haspopup="menu"
                  >
                    AI <ChevronDown className="h-4 w-4 opacity-70 transition group-hover:rotate-180" />
                  </button>

                  {/* Hover-safe dropdown (padding creates the gap inside the container) */}
                  <div
                      className="
                    absolute left-0 top-full pt-3
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition z-50
                  "
                  >
                    <div className="w-56 rounded-xl border bg-white shadow-lg p-2">
                      {AI_ITEMS.map((item) => (
                          <Link
                              key={item.name}
                              to={item.href}
                              className={`block rounded-md px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-surface ${
                                  isActivePath(item.href) ? 'bg-primary-light text-primary' : ''
                              }`}
                          >
                            {item.name}
                          </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Who we are dropdown */}
                <div className="relative group">
                  <button
                      className={`nav-link whitespace-nowrap flex items-center gap-1 ${isGroupActive(WHO_ITEMS) ? 'active' : ''}`}
                      aria-haspopup="menu"
                  >
                    Who we are <ChevronDown className="h-4 w-4 opacity-70 transition group-hover:rotate-180" />
                  </button>

                  {/* Hover-safe dropdown */}
                  <div
                      className="
                    absolute left-0 top-full pt-3
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition z-50
                  "
                  >
                    <div className="w-56 rounded-xl border bg-white shadow-lg p-2">
                      {WHO_ITEMS.map((item) => (
                          <Link
                              key={item.name}
                              to={item.href}
                              className={`block rounded-md px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-surface ${
                                  isActivePath(item.href) ? 'bg-primary-light text-primary' : ''
                              }`}
                          >
                            {item.name}
                          </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* For Businesses */}
                <Link
                    to="/business"
                    className={`nav-link whitespace-nowrap ${isActivePath('/business') ? 'active' : ''}`}
                >
                  For Businesses
                </Link>
              </div>
            </div>

            {/* Desktop CTA (session-aware) */}
            <div className="hidden md:flex items-center gap-x-3">
              {session ? (
                  <>
                    <Link to="/account">
                      <Button className="btn-hero whitespace-nowrap">Account</Button>
                    </Link>
                    <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                      Sign out
                    </Button>
                  </>
              ) : (
                  <Link to="/auth">
                    <Button className="btn-hero whitespace-nowrap">Login / Create account</Button>
                  </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="btn-ghost">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-border">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {/* Home */}
                <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                        isActivePath('/') ? 'text-primary bg-primary-light' : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                    }`}
                >
                  Home
                </Link>

                {/* AI (accordion) */}
                <details open={isGroupActive(AI_ITEMS)} className="px-1">
                  <summary className="px-2 py-2 rounded-md text-base font-medium cursor-pointer text-foreground/80 hover:text-foreground">
                    AI
                  </summary>
                  <div className="mt-1 pl-3">
                    {AI_ITEMS.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-3 py-2 text-sm rounded-md ${
                                isActivePath(item.href)
                                    ? 'text-primary bg-primary-light'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                            }`}
                        >
                          {item.name}
                        </Link>
                    ))}
                  </div>
                </details>

                {/* Who we are (accordion) */}
                <details open={isGroupActive(WHO_ITEMS)} className="px-1">
                  <summary className="px-2 py-2 rounded-md text-base font-medium cursor-pointer text-foreground/80 hover:text-foreground">
                    Who we are
                  </summary>
                  <div className="mt-1 pl-3">
                    {WHO_ITEMS.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-3 py-2 text-sm rounded-md ${
                                isActivePath(item.href)
                                    ? 'text-primary bg-primary-light'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                            }`}
                        >
                          {item.name}
                        </Link>
                    ))}
                  </div>
                </details>

                {/* For Businesses */}
                <Link
                    to="/business"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                        isActivePath('/business')
                            ? 'text-primary bg-primary-light'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                    }`}
                >
                  For Businesses
                </Link>

                {/* CTA (session-aware) */}
                <div className="pt-4 pb-2">
                  {session ? (
                      <>
                        <Link to="/account" onClick={() => setMobileMenuOpen(false)}>
                          <Button className="btn-hero w-full">Account</Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              supabase.auth.signOut();
                            }}
                        >
                          Sign out
                        </Button>
                      </>
                  ) : (
                      <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="btn-hero w-full">Login / Create account</Button>
                      </Link>
                  )}
                </div>
              </div>
            </div>
        )}
      </nav>
  );
};
