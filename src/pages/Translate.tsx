import React, { useState } from 'react';
import { ArrowRight, Copy, History, Save, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Translate = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('spanish');
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const languages = [
    { value: 'spanish', label: 'Spanish (Español)' },
    { value: 'french', label: 'French (Français)' },
    { value: 'german', label: 'German (Deutsch)' },
    { value: 'italian', label: 'Italian (Italiano)' },
    { value: 'portuguese', label: 'Portuguese (Português)' },
    { value: 'japanese', label: 'Japanese (日本語)' },
    { value: 'korean', label: 'Korean (한국어)' },
    { value: 'chinese', label: 'Chinese (中文)' },
    { value: 'arabic', label: 'Arabic (العربية)' },
    { value: 'russian', label: 'Russian (Русский)' }
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    
    setIsTranslating(true);
    
    // Simulate translation API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock translation result
    const mockTranslation = `[Translated to ${languages.find(l => l.value === targetLanguage)?.label}] ${sourceText}`;
    setTargetText(mockTranslation);
    setIsTranslating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(targetText);
    toast({
      title: "Copied to clipboard",
      description: "Translation copied successfully"
    });
  };

  const handleLoginPrompt = (feature: string) => {
    toast({
      title: "Login Required",
      description: `${feature} requires login + device after launch.`,
      action: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = '/login'}
        >
          Login
        </Button>
      )
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-4">
            <span className="gradient-text">Universal Translator</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience AI-powered translation with context awareness and natural language processing.
          </p>
          
          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-accent-brand-light border border-accent-brand/20 rounded-lg max-w-lg mx-auto">
            <p className="text-sm text-accent-brand font-medium flex items-center justify-center">
              <Lock className="h-4 w-4 mr-1" />
              Demo Mode - Full features require login + device after launch
            </p>
          </div>
        </div>

        {/* Translation Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Source Text */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Source Text</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>Auto-detect</span>
              </div>
            </div>
            
            <Textarea
              placeholder="Enter text to translate..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="min-h-[200px] resize-none focus-ring"
            />
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-muted-foreground">
                {sourceText.length} characters
              </span>
              <Button
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isTranslating}
                className="btn-hero"
              >
                {isTranslating ? (
                  'Translating...'
                ) : (
                  <>
                    Translate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Target Text */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Translation</h3>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="Translation will appear here..."
              value={targetText}
              readOnly
              className="min-h-[200px] resize-none bg-surface"
            />
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-muted-foreground">
                {targetText.length} characters
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={handleCopy}
                  disabled={!targetText}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Disabled Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="justify-start p-4 h-auto opacity-60 cursor-not-allowed"
            onClick={() => handleLoginPrompt('Translation History')}
          >
            <History className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Translation History</div>
              <div className="text-sm text-muted-foreground">View past translations</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start p-4 h-auto opacity-60 cursor-not-allowed"
            onClick={() => handleLoginPrompt('Save Translation')}
          >
            <Save className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Save Translation</div>
              <div className="text-sm text-muted-foreground">Save for later use</div>
            </div>
          </Button>
        </div>

        {/* Features Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-lg border border-border">
            <div className="bg-primary-light p-3 rounded-lg w-fit mx-auto mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">100+ Languages</h3>
            <p className="text-sm text-muted-foreground">
              Support for major world languages with regional variants
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg border border-border">
            <div className="bg-accent-brand-light p-3 rounded-lg w-fit mx-auto mb-4">
              <Lock className="h-6 w-6 text-accent-brand" />
            </div>
            <h3 className="font-semibold mb-2">Private & Secure</h3>
            <p className="text-sm text-muted-foreground">
              End-to-end encryption for all translations
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg border border-border">
            <div className="bg-success/20 p-3 rounded-lg w-fit mx-auto mb-4">
              <ArrowRight className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold mb-2">Context-Aware</h3>
            <p className="text-sm text-muted-foreground">
              AI understands context for more accurate translations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translate;