import { describe, it, expect, vi } from 'vitest';

interface DB {
    conversations: any[];
    messages: any[];
    user_memory: any[];
    workspace_memory: any[];
    user_settings: any[];
}

function createSupabaseMock(db: DB) {
    return {
        from(table: string) {
            if (table === 'information_schema.columns') {
                return {
                    select() { return this; },
                    eq() {
                        if (!(this as any)._eqCalled) { (this as any)._eqCalled = true; return this; }
                        return Promise.resolve({ data: [
                                { column_name: 'id' },
                                { column_name: 'summary' },
                                { column_name: 'turns_count' },
                                { column_name: 'long_mode_enabled' },
                                { column_name: 'last_summary_turn' },
                            ], error: null });
                    },
                } as any;
            }
            if (table === 'conversations') {
                return {
                    insert(row: any) {
                        return {
                            select() {
                                return {
                                    single: async () => {
                                        const conv = { id: 'c1', summary: '', turns_count: 0, long_mode_enabled: false, last_summary_turn: 0, ...row };
                                        db.conversations.push(conv);
                                        return { data: conv, error: null };
                                    },
                                };
                            },
                        };
                    },
                    select() {
                        return {
                            eq() {
                                return {
                                    single: async () => ({ data: db.conversations[0], error: null }),
                                };
                            },
                        };
                    },
                    update() {
                        return {
                            eq: async () => ({ data: null, error: null }),
                        };
                    },
                } as any;
            }
            if (table === 'messages') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    order: async () => ({ data: db.messages, error: null }),
                                };
                            },
                        };
                    },
                    insert: async (row: any) => {
                        db.messages.push(row);
                        return { error: null };
                    },
                } as any;
            }
            if (table === 'user_memory') {
                return { select: () => ({ eq: () => ({ single: async () => ({ data: db.user_memory[0], error: null }) }) }) } as any;
            }
            if (table === 'workspace_memory') {
                return { select: () => ({ eq: () => ({ single: async () => ({ data: db.workspace_memory[0], error: null }) }) }) } as any;
            }
            if (table === 'user_settings') {
                return { select: () => ({ eq: () => ({ single: async () => ({ data: db.user_settings[0], error: null }) }) }) } as any;
            }
            return {} as any;
        },
    };
}

function createFetchMock(reply: string) {
    return vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: reply } }] }),
    });
}

function createRes() {
    const res: any = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: undefined as any,
        status(code: number) { this.statusCode = code; return this; },
        setHeader(key: string, value: string) { this.headers[key] = value; },
        json(data: any) { this.body = data; return this; },
        end(data?: any) { this.body = data; return this; },
    };
    return res;
}

async function setup(opts: {
    runpodReply?: string;
    personaSummary?: string;
    workspaceNote?: string;
    usePersona?: boolean;
    useWorkspace?: boolean;
} = {}) {
    vi.resetModules();
    const {
        runpodReply = 'ok',
        personaSummary = '',
        workspaceNote = '',
        usePersona = true,
        useWorkspace = true,
    } = opts;

    const db: DB = {
        conversations: [],
        messages: [],
        user_memory: [{ persona_summary: personaSummary, user_id: 'u1' }],
        workspace_memory: [{ note: workspaceNote, user_id: 'u1' }],
        user_settings: [{ use_persona: usePersona, use_workspace: useWorkspace, user_id: 'u1' }],
    };

    const supabaseAdmin = createSupabaseMock(db);
    vi.mock('../api/_utils/supabaseAdmin.js', () => ({ supabaseAdmin }));
    vi.mock('../api/_utils/auth.js', () => ({ requireUser: () => ({ userId: 'u1' }) }));

    const fetchMock = createFetchMock(runpodReply);
    (global as any).fetch = fetchMock as any;

    process.env.RUNPOD_CHAT_URL = 'https://runpod';
    process.env.RUNPOD_CHAT_TOKEN = 'token';

    const mod = await import('../api/ai.ts');
    return { handler: mod.default, db, fetchMock };
}

describe('chat pipeline', () => {
    it('strips chain-of-thought before saving', async () => {
        const { handler, db } = await setup({ runpodReply: '<think>secret</think>final' });
        const req: any = { method: 'POST', body: { message: 'hi' } };
        const res = createRes();
        await handler(req, res);
        expect(db.messages[1].content).toBe('final');
    });

    it('doubles token limit when long mode enabled', async () => {
        const { handler, fetchMock } = await setup({ runpodReply: 'final' });
        const req: any = { method: 'POST', body: { message: 'hi', longMode: true } };
        const res = createRes();
        await handler(req, res);
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.max_tokens).toBe(2048);
    });

    it('respects persona and workspace toggles', async () => {
        // toggles off
        let ctx = await setup({ runpodReply: 'a', personaSummary: 'Persona', workspaceNote: 'Workspace', usePersona: false, useWorkspace: false });
        let req: any = { method: 'POST', body: { message: 'hi', usePersona: false, useWorkspace: false } };
        let res = createRes();
        await ctx.handler(req, res);
        let msgs = JSON.parse(ctx.fetchMock.mock.calls[0][1].body).messages;
        expect(msgs.some((m: any) => m.content.includes('User profile'))).toBe(false);
        expect(msgs.some((m: any) => m.content.includes('Workspace Memory'))).toBe(false);

        // toggles on
        ctx = await setup({ runpodReply: 'b', personaSummary: 'Persona', workspaceNote: 'Workspace', usePersona: true, useWorkspace: true });
        req = { method: 'POST', body: { message: 'hi', usePersona: true, useWorkspace: true } };
        res = createRes();
        await ctx.handler(req, res);
        msgs = JSON.parse(ctx.fetchMock.mock.calls[0][1].body).messages;
        expect(msgs.some((m: any) => m.content.includes('User profile: Persona'))).toBe(true);
        expect(msgs.some((m: any) => m.content.includes('Workspace Memory:\nWorkspace'))).toBe(true);
    });
});