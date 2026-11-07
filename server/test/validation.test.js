import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSearchFilter } from '../src/controllers/adminController.js';
import { formatTicket, parseTicket } from '../src/utils/ticket.js';
import { namesMatch, normalizePhone, validateRegistration } from '../src/utils/validation.js';

test('phone numbers in every common Nigerian format collapse to one canonical value', () => {
  const canonical = '08031234567';
  for (const input of ['08031234567', '0803 123 4567', '+2348031234567', '+234 803 123 4567', '2348031234567', '8031234567', '002348031234567', '0803-123-4567']) {
    assert.equal(normalizePhone(input), canonical, input);
  }
});

test('invalid phones are rejected', () => {
  for (const input of ['0803123456', '07031234567x', '05031234567', '', '12345', null, undefined, 8031234567, { $ne: null }]) {
    assert.equal(normalizePhone(input), null, String(input));
  }
});

test('ticket numbers are zero-padded to 3 digits and never truncated', () => {
  assert.equal(formatTicket(1), 'KV-001');
  assert.equal(formatTicket(42), 'KV-042');
  assert.equal(formatTicket(999), 'KV-999');
  assert.equal(formatTicket(1000), 'KV-1000');
  assert.equal(parseTicket('kv-042'), 42);
  assert.equal(parseTicket('KV042'), 42);
  assert.equal(parseTicket('hello'), null);
});

test('registration validation: happy path and field errors', () => {
  const ok = validateRegistration({ name: '  Adaeze   Okafor ', phone: '+234 803 123 4567', email: ' ADAEZE@EXAMPLE.COM ', consent: true });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.values, { name: 'Adaeze Okafor', phone: '08031234567', email: 'adaeze@example.com' });

  const bad = validateRegistration({ name: 'Madonna', phone: '123', email: 'bad', consent: false });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['consent', 'email', 'name', 'phone']);
});

test('NoSQL-injection shaped payloads fail validation instead of reaching the database', () => {
  const r = validateRegistration({ name: { $ne: '' }, phone: { $gt: '' }, email: { $ne: null }, consent: true });
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'name', 'phone']);
  assert.ok(Object.keys(validateRegistration(null).errors).length === 4);
});

test('invalid email shapes are rejected', () => {
  assert.ok(validateRegistration({ name: 'Ada Obi', phone: '08031234567', email: 'not-an-email', consent: true }).errors.email);
  assert.ok(validateRegistration({ name: 'Ada Obi', phone: '08031234567', email: 12345, consent: true }).errors.email);
});

test('namesMatch is order-insensitive, accent-insensitive, and needs two words to match', () => {
  assert.equal(namesMatch('Okafor Adaeze', ['Adaeze', 'Chioma', 'Okafor']), true);
  assert.equal(namesMatch('Adéọlá Bello', ['ADEOLA', 'BELLO']), true);
  assert.equal(namesMatch('Adaeze Nwosu', ['Adaeze', 'Okafor']), false);
});

test('search filter is index-friendly: anchored regexes, whitelisted shapes', () => {
  assert.deepEqual(buildSearchFilter('KV-042'), { ticketSeq: 42 });
  assert.deepEqual(buildSearchFilter(''), {});
  const digits = buildSearchFilter('0803');
  assert.equal(digits.$or[0].phone.source, '^0803');
  const email = buildSearchFilter('adaeze@example.com');
  assert.equal(email.email.source, '^adaeze@example\\.com');
  const words = buildSearchFilter('ade bel');
  assert.deepEqual(words.$and.map((c) => c.nameTokens.source), ['^ade', '^bel']);
  assert.equal(buildSearchFilter('a.*').$and[0].nameTokens.source, '^a');
});
