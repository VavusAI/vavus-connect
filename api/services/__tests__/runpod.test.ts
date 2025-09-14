import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { runpodChat } from '../runpod.js';
import { RunpodError } from '../../_runpod.js';


test('runpodChat throws on non-ok response and logs', async () => {
    process.env.RUNPOD_CHAT_URL = 'http://example.com';
    process.env.RUNPOD_CHAT_TOKEN = 'token';
    const logs: any[] = [];
    globalThis.fetch = async () => ({
        ok: false,
        status: 500,
        text: async () => 'fail',
    }) as any;
    await assert.rejects(() => runpodChat({ model: 'm', messages: [], logger: info => logs.push(info) }), /Runpod 500: fail/);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 500);
});

test('runpodChat returns assistant text and logs', async () => {
    process.env.RUNPOD_CHAT_URL = 'http://example.com';
    process.env.RUNPOD_CHAT_TOKEN = 'token';
    const logs: any[] = [];
    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
    }) as any;
    const res = await runpodChat({ model: 'm', messages: [], logger: info => logs.push(info) });
    assert.equal(res.assistantText, 'hi');
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 200);
});