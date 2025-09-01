import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !consent) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    
    // Close modal after success message
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
      setEmail('');
      setConsent(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl p-6 m-4 max-w-md w-full animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {isSubmitted ? (
          /* Success State */
          <div className="text-center py-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Thanks for subscribing!
            </h3>
            <p className="text-muted-foreground">
              Check your inbox for product updates & launch invites.
            </p>
          </div>
        ) : (
          /* Form */
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-hero p-2 rounded-lg">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Stay Updated
              </h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Get product updates & launch invites delivered to your inbox.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="focus-ring"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground">
                  I agree to receive product updates and marketing emails from VAVUS AI.
                </label>
              </div>

              <Button
                type="submit"
                disabled={!email || !consent || isSubmitting}
                className="btn-hero w-full"
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};