import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { stripReasoning } from '../prompt.js';

test('stripReasoning removes chain-of-thought', () => {
    const input = 'Hello <think>secret</think> world ```reasoning\ninner``` done';
    const out = stripReasoning(input);
    assert.equal(out, 'Hello  world  done');
});