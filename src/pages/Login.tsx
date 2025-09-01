import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Smartphone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: isLogin ? "Login Successful" : "Account Created",
      description: isLogin 
        ? "Welcome back! Note: Full features require VAVUS device after launch." 
        : "Account created successfully. Check your email for verification."
    });

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center py-12">
      <div className="mx-auto max-w-md w-full px-4">
        <div className="text-center mb-8">
          <h1 className="mb-4">
            <span className="gradient-text">{isLogin ? 'Welcome Back' : 'Join VAVUS AI'}</span>
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? 'Sign in to access your VAVUS AI account' 
              : 'Create your account and start communicating globally'
            }
          </p>
        </div>

        <Card className="p-8">
          {/* Device Notice */}
          <div className="mb-6 p-4 bg-accent-brand-light border border-accent-brand/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Smartphone className="h-5 w-5 text-accent-brand mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-accent-brand mb-1">
                  Device Requirement Notice
                </p>
                <p className="text-xs text-accent-brand/80">
                  Once the device launches, you must purchase/own a VAVUS AI device to access 
                  full account features. Until launch: access is demo-limited.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your.email@example.com"
                  className="pl-10 focus-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 focus-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="Confirm your password"
                    className="pl-10 focus-ring"
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-hero w-full"
            >
              {isSubmitting 
                ? (isLogin ? 'Signing In...' : 'Creating Account...') 
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </Button>
          </form>

          <div className="mt-6">
            <Separator />
            <div className="text-center mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast({
                  title: "Coming Soon",
                  description: "Google Sign-In will be available at launch."
                })}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary-hover"
                onClick={() => toast({
                  title: "Reset Link Sent",
                  description: "Check your email for password reset instructions."
                })}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Privacy Policy Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{' '}
              <Link to="/privacy" className="text-primary hover:text-primary-hover">
                Privacy Policy
              </Link>
            </p>
          </div>
        </Card>

        {/* Mock Device Entitlement Section */}
        <Card className="mt-8 p-6 border-l-4 border-l-warning bg-warning/5">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm mb-2">Device Entitlement Required (After Launch)</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Once logged in, you'll need to add your VAVUS device serial to unlock full features:
              </p>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Device serial number" 
                  className="text-xs"
                  disabled
                />
                <Button size="sm" variant="outline" disabled>
                  Add Device
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;