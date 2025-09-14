import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { summarize } from '../conversation.js';
import type { Msg } from '../prompt.js';

test('summarize strips reasoning', async () => {
    const fake = async () => ({ assistantText: '<think>noise</think> summary', data: {} });
    const history: Msg[] = [{ role: 'user', content: 'hi' }];
    const out = await summarize(history, false, fake);
    assert.equal(out, 'summary');
});