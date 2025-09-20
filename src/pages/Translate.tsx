import React, { useEffect, useState } from 'react';
import { ArrowRight, Copy, History, Globe, Lock, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { translateText } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Lang } from '@/lib/languages/madlad';
import { AUTO_CODE, getLanguageOptions, labelFor } from '@/lib/languages/madlad';

const SOURCE_LANGUAGES = getLanguageOptions();
const TARGET_LANGUAGES = getLanguageOptions({ includeAuto: false });
type TranslationRow = {
  id: string;
  source_lang: string | null;
  target_lang: string | null;
  input_text: string;
  output_text: string | null;
  created_at: string;
};

const Translate = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');

  // User-selectable source language (default: auto-detect)
  const [sourceLanguage, setSourceLanguage] = useState<string>(AUTO_CODE);
  // Target language by BCP-47 (default: Spanish)
  const [targetLanguage, setTargetLanguage] = useState<string>(() => codeForApi('es'));

  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranslationRow[]>([]);
  const { toast } = useToast();
  const [languageOptions, setLanguageOptions] = useState<Lang[]>(() => getLanguageOptions());

  // Lists: source shows ALL (incl. auto), target hides auto
  const sourceLanguages = languageOptions;
  const targetLanguages = languageOptions.filter(l => l.code !== AUTO_CODE);

  async function fetchHistory() {
    const { data, error } = await supabase
        .from('translations')
        .select('id, source_lang, target_lang, input_text, output_text, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (!error && data) setHistory(data);
  }

  useEffect(() => {
    fetchHistory();
  }, []);
  useEffect(() => {
    let active = true;
    loadFullMadladLanguages()
        .then((full) => {
          if (active && full.length) setLanguageOptions(full);
        })
        .catch(() => {});
    return () => { active = false; };
  }, []);


  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    try {
      setIsTranslating(true);
      const { output } = await translateText({
        text: sourceText,
        sourceLang: sourceLanguage, // pass selected source
        targetLang: targetLanguage,
      });
      setTargetText(output || '');
      await fetchHistory();
    } catch (e: any) {
      toast({
        title: 'Could not translate',
        description: typeof e?.message === 'string' ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!targetText) return;
    navigator.clipboard.writeText(targetText);
    toast({ title: 'Copied to clipboard', description: 'Translation copied successfully' });
  };

  // Quick swap (disabled if source is auto)
  const handleSwap = () => {
    if (sourceLanguage === AUTO_CODE) return;
    const prevSource = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(prevSource);
    setSourceText(targetText);
    setTargetText(sourceText);
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
              AI-powered translation with context awareness. Your translations are saved to your account.
            </p>

            <div className="mt-6 p-4 bg-accent-brand-light border border-accent-brand/20 rounded-lg max-w-lg mx-auto">
              <p className="text-sm text-accent-brand font-medium flex items-center justify-center">
                <Lock className="h-4 w-4 mr-1" />
                Private by design — only you can view your history.
              </p>
            </div>
          </div>

          {/* Translation Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Source Text */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Source Text</h3>

                {/* Source language selector (includes Auto-detect) */}
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select source language" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {labelFor(lang.code)}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Textarea
                  placeholder="Enter text to translate."
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  className="min-h-[200px] resize-none focus-ring"
              />

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-muted-foreground">{sourceText.length} characters</span>
                <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      onClick={handleSwap}
                      disabled={sourceLanguage === AUTO_CODE}
                      title={sourceLanguage === AUTO_CODE ? 'Swap disabled when source is Auto' : 'Swap languages'}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleTranslate} disabled={!sourceText.trim() || isTranslating} className="btn-hero">
                    {isTranslating ? 'Translating…' : (
                        <>
                          <span>Translate</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Target Text */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Translation</h3>

                {/* Target language selector (no Auto) */}
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Choose target language" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {labelFor(lang.code)}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                  placeholder="Translation will appear here."
                  value={targetText}
                  readOnly
                  className="min-h-[200px] resize-none bg-surface"
              />

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-muted-foreground">{targetText.length} characters</span>
                <div className="flex space-x-2">
                  <Button onClick={handleCopy} disabled={!targetText} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* History */}
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <History className="h-5 w-5 mr-2" />
              Recent translations
            </h3>

            {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No translations yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map((row) => (
                      <Card key={row.id} className="p-4 hover:bg-surface transition">
                        <div className="text-xs text-muted-foreground mb-1">
                          {new Date(row.created_at).toLocaleString()}
                          {row.source_lang ? ` • ${labelFor(row.source_lang)} → ` : ' • '}
                          {row.target_lang ? `${labelFor(row.target_lang)}` : ''}
                        </div>
                        <div className="text-sm font-medium mb-2 line-clamp-2">{row.input_text}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{row.output_text}</div>
                        <div className="mt-3 flex gap-2">
                          <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSourceText(row.input_text);
                                setTargetText(row.output_text || '');
                                if (row.source_lang) setSourceLanguage(row.source_lang);
                                if (row.target_lang) setTargetLanguage(row.target_lang);
                              }}
                          >
                            Load
                          </Button>
                        </div>
                      </Card>
                  ))}
                </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default Translate;
