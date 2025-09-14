import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { runpodChat } from '../runpod.js';

test('runpodChat throws on non-ok response', async () => {
    process.env.RUNPOD_CHAT_URL = 'http://example.com';
    process.env.RUNPOD_CHAT_TOKEN = 'token';
    globalThis.fetch = async () => ({
        ok: false,
        status: 500,
        text: async () => 'fail',
    }) as any;
    await assert.rejects(() => runpodChat({ model: 'm', messages: [] }), /Runpod 500: fail/);
});

test('runpodChat returns assistant text', async () => {
    process.env.RUNPOD_CHAT_URL = 'http://example.com';
    process.env.RUNPOD_CHAT_TOKEN = 'token';
    globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
    }) as any;
    const res = await runpodChat({ model: 'm', messages: [] });
    assert.equal(res.assistantText, 'hi');
});