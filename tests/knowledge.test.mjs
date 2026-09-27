import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { retrieveExact, retrieveSemantic, validateRequest } from '../lib/knowledge-retrieval.mjs';
import { majorArcana } from '../js/cards-data.js';
import handler from '../server/rag-retrieve.js';

const knowledge = JSON.parse(await fs.readFile(new URL('../data/knowledge-v2.json', import.meta.url)));

test('public demo corpus covers all Major Arcana with the production schema', () => {
  assert.equal(knowledge.cards.length, 22);
  for (const card of knowledge.cards) {
    assert.deepEqual(Object.keys(card.upright).sort(), ['career', 'general', 'love', 'spiritual']);
    assert.deepEqual(Object.keys(card.reversed).sort(), ['career', 'general', 'love', 'spiritual']);
  }
});

test('exact retrieval includes symbolism, selected orientation/topic and wisdom', () => {
  const result = retrieveExact(knowledge, [{ id: 1, isReversed: true }], ['career']);
  assert.equal(result.length, 3);
  const text = result.map(row => row.text).join('\n');
  assert(text.includes(knowledge.cards[1].symbolism));
  assert(text.includes(knowledge.cards[1].reversed.career));
  assert(text.includes(knowledge.cards[1].wisdom));
  assert(!text.includes(knowledge.cards[1].upright.general));
  assert(!text.includes(knowledge.cards[1].reversed.love));
});

test('semantic expansion cannot introduce an undrawn card or opposite orientation', () => {
  const fixture = { chunks: [
    { card_id: 0, orientation: 'upright', embedding: [1, 0] },
    { card_id: 0, orientation: 'reversed', embedding: [1, 0] },
    { card_id: 2, orientation: 'neutral', embedding: [1, 0] },
  ] };
  const result = retrieveSemantic(fixture, [1, 0], [{ id: 0, isReversed: true }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].orientation, 'reversed');
});

test('frontend meanings use the public demonstration corpus', () => {
  for (const card of majorArcana) {
    const source = knowledge.cards[card.id];
    assert.equal(card.uprightDesc, source.upright.general);
    assert.equal(card.reversedDesc, source.reversed.general);
  }
});

test('request validation rejects duplicates and invalid semantic requests', () => {
  assert.throws(() => validateRequest({ cards: [{ id: 1, isReversed: false }, { id: 1, isReversed: true }] }));
  assert.throws(() => validateRequest({ cards: [{ id: 1, isReversed: false }], semantic: true }));
});

test('endpoint keeps exact retrieval when the optional embedding index is absent', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).endsWith('/data/knowledge-v2.json')) return new Response(JSON.stringify(knowledge));
    return new Response('', { status: 404 });
  };
  try {
    const request = new Request('http://localhost/api/rag-retrieve', {
      method: 'POST', body: JSON.stringify({ cards: [{ id: 1, isReversed: false }], topics: ['career'], semantic: true, query: '项目怎么推进？' }),
    });
    const response = await handler(request);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.semanticStatus, 'unavailable');
    assert.equal(body.results.length, 3);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
