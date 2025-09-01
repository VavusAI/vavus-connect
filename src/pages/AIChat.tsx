import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Lock, Upload, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! This is a limited demo of VAVUS AI Chat. Full features including conversation history, file uploads, OCR, and export will be available after login with a VAVUS device. How can I help you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Thanks for your message! In the full version, I would provide a comprehensive AI-powered response with access to advanced features like document analysis, translation, and more. This demo shows basic chat functionality only.`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleFeatureClick = (feature: string) => {
    toast({
      title: "Feature Locked",
      description: `${feature} requires login + VAVUS device after launch.`,
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">
            <span className="gradient-text">AI Chat Assistant</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience intelligent conversation with context-aware AI powered by VAVUS technology.
          </p>
          
          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-accent-brand-light border border-accent-brand/20 rounded-lg max-w-lg mx-auto">
            <p className="text-sm text-accent-brand font-medium flex items-center justify-center">
              <Lock className="h-4 w-4 mr-1" />
              Limited Demo - Full features require login + device
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-col h-[600px]">
          {/* Chat Messages */}
          <Card className="flex-1 p-4 mb-4 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-gradient-hero text-white'
                        : 'bg-surface text-foreground border border-border'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </Card>

          {/* Input Area */}
          <div className="space-y-4">
            {/* Disabled Features */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="opacity-60 cursor-not-allowed"
                onClick={() => handleFeatureClick('File Upload')}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="opacity-60 cursor-not-allowed"
                onClick={() => handleFeatureClick('OCR')}
              >
                <FileText className="h-4 w-4 mr-1" />
                OCR
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="opacity-60 cursor-not-allowed"
                onClick={() => handleFeatureClick('Export Chat')}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 focus-ring"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="btn-hero"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-lg border border-border">
            <div className="bg-primary-light p-3 rounded-lg w-fit mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Multi-turn Conversations</h3>
            <p className="text-sm text-muted-foreground">
              Maintain context across long conversations
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg border border-border">
            <div className="bg-accent-brand-light p-3 rounded-lg w-fit mx-auto mb-4">
              <FileText className="h-6 w-6 text-accent-brand" />
            </div>
            <h3 className="font-semibold mb-2">Document Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Upload and analyze documents with AI
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg border border-border">
            <div className="bg-success/20 p-3 rounded-lg w-fit mx-auto mb-4">
              <Lock className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold mb-2">Private & Secure</h3>
            <p className="text-sm text-muted-foreground">
              All conversations encrypted and private
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;