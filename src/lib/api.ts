import { supabase } from './supabase';
import { codeForApi } from './languages/madlad';

async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not signed in');
    return token;
}

export async function sendChat({ conversationId, message, model }:
                               { conversationId?: string; message: string; model?: string; }) {
    const token = await getAccessToken();
    const r = await fetch('/api/ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ conversationId, message, model })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ conversationId: string; reply: string }>;
}
export async function saveChat({ conversationId, message, assistantText, mode, longMode, useInternet, usePersona, useWorkspace }:
                               { conversationId?: string; message: string; assistantText: string; mode?: string; longMode?: boolean; useInternet?: boolean; usePersona?: boolean; useWorkspace?: boolean; }) {
    const token = await getAccessToken();
    const r = await fetch('/api/ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ conversationId, message, assistantText, mode, longMode, useInternet, usePersona, useWorkspace })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ conversationId: string }>;
}

export async function translateText({ text, sourceLang, targetLang, model }:
                                    { text: string; sourceLang?: string; targetLang?: string; model?: string; }) {
    const token = await getAccessToken();
    if (!targetLang) throw new Error('Target language is required');

    const payload: Record<string, unknown> = {
        source: sourceLang ? codeForApi(sourceLang) : 'auto',
        target: codeForApi(targetLang),
        text,
    };
    if (model) payload.model = model;
    const r = await fetch('/api/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ output: string }>;
}

export async function updateConversationTitle(conversationId: string, title: string) {
    const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);
    if (error) throw new Error(error.message);
}